#!/usr/bin/env bash
set -euo pipefail

script_directory=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
fixture_root=$(mktemp -d "${TMPDIR:-/tmp}/odsh-release-speed-test.XXXXXX")
cleanup() { rm -rf "$fixture_root"; }
trap cleanup EXIT

fake_bin="$fixture_root/bin"
mkdir -p "$fake_bin"

cat > "$fake_bin/gh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
if [[ "$1 $2" == "auth token" ]]; then
  echo fixture-token
  exit 0
fi
if [[ "$1" == api ]]; then
  if [[ "$*" == *"actions/artifacts/4242"* ]]; then
    printf 'desktop-macos-arm64\t4242\t104857600\tfalse\t202\t2026-09-17T10:00:00Z\n'
    exit 0
  fi
  printf 'desktop-windows-x64\t4141\t209715200\tfalse\t101\t2026-09-16T10:00:00Z\n'
  printf 'desktop-macos-arm64\t4242\t104857600\tfalse\t202\t2026-09-17T10:00:00Z\n'
  exit 0
fi
echo "unexpected gh invocation: $*" >&2
exit 1
EOF

cat > "$fake_bin/curl" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
header_file=
metrics=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dump-header) header_file=$2; shift 2 ;;
    --write-out) metrics=1; shift 2 ;;
    *) shift ;;
  esac
done
if [[ "$metrics" == 1 ]]; then
  if [[ -n ${ODSH_FIXTURE_TLS_COUNTER_FILE:-} ]]; then
    attempts=0
    [[ ! -f "$ODSH_FIXTURE_TLS_COUNTER_FILE" ]] || attempts=$(cat "$ODSH_FIXTURE_TLS_COUNTER_FILE")
    attempts=$((attempts + 1))
    printf '%s\n' "$attempts" > "$ODSH_FIXTURE_TLS_COUNTER_FILE"
    if [[ "$attempts" -le ${ODSH_FIXTURE_TLS_FAILURES:-0} ]]; then
      printf '0\t0.000000\t0\t000\n'
      exit 35
    fi
  fi
  printf '8388608\t4.000000\t%s\t206\n' "$ODSH_FIXTURE_SPEED_BPS"
else
  printf 'HTTP/1.1 302 Found\r\nLocation: https://fixture.invalid/artifact.zip\r\n\r\n' > "$header_file"
fi
EOF

cat > "$fake_bin/speed-source" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
speed=$1
count=$2
trap 'exit 130' INT
for ((index = 0; index < count; index += 1)); do
  printf '[#fixture 1MiB/10MiB(10%%) CN:1 DL:%s]\n' "$speed" >&2
  sleep 0.2
done
EOF

chmod +x "$fake_bin/gh" "$fake_bin/curl" "$fake_bin/speed-source"

high_output=$(PATH="$fake_bin:$PATH" \
ODSH_FIXTURE_SPEED_BPS=2097152 \
ODSH_MIN_DOWNLOAD_MIBPS=1 \
  "$script_directory/check-release-download-speed.sh" fixture/repository)
printf '%s\n' "$high_output"
printf '%s\n' "$high_output" | grep -q 'artifact desktop-macos-arm64, run 202' || {
  echo "automatic speed check did not select the newest artifact" >&2
  exit 1
}

tls_counter="$fixture_root/tls-counter"
tls_output=$(PATH="$fake_bin:$PATH" \
ODSH_FIXTURE_SPEED_BPS=2097152 \
ODSH_FIXTURE_TLS_COUNTER_FILE="$tls_counter" \
ODSH_FIXTURE_TLS_FAILURES=1 \
ODSH_SPEED_CHECK_RETRY_DELAY_SECONDS=0 \
ODSH_MIN_DOWNLOAD_MIBPS=1 \
  "$script_directory/check-release-download-speed.sh" fixture/repository --artifact-id 4242 --artifact-name desktop-macos-arm64)
printf '%s\n' "$tls_output"
[[ $(cat "$tls_counter") -ge 3 ]] || {
  echo "speed check did not replace the failed TLS sample with two valid samples" >&2
  exit 1
}

transport_counter="$fixture_root/transport-counter"
set +e
PATH="$fake_bin:$PATH" \
ODSH_FIXTURE_SPEED_BPS=2097152 \
ODSH_FIXTURE_TLS_COUNTER_FILE="$transport_counter" \
ODSH_FIXTURE_TLS_FAILURES=10 \
ODSH_SPEED_CHECK_ATTEMPTS=2 \
ODSH_SPEED_CHECK_RETRY_DELAY_SECONDS=0 \
ODSH_MIN_DOWNLOAD_MIBPS=1 \
  "$script_directory/check-release-download-speed.sh" fixture/repository --artifact-id 4242 --artifact-name desktop-macos-arm64
transport_status=$?
set -e
[[ "$transport_status" == 74 ]] || {
  echo "transport-only speed failure exited $transport_status, expected 74" >&2
  exit 1
}

set +e
PATH="$fake_bin:$PATH" \
ODSH_FIXTURE_SPEED_BPS=262144 \
ODSH_MIN_DOWNLOAD_MIBPS=1 \
  "$script_directory/check-release-download-speed.sh" fixture/repository --artifact-id 4242 --artifact-name desktop-macos-arm64
low_preflight_status=$?
set -e
[[ "$low_preflight_status" == 75 ]] || {
  echo "low preflight exited $low_preflight_status, expected 75" >&2
  exit 1
}

node "$script_directory/monitor-release-download.mjs" \
  --minimum-mibps 1 --warmup-seconds 0 --window-seconds 1 \
  -- "$fake_bin/speed-source" 2MiB 2

set +e
node "$script_directory/monitor-release-download.mjs" \
  --minimum-mibps 1 --warmup-seconds 0 --window-seconds 1 \
  -- "$fake_bin/speed-source" 256KiB 20
low_monitor_status=$?
set -e
[[ "$low_monitor_status" == 75 ]] || {
  echo "low active download exited $low_monitor_status, expected 75" >&2
  exit 1
}

echo "release download speed fixture test passed"
