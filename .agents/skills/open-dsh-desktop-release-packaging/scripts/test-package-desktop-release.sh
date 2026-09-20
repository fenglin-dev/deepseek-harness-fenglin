#!/usr/bin/env bash
set -euo pipefail

source_directory=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
temporary=$(mktemp -d)
trap 'rm -rf "$temporary"' EXIT

fixture="$temporary/repository"
scripts="$fixture/.agents/skills/open-dsh-desktop-release-packaging/scripts"
mkdir -p "$scripts" "$fixture/apps/desktop" "$temporary/bin"
cp "$source_directory/package-desktop-release.sh" "$scripts/"
cp "$source_directory/release-package-state.mjs" "$scripts/"

printf '{"version":"9.8.7"}\n' > "$fixture/apps/desktop/package.json"
printf 'name: fixture\n' > "$fixture/.github-workflow-placeholder"
cat > "$scripts/configure-cli-proxy.sh" <<'EOF'
#!/usr/bin/env bash
:
EOF
cat > "$scripts/check-release-download-speed.sh" <<'EOF'
#!/usr/bin/env bash
echo "fixture speed passed"
EOF
cat > "$scripts/download-desktop-release.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
echo "$*" >> "$ODSH_FIXTURE_DOWNLOAD_LOG"
root=$(git rev-parse --show-toplevel)
[[ ! -e "$root/release/9.8.7" ]] || { echo "fixture refuses existing release directory" >&2; exit 1; }
mkdir -p "$root/release/9.8.7"
EOF
cat > "$scripts/verify-release-directory.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
[[ -d "$1" ]]
echo "$1" >> "$ODSH_FIXTURE_VERIFY_LOG"
EOF
chmod +x "$scripts"/*.sh

cat > "$temporary/bin/gh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
if [[ "$1 $2" == "run list" ]]; then
  case "$*" in
    *"windows-x64"*) target=windows-x64; id=101 ;;
    *"macos"*) target=macos; id=202 ;;
    *"linux-x64"*) target=linux-x64; id=303 ;;
    *) exit 0 ;;
  esac
  grep -q "^dispatch $target $id " "$ODSH_FIXTURE_GH_LOG" 2>/dev/null && printf '%s\n' "$id"
  exit 0
elif [[ "$1 $2" == "workflow run" ]]; then
  target=
  refresh=
  snapshot=none
  while [[ $# -gt 0 ]]; do
    if [[ "$1" == -f ]]; then
      case "$2" in
        target=*) target=${2#target=} ;;
        refresh_plugins=*) refresh=${2#refresh_plugins=} ;;
        bundled_plugin_run_id=*) snapshot=${2#bundled_plugin_run_id=} ;;
      esac
      shift 2
    else
      shift
    fi
  done
  case "$target" in
    windows-x64) id=101 ;;
    macos) id=202 ;;
    linux-x64) id=303 ;;
    *) exit 2 ;;
  esac
  echo "dispatch $target $id refresh=$refresh snapshot=$snapshot" >> "$ODSH_FIXTURE_GH_LOG"
elif [[ "$1 $2" == "run view" ]]; then
  id=$3
  echo "view $id" >> "$ODSH_FIXTURE_GH_LOG"
  count_file="$ODSH_FIXTURE_GH_LOG.view-$id"
  count=0
  [[ ! -f "$count_file" ]] || count=$(cat "$count_file")
  echo $((count + 1)) > "$count_file"
  if [[ "$count" == 0 ]]; then
    printf 'in_progress\x1f\x1f%s\x1fhttps://github.test/actions/runs/%s\n' "$ODSH_FIXTURE_SHA" "$id"
  else
    printf 'completed\x1fsuccess\x1f%s\x1fhttps://github.test/actions/runs/%s\n' "$ODSH_FIXTURE_SHA" "$id"
  fi
else
  echo "unexpected gh invocation: $*" >&2
  exit 2
fi
EOF
chmod +x "$temporary/bin/gh"

git -C "$fixture" init -q
git -C "$fixture" config user.name fixture
git -C "$fixture" config user.email fixture@example.invalid
git -C "$fixture" add .
git -C "$fixture" commit -qm fixture
git -C "$fixture" branch -M release/9.8.7
sha=$(git -C "$fixture" rev-parse HEAD)

export PATH="$temporary/bin:$PATH"
export ODSH_RELEASE_TEST_OVERRIDES=1
export ODSH_SKIP_REMOTE_HEAD_CHECK=1
export ODSH_RELEASE_POLL_SECONDS=0
export ODSH_FIXTURE_SHA=$sha
export ODSH_FIXTURE_GH_LOG="$temporary/gh.log"
export ODSH_FIXTURE_DOWNLOAD_LOG="$temporary/download.log"
export ODSH_FIXTURE_VERIFY_LOG="$temporary/verify.log"

(
  cd "$fixture"
  "$scripts/package-desktop-release.sh" --version 9.8.7 --minimum-free-gib 0 fixture/repository
)

expected=$'dispatch windows-x64 101 refresh=true snapshot=none\nview 101\nview 101\ndispatch macos 202 refresh=false snapshot=101\ndispatch linux-x64 303 refresh=false snapshot=101\nview 202\nview 202\nview 303\nview 303'
[[ "$(cat "$ODSH_FIXTURE_GH_LOG")" == "$expected" ]] || {
  echo "unexpected orchestration order:" >&2
  cat "$ODSH_FIXTURE_GH_LOG" >&2
  exit 1
}
grep -q '^fixture/repository 101 202 303$' "$ODSH_FIXTURE_DOWNLOAD_LOG"
state="$fixture/.git/odsh-release-state/9.8.7.json"
node "$scripts/release-package-state.mjs" show "$state" | grep -q '"status": "verified"'

before=$(grep -c '^dispatch ' "$ODSH_FIXTURE_GH_LOG")
(
  cd "$fixture"
  "$scripts/package-desktop-release.sh" --version 9.8.7 --minimum-free-gib 0 fixture/repository
)
after=$(grep -c '^dispatch ' "$ODSH_FIXTURE_GH_LOG")
[[ "$before" == "$after" ]] || { echo "resume dispatched duplicate workflows" >&2; exit 1; }
[[ $(wc -l < "$ODSH_FIXTURE_DOWNLOAD_LOG" | tr -d ' ') == 1 ]] || { echo "resume repeated the completed download" >&2; exit 1; }

echo "package-desktop-release fixture test passed"
