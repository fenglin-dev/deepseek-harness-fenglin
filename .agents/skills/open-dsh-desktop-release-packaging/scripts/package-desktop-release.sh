#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "usage: $0 [--version <version>] [--minimum-free-gib <gib>] [--restart] <owner/repo>" >&2
  exit 2
}

version=
minimum_free_gib=10
restart=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --version)
      [[ $# -ge 2 ]] || usage
      version=$2
      shift 2
      ;;
    --minimum-free-gib)
      [[ $# -ge 2 ]] || usage
      minimum_free_gib=$2
      shift 2
      ;;
    --restart)
      restart=1
      shift
      ;;
    --*) usage ;;
    *) break ;;
  esac
done
[[ $# -eq 1 ]] || usage
repository=$1
[[ "$minimum_free_gib" =~ ^[0-9]+$ ]] || usage

script_directory=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
repository_root=$(git rev-parse --show-toplevel)
common_git_directory=$(git rev-parse --path-format=absolute --git-common-dir)
branch=$(git branch --show-current)
source_sha=$(git rev-parse HEAD)
[[ -n "$branch" ]] || { echo "release packaging requires a named branch" >&2; exit 1; }
[[ -z "$(git status --porcelain)" ]] || { echo "release packaging requires a clean checkout" >&2; exit 1; }

package_version=$(node -p "require(process.argv[1]).version" "$repository_root/apps/desktop/package.json")
if [[ -z "$version" ]]; then version=$package_version; fi
[[ "$version" == "$package_version" ]] || {
  echo "requested version $version does not match apps/desktop/package.json $package_version" >&2
  exit 1
}

state_directory="$common_git_directory/odsh-release-state"
state_file="$state_directory/$version.json"
state_tool="$script_directory/release-package-state.mjs"
if [[ "$restart" == 1 && -f "$state_file" ]]; then
  mkdir -p "$state_directory"
  archived_state="$state_file.bak-$(date -u +%Y%m%dT%H%M%SZ)-$$"
  mv "$state_file" "$archived_state"
  echo "release orchestration: archived previous state at $archived_state"
fi
node "$state_tool" init "$state_file" "$version" "$repository" "$branch" "$source_sha"

if [[ "${ODSH_RELEASE_TEST_OVERRIDES:-0}" == 1 ]]; then
  skip_remote_head_check=${ODSH_SKIP_REMOTE_HEAD_CHECK:-0}
  poll_seconds=${ODSH_RELEASE_POLL_SECONDS:-0}
else
  [[ -z "${ODSH_SKIP_REMOTE_HEAD_CHECK:-}" && -z "${ODSH_RELEASE_POLL_SECONDS:-}" ]] || {
    echo "release test overrides require ODSH_RELEASE_TEST_OVERRIDES=1" >&2
    exit 1
  }
  skip_remote_head_check=0
  poll_seconds=30
fi

source "$script_directory/configure-cli-proxy.sh"

if [[ "$skip_remote_head_check" != 1 ]]; then
  remote_sha=$(git ls-remote --heads origin "refs/heads/$branch" | awk 'NR == 1 { print $1 }')
  [[ "$remote_sha" == "$source_sha" ]] || {
    echo "origin/$branch is ${remote_sha:-missing}, but this checkout is $source_sha; push authorization is separate" >&2
    exit 1
  }
fi

available_kib=$(df -Pk "$repository_root" | awk 'NR == 2 { print $4 }')
required_kib=$((minimum_free_gib * 1024 * 1024))
if (( available_kib < required_kib )); then
  echo "release packaging needs at least ${minimum_free_gib} GiB free; only $((available_kib / 1024 / 1024)) GiB is available" >&2
  exit 1
fi

"$script_directory/check-release-download-speed.sh" "$repository"

state_get() {
  node "$state_tool" get "$state_file" "$1"
}

state_set() {
  node "$state_tool" set "$state_file" "$@"
}

gh_retry() {
  local attempt=1 delay=2 output error_file error_output
  while (( attempt <= 5 )); do
    error_file=$(mktemp)
    if output=$(gh "$@" 2>"$error_file"); then
      if [[ -s "$error_file" ]]; then cat "$error_file" >&2; fi
      rm -f "$error_file"
      printf '%s\n' "$output"
      return 0
    fi
    error_output=$(cat "$error_file")
    rm -f "$error_file"
    echo "release orchestration: gh attempt $attempt failed: $error_output" >&2
    (( attempt == 5 )) && return 1
    sleep "$delay"
    delay=$((delay * 2))
    attempt=$((attempt + 1))
  done
}

dispatch_run() {
  local stage=$1 target=$2 refresh_plugins=$3 snapshot_run_id=${4:-} output run_id
  local args=(workflow run desktop-packages.yml --repo "$repository" --ref "$branch" -f "target=$target" -f "refresh_plugins=$refresh_plugins")
  if [[ -n "$snapshot_run_id" ]]; then
    args+=(-f "bundled_plugin_run_id=$snapshot_run_id")
  fi
  output=$(gh_retry "${args[@]}")
  run_id=$(printf '%s\n' "$output" | sed -nE 's#.*actions/runs/([0-9]+).*#\1#p' | tail -n 1)
  [[ -n "$run_id" ]] || { echo "could not parse workflow run ID from: $output" >&2; exit 1; }
  state_set "stages.$stage.runId" "$run_id" "stages.$stage.status" dispatched
  echo "release orchestration: dispatched $stage as run $run_id"
}

wait_run() {
  local stage=$1 run_id status conclusion head_sha url result
  run_id=$(state_get "stages.$stage.runId")
  [[ -n "$run_id" ]] || { echo "missing run ID for $stage" >&2; exit 1; }
  while true; do
    result=$(gh_retry run view "$run_id" --repo "$repository" --json status,conclusion,headSha,url --jq '[.status, (.conclusion // ""), .headSha, .url] | @tsv')
    IFS=$'\t' read -r status conclusion head_sha url <<< "$result"
    [[ "$head_sha" == "$source_sha" ]] || {
      state_set "stages.$stage.status" source-mismatch "stages.$stage.url" "$url"
      echo "$stage run $run_id uses $head_sha, expected $source_sha" >&2
      exit 1
    }
    state_set "stages.$stage.status" "$status" "stages.$stage.conclusion" "$conclusion" "stages.$stage.url" "$url"
    if [[ "$status" == completed ]]; then
      [[ "$conclusion" == success ]] || { echo "$stage run $run_id concluded $conclusion: $url" >&2; exit 1; }
      echo "release orchestration: $stage run $run_id succeeded"
      return 0
    fi
    sleep "$poll_seconds"
  done
}

ensure_dispatched() {
  local stage=$1 target=$2 refresh_plugins=$3 snapshot_run_id=${4:-} run_id
  run_id=$(state_get "stages.$stage.runId")
  if [[ -z "$run_id" ]]; then
    dispatch_run "$stage" "$target" "$refresh_plugins" "$snapshot_run_id"
  else
    echo "release orchestration: resuming $stage run $run_id"
  fi
}

ensure_dispatched windows windows-x64 true
wait_run windows
windows_run_id=$(state_get stages.windows.runId)

# Dispatch both remaining native targets before waiting so the runners overlap.
ensure_dispatched macos macos false "$windows_run_id"
ensure_dispatched linux linux-x64 false "$windows_run_id"
wait_run macos
wait_run linux

macos_run_id=$(state_get stages.macos.runId)
linux_run_id=$(state_get stages.linux.runId)

if [[ "$common_git_directory" == */.git ]]; then
  primary_checkout=${common_git_directory%/.git}
else
  primary_checkout=$repository_root
fi
release_directory="$primary_checkout/release/$version"
download_status=$(state_get stages.download.status)
if [[ "$download_status" == verified ]]; then
  "$script_directory/verify-release-directory.sh" "$release_directory"
  echo "release orchestration: reused verified local artifacts"
elif [[ "$download_status" == running && -d "$release_directory" ]]; then
  # The downloader activates the complete directory atomically. This covers an
  # interruption after that rename but before the state update below.
  "$script_directory/verify-release-directory.sh" "$release_directory"
  echo "release orchestration: recovered completed local artifacts"
else
  state_set stages.download.status running
  "$script_directory/download-desktop-release.sh" "$repository" "$windows_run_id" "$macos_run_id" "$linux_run_id"
  "$script_directory/verify-release-directory.sh" "$release_directory"
fi
state_set stages.download.status verified stages.download.directory "$release_directory"

echo "release orchestration complete (not published)"
echo "  state: $state_file"
echo "  artifacts: $release_directory"
echo "  runs: windows=$windows_run_id macos=$macos_run_id linux=$linux_run_id"
