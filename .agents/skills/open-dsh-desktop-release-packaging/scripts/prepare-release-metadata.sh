#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "usage: $0 [--run-id <id>] [--replace-existing] <owner/repo> <tag> <output-directory>" >&2
  exit 2
}

run_id=
replace_existing=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --run-id)
      [[ $# -ge 2 ]] || usage
      run_id=$2
      shift 2
      ;;
    --replace-existing)
      replace_existing=1
      shift
      ;;
    -*) usage ;;
    *) break ;;
  esac
done
[[ $# -eq 3 ]] || usage

repository=$1
tag=$2
output_directory=$3
script_directory=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
source "$script_directory/configure-cli-proxy.sh"

for command_name in gh find mktemp; do
  command -v "$command_name" >/dev/null || { echo "missing command: $command_name" >&2; exit 1; }
done
[[ "$repository" =~ ^[^/[:space:]]+/[^/[:space:]]+$ ]] || { echo "invalid repository: $repository" >&2; exit 1; }
[[ "$tag" =~ ^odsh-v([0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?)$ ]] || { echo "invalid desktop tag: $tag" >&2; exit 1; }
version=${BASH_REMATCH[1]}
expected_catalog="workspace-runtimes-$version.v2.json"
expected_bundle=workspace-runtimes.v2.sigstore.json

if [[ -e "$output_directory" && $replace_existing -eq 0 ]]; then
  echo "metadata output already exists; inspect it or pass --replace-existing: $output_directory" >&2
  exit 1
fi

temporary=$(mktemp -d "${TMPDIR:-/tmp}/odsh-release-metadata.XXXXXX")
cleanup() { rm -rf "$temporary"; }
trap cleanup EXIT

if [[ -z "$run_id" ]]; then
  default_branch=$(gh api "repos/$repository" --jq .default_branch)
  echo "dispatching signed workspace runtime metadata for $tag from $default_branch"
  gh workflow run workspace-runtime-release.yml --repo "$repository" --ref "$default_branch" -f "tag=$tag"
  for _ in {1..30}; do
    run_id=$(gh run list --repo "$repository" --workflow workspace-runtime-release.yml --event workflow_dispatch \
      --limit 20 --json databaseId,displayTitle,status \
      --jq ".[] | select(.displayTitle == \"Workspace runtime metadata $tag\") | .databaseId" | head -n 1)
    [[ -n "$run_id" ]] && break
    sleep 2
  done
  [[ -n "$run_id" ]] || { echo "could not locate dispatched metadata workflow for $tag" >&2; exit 1; }
fi

echo "waiting for metadata workflow run $run_id"
gh run watch "$run_id" --repo "$repository" --exit-status
gh run download "$run_id" --repo "$repository" --name workspace-runtime-release-metadata --dir "$temporary/download"

entries=()
while IFS= read -r entry; do entries+=("$entry"); done < <(find "$temporary/download" -mindepth 1 -maxdepth 1 -print | LC_ALL=C sort)
[[ ${#entries[@]} -eq 2 ]] || { echo "metadata artifact must contain exactly two files" >&2; exit 1; }
for filename in "$expected_catalog" "$expected_bundle"; do
  path="$temporary/download/$filename"
  [[ -f "$path" && -s "$path" && ! -L "$path" ]] || { echo "metadata artifact is missing $filename" >&2; exit 1; }
done

candidate="${output_directory}.candidate.$$"
rm -rf "$candidate"
mkdir -p "$(dirname "$output_directory")"
mv "$temporary/download" "$candidate"
if [[ -e "$output_directory" ]]; then
  archived="${output_directory}.replaced.$(date -u +%Y%m%dT%H%M%SZ)"
  mv "$output_directory" "$archived"
  echo "archived previous metadata at $archived"
fi
mv "$candidate" "$output_directory"
chmod -R a-w "$output_directory"
echo "prepared signed release metadata from run $run_id: $output_directory"
