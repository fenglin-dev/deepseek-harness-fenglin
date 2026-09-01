#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "usage: $0 <owner/repo> <windows-run-id> <macos-run-id> <linux-run-id>" >&2
  exit 2
}

[[ $# -eq 4 ]] || usage
repository=$1
run_ids=("$2" "$3" "$4")
targets=(windows-x64 macos linux-x64)
script_directory=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
repository_root=$(cd "$script_directory/../../../.." && pwd)

for command_name in gh node shasum unzip; do
  command -v "$command_name" >/dev/null || { echo "missing command: $command_name" >&2; exit 1; }
done

version=$(node -p "require('$repository_root/apps/desktop/package.json').version")
output_directory="$repository_root/release/$version"
[[ ! -e "$output_directory" ]] || {
  echo "refusing to replace existing release directory: $output_directory" >&2
  exit 1
}

staging=$(mktemp -d "${TMPDIR:-/tmp}/odsh-desktop-release.XXXXXX")
cleanup() { rm -rf "$staging"; }
trap cleanup EXIT
final_directory="$staging/final"
combined_checksums="$staging/combined-SHA256SUMS"
mkdir -p "$final_directory"
: > "$combined_checksums"

common_head_sha=
common_snapshot_digest=

for index in 0 1 2; do
  run_id=${run_ids[$index]}
  target=${targets[$index]}
  run_directory="$staging/$target"
  mkdir -p "$run_directory/release" "$run_directory/checksums" "$run_directory/bundled"

  metadata=$(gh run view "$run_id" -R "$repository" \
    --json conclusion,headBranch,headSha,url \
    --jq '[.conclusion, .headBranch, .headSha, .url] | @tsv')
  IFS=$'\t' read -r conclusion head_branch head_sha run_url <<< "$metadata"
  [[ "$conclusion" == success ]] || {
    echo "workflow run $run_id is not successful: ${conclusion:-unknown}" >&2
    exit 1
  }

  if [[ -z "$common_head_sha" ]]; then
    common_head_sha=$head_sha
  elif [[ "$head_sha" != "$common_head_sha" ]]; then
    echo "workflow run $run_id uses $head_sha, expected $common_head_sha" >&2
    exit 1
  fi

  case "$target" in
    windows-x64)
      artifact_names=(desktop-windows-x64)
      expected=(DeepSeek-Harness-windows-x64.exe)
      ;;
    macos)
      artifact_names=(desktop-macos-arm64 desktop-macos-x64)
      expected=(
        DeepSeek-Harness-macos-arm64.dmg
        DeepSeek-Harness-macos-arm64.zip
        DeepSeek-Harness-macos-x64.dmg
        DeepSeek-Harness-macos-x64.zip
      )
      ;;
    linux-x64)
      artifact_names=(desktop-linux-x64)
      expected=(DeepSeek-Harness-linux-x64.deb DeepSeek-Harness-linux-x64.rpm)
      ;;
  esac

  for artifact_name in "${artifact_names[@]}"; do
    gh run download "$run_id" -R "$repository" -n "$artifact_name" -D "$run_directory/release"
  done
  gh run download "$run_id" -R "$repository" -n desktop-checksums -D "$run_directory/checksums"
  gh run download "$run_id" -R "$repository" -n bundled-plugin-snapshot -D "$run_directory/bundled"

  snapshot_file_count=$(find "$run_directory/bundled" -type f | wc -l | tr -d ' ')
  [[ "$snapshot_file_count" -gt 0 ]] || {
    echo "workflow run $run_id has an empty bundled-plugin snapshot" >&2
    exit 1
  }
  snapshot_digest=$(
    cd "$run_directory/bundled"
    find . -type f -print | LC_ALL=C sort | while IFS= read -r file; do
      shasum -a 256 "$file"
    done | shasum -a 256 | awk '{ print $1 }'
  )
  if [[ -z "$common_snapshot_digest" ]]; then
    common_snapshot_digest=$snapshot_digest
  elif [[ "$snapshot_digest" != "$common_snapshot_digest" ]]; then
    echo "workflow run $run_id resolved a different bundled-plugin snapshot" >&2
    exit 1
  fi

  checksum_file="$run_directory/checksums/SHA256SUMS"
  [[ -f "$checksum_file" ]] || { echo "workflow run $run_id has no SHA256SUMS" >&2; exit 1; }
  for filename in "${expected[@]}"; do
    source_path="$run_directory/release/$filename"
    [[ -f "$source_path" ]] || { echo "workflow run $run_id is missing $filename" >&2; exit 1; }
    expected_hash=$(awk -v name="$filename" '$2 == name || $2 == "*" name { print $1 }' "$checksum_file")
    [[ $(printf '%s\n' "$expected_hash" | sed '/^$/d' | wc -l | tr -d ' ') == 1 ]] || {
      echo "workflow checksum entry is missing or ambiguous for $filename" >&2
      exit 1
    }
    actual_hash=$(shasum -a 256 "$source_path" | awk '{ print $1 }')
    [[ "$actual_hash" == "$expected_hash" ]] || {
      echo "workflow checksum mismatch for $filename" >&2
      exit 1
    }
    cp -p "$source_path" "$final_directory/$filename"
    printf '%s  %s\n' "$expected_hash" "$filename" >> "$combined_checksums"
  done

  printf '%s run: %s (%s, %s)\n' "$target" "$run_url" "$head_branch" "$head_sha"
done

LC_ALL=C sort -k2,2 "$combined_checksums" > "$final_directory/SHA256SUMS"
"$script_directory/verify-release-directory.sh" "$final_directory"

mkdir -p "$(dirname "$output_directory")"
mv "$final_directory" "$output_directory"
printf 'source SHA: %s\n' "$common_head_sha"
printf 'bundled-plugin snapshot: %s\n' "$common_snapshot_digest"
printf 'downloaded verified release files to %s\n' "$output_directory"
