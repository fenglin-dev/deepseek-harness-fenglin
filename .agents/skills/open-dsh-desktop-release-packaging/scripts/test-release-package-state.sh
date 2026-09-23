#!/usr/bin/env bash
set -euo pipefail

script_directory=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
temporary=$(mktemp -d)
trap 'rm -rf "$temporary"' EXIT
state="$temporary/state.json"

node "$script_directory/release-package-state.mjs" init "$state" 9.8.7 fixture/repo release/9.8.7 0123456789012345678901234567890123456789
node "$script_directory/release-package-state.mjs" set "$state" stages.windows.status failed stages.windows.runId 101
node "$script_directory/release-package-state.mjs" retry "$state" windows macos linux download
[[ -z "$(node "$script_directory/release-package-state.mjs" get "$state" stages.windows.status)" ]]
[[ "$(node "$script_directory/release-package-state.mjs" get "$state" retries.windows)" == 1 ]]
[[ "$(node "$script_directory/release-package-state.mjs" get "$state" history.0.previous.runId)" == 101 ]]

legacy="$temporary/legacy.json"
printf '%s\n' '{"schema":"open-deepseek-harness-desktop/package-orchestration/v1","version":"9.8.7","repository":"fixture/repo","branch":"release/9.8.7","sourceSha":"0123456789012345678901234567890123456789","createdAt":"2026-01-01T00:00:00.000Z","updatedAt":"2026-01-01T00:00:00.000Z","stages":{}}' > "$legacy"
node "$script_directory/release-package-state.mjs" init "$legacy" 9.8.7 fixture/repo release/9.8.7 0123456789012345678901234567890123456789
node "$script_directory/release-package-state.mjs" show "$legacy" | grep -q 'package-orchestration/v2'

echo "release package state fixture test passed"
