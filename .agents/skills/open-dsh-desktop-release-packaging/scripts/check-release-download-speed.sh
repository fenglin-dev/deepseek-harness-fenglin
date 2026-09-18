#!/usr/bin/env bash
set -euo pipefail

script_directory=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
source "$script_directory/configure-cli-proxy.sh"

usage() {
  echo "usage: $0 <owner/repo> [--run-id <id>] [--artifact-name <name>] [--artifact-id <id>]" >&2
  exit 2
}

[[ $# -ge 1 ]] || usage
repository=$1
shift
run_id=
artifact_name=
artifact_id=
while [[ $# -gt 0 ]]; do
  case "$1" in
    --run-id) [[ $# -ge 2 ]] || usage; run_id=$2; shift 2 ;;
    --artifact-name) [[ $# -ge 2 ]] || usage; artifact_name=$2; shift 2 ;;
    --artifact-id) [[ $# -ge 2 ]] || usage; artifact_id=$2; shift 2 ;;
    *) usage ;;
  esac
done

for command_name in gh curl awk sed sort mktemp; do
  command -v "$command_name" >/dev/null || { echo "missing command: $command_name" >&2; exit 1; }
done

minimum_mibps=${ODSH_MIN_DOWNLOAD_MIBPS:-1.0}
sample_bytes=${ODSH_SPEED_TEST_BYTES:-33554432}
sample_seconds=${ODSH_SPEED_TEST_SECONDS:-15}
awk -v value="$minimum_mibps" 'BEGIN { exit !(value >= 0) }' || {
  echo "ODSH_MIN_DOWNLOAD_MIBPS must be a non-negative number" >&2
  exit 2
}
[[ "$sample_bytes" =~ ^[1-9][0-9]*$ && "$sample_seconds" =~ ^[1-9][0-9]*$ ]] || {
  echo "speed-test byte and duration settings must be positive integers" >&2
  exit 2
}

if awk -v value="$minimum_mibps" 'BEGIN { exit !(value == 0) }'; then
  echo "release download speed check disabled by ODSH_MIN_DOWNLOAD_MIBPS=0"
  exit 0
fi

temporary_directory=$(mktemp -d "${TMPDIR:-/tmp}/odsh-release-speed.XXXXXX")
auth_config="$temporary_directory/github-api.curlrc"
cleanup() { rm -rf "$temporary_directory"; }
trap cleanup EXIT INT TERM

token=$(gh auth token)
previous_umask=$(umask)
umask 077
{
  printf 'header = "Authorization: Bearer %s"\n' "$token"
  printf 'header = "Accept: application/vnd.github+json"\n'
  printf 'header = "X-GitHub-Api-Version: 2022-11-28"\n'
} > "$auth_config"
umask "$previous_umask"
unset token

if [[ -n "$artifact_id" ]]; then
  record=$(gh api "repos/$repository/actions/artifacts/$artifact_id" \
    --jq '[.name, (.id | tostring), (.size_in_bytes | tostring), (.expired | tostring), (.workflow_run.id | tostring), .created_at] | @tsv')
else
  if [[ -n "$run_id" ]]; then
    endpoint="repos/$repository/actions/runs/$run_id/artifacts?per_page=100"
  else
    endpoint="repos/$repository/actions/artifacts?per_page=100"
  fi
  records=$(gh api "$endpoint" --jq '.artifacts[] | select(.expired == false) | select(.name | test("^desktop-(windows-x64|macos-arm64|macos-x64|linux-x64)$")) | [.name, (.id | tostring), (.size_in_bytes | tostring), (.expired | tostring), (.workflow_run.id | tostring), .created_at] | @tsv')
  if [[ -n "$artifact_name" ]]; then
    records=$(printf '%s\n' "$records" | awk -F '\t' -v name="$artifact_name" '$1 == name')
  fi
  record=$(printf '%s\n' "$records" | sed '/^$/d' | sort -t $'\t' -k6,6r -k3,3nr | sed -n '1p')
fi

[[ -n "${record:-}" ]] || {
  echo "no non-expired desktop installer artifact is available for a release-node speed check" >&2
  exit 1
}
IFS=$'\t' read -r resolved_name resolved_id artifact_size expired resolved_run_id created_at <<< "$record"
[[ "$expired" == false ]] || { echo "artifact $resolved_id is expired" >&2; exit 1; }
if [[ -n "$artifact_name" && "$resolved_name" != "$artifact_name" ]]; then
  echo "artifact $resolved_id is named $resolved_name, expected $artifact_name" >&2
  exit 1
fi

header_file="$temporary_directory/artifact.headers"
curl --silent --show-error --config "$auth_config" \
  --dump-header "$header_file" --output /dev/null \
  "https://api.github.com/repos/$repository/actions/artifacts/$resolved_id/zip"
signed_url=$(awk 'tolower(substr($0, 1, 9)) == "location:" { sub(/^[^:]*:[[:space:]]*/, ""); sub(/\r$/, ""); value=$0 } END { print value }' "$header_file")
[[ -n "$signed_url" ]] || { echo "GitHub did not return a signed URL for artifact $resolved_id" >&2; exit 1; }

range_end=$((sample_bytes - 1))
metrics_file="$temporary_directory/metrics"
set +e
curl --silent --location --range "0-$range_end" \
  --connect-timeout 10 --max-time "$sample_seconds" --output /dev/null \
  --write-out '%{size_download}\t%{time_total}\t%{speed_download}\t%{http_code}\n' \
  "$signed_url" > "$metrics_file"
curl_status=$?
set -e
IFS=$'\t' read -r downloaded_bytes elapsed_seconds speed_bps http_code < "$metrics_file"

if [[ -z "${speed_bps:-}" || "${downloaded_bytes:-0}" == 0 ]]; then
  echo "release-node speed check failed for $resolved_name (curl exit $curl_status, HTTP ${http_code:-unknown})" >&2
  exit 1
fi
if [[ "$curl_status" -ne 0 && "$curl_status" -ne 28 ]]; then
  echo "release-node speed check failed for $resolved_name (curl exit $curl_status, HTTP ${http_code:-unknown})" >&2
  exit 1
fi

speed_mibps=$(awk -v value="$speed_bps" 'BEGIN { printf "%.2f", value / 1048576 }')
threshold_text=$(awk -v value="$minimum_mibps" 'BEGIN { printf "%.2f", value }')
printf 'release-node speed: %s MiB/s (threshold %s MiB/s, artifact %s, run %s, sampled %s bytes in %.2fs)\n' \
  "$speed_mibps" "$threshold_text" "$resolved_name" "$resolved_run_id" "$downloaded_bytes" "$elapsed_seconds"

if awk -v speed="$speed_bps" -v minimum="$minimum_mibps" 'BEGIN { exit !(speed < minimum * 1048576) }'; then
  echo "release-node speed is below the configured threshold; stop packaging or download, switch network/proxy/node, then retry" >&2
  exit 75
fi

echo "release-node speed check passed"
