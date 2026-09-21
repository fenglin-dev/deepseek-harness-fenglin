#!/usr/bin/env bash
set -euo pipefail

script_directory=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
temporary=$(mktemp -d "${TMPDIR:-/tmp}/odsh-metadata-test.XXXXXX")
trap 'chmod -R u+w "$temporary" 2>/dev/null || true; rm -rf "$temporary"' EXIT
mkdir -p "$temporary/bin" "$temporary/artifact"
printf '{"schemaVersion":2}\n' > "$temporary/artifact/workspace-runtimes-1.2.3.v2.json"
printf '{"bundle":true}\n' > "$temporary/artifact/workspace-runtimes.v2.sigstore.json"
cat > "$temporary/bin/gh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
if [[ $1 == api ]]; then echo master; exit 0; fi
if [[ $1 == workflow && $2 == run ]]; then exit 0; fi
if [[ $1 == run && $2 == list ]]; then echo 12345; exit 0; fi
if [[ $1 == run && $2 == watch ]]; then exit 0; fi
if [[ $1 == run && $2 == download ]]; then
  while [[ $# -gt 0 ]]; do
    if [[ $1 == --dir ]]; then destination=$2; break; fi
    shift
  done
  mkdir -p "$destination"
  cp "$FAKE_METADATA_ARTIFACT"/* "$destination/"
  exit 0
fi
echo "unexpected gh invocation: $*" >&2
exit 1
EOF
chmod +x "$temporary/bin/gh"
export PATH="$temporary/bin:$PATH"
export FAKE_METADATA_ARTIFACT="$temporary/artifact"
export ODSH_USE_SYSTEM_PROXY=0

output="$temporary/output"
"$script_directory/prepare-release-metadata.sh" fixture/repository odsh-v1.2.3 "$output"
test -s "$output/workspace-runtimes-1.2.3.v2.json"
test -s "$output/workspace-runtimes.v2.sigstore.json"
[[ $(find "$output" -mindepth 1 -maxdepth 1 -type f | wc -l | tr -d ' ') == 2 ]]
if "$script_directory/prepare-release-metadata.sh" --run-id 12345 fixture/repository odsh-v1.2.3 "$output" >/dev/null 2>&1; then
  echo 'existing metadata should require explicit replacement' >&2
  exit 1
fi
"$script_directory/prepare-release-metadata.sh" --run-id 12345 --replace-existing \
  fixture/repository odsh-v1.2.3 "$output" >/dev/null
[[ $(find "$temporary" -maxdepth 1 -name 'output.replaced.*' -type d | wc -l | tr -d ' ') == 1 ]]
echo 'prepare-release-metadata tests passed'
