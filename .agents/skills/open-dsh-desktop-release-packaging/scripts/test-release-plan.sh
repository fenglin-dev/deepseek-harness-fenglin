#!/usr/bin/env bash
set -euo pipefail

script_directory=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
temporary=$(mktemp -d "${TMPDIR:-/tmp}/odsh-release-plan-test.XXXXXX")
trap 'rm -rf "$temporary"' EXIT
plan="$temporary/plan.json"
rendered="$temporary/state.md"
sha=0123456789abcdef0123456789abcdef01234567

node "$script_directory/release-plan.mjs" init "$plan" 9.8.7 fixture/desktop fixture/cnb \
  release/9.8.7 "$sha" odsh-v9.8.6 stable 1.25
node "$script_directory/release-plan.mjs" validate "$plan"
[[ $(node "$script_directory/release-plan.mjs" get "$plan" identity.tag) == odsh-v9.8.7 ]]
[[ $(node "$script_directory/release-plan.mjs" get "$plan" network.minimumMibps) == 1.25 ]]

node "$script_directory/release-plan.mjs" set "$plan" \
  network.status verified network.route direct \
  platforms.windows.status succeeded platforms.windows.runId 101 platforms.windows.sourceSha "$sha" \
  artifacts.status verified artifacts.directory /tmp/release/9.8.7
node "$script_directory/release-plan.mjs" render "$plan" "$rendered"
grep -q '^This file is generated from the machine-readable release plan' "$rendered"
grep -q '| Windows x64 | succeeded | 101 |' "$rendered"
grep -q '| Network route | verified | direct; floor 1.25 MiB/s |' "$rendered"
[[ $(node "$script_directory/release-plan.mjs" digest "$plan" | wc -c | tr -d ' ') == 64 ]]

before=$(shasum -a 256 "$plan" | awk '{ print $1 }')
node "$script_directory/release-plan.mjs" init "$plan" 9.8.7 fixture/desktop fixture/cnb \
  release/9.8.7 "$sha" odsh-v9.8.6 stable 1.25
after=$(shasum -a 256 "$plan" | awk '{ print $1 }')
[[ "$before" == "$after" ]] || { echo 'matching init changed the existing release plan' >&2; exit 1; }

set +e
node "$script_directory/release-plan.mjs" init "$plan" 9.8.8 fixture/desktop fixture/cnb \
  release/9.8.8 "$sha" odsh-v9.8.7 stable 1 >"$temporary/mismatch.out" 2>&1
mismatch_status=$?
set -e
[[ "$mismatch_status" != 0 ]]
grep -q 'release plan identity changed' "$temporary/mismatch.out"

node -e "const fs=require('node:fs'); const p=JSON.parse(fs.readFileSync(process.argv[1])); p.identity.tag='wrong'; fs.writeFileSync(process.argv[1], JSON.stringify(p))" "$plan"
set +e
node "$script_directory/release-plan.mjs" validate "$plan" >"$temporary/invalid.out" 2>&1
invalid_status=$?
set -e
[[ "$invalid_status" != 0 ]]
grep -q 'tag and title must derive' "$temporary/invalid.out"

echo 'release plan fixture test passed'
