#!/usr/bin/env bash
set -euo pipefail

script_directory=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
fixture_root=$(mktemp -d "${TMPDIR:-/tmp}/odsh-cli-proxy-test.XXXXXX")
cleanup() { rm -rf "$fixture_root"; }
trap cleanup EXIT

fake_bin="$fixture_root/bin"
mkdir -p "$fake_bin"

printf '#!/usr/bin/env bash\nprintf "Darwin\\n"\n' > "$fake_bin/uname"
printf '%s\n' '#!/usr/bin/env bash' 'cat <<SETTINGS' \
  '<dictionary> {' \
  '  HTTPEnable : 1' \
  '  HTTPPort : 7890' \
  '  HTTPProxy : 127.0.0.1' \
  '  HTTPSEnable : 1' \
  '  HTTPSPort : 7890' \
  '  HTTPSProxy : 127.0.0.1' \
  '  SOCKSEnable : 1' \
  '  SOCKSPort : 7890' \
  '  SOCKSProxy : 127.0.0.1' \
  '}' \
  'SETTINGS' > "$fake_bin/scutil"
chmod +x "$fake_bin/uname" "$fake_bin/scutil"

for shell in bash zsh; do
  proxy_output=$(env -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY \
    -u http_proxy -u https_proxy -u all_proxy -u NO_PROXY -u no_proxy \
    PATH="$fake_bin:$PATH" "$shell" -c \
    'source "$1"; printf "%s|%s|%s|%s|%s\n" "$HTTP_PROXY" "$HTTPS_PROXY" "$ALL_PROXY" "$NO_PROXY" "$ODSH_RELEASE_ROUTE_NAME"' \
    fixture "$script_directory/configure-cli-proxy.sh")
  [[ "$proxy_output" == 'http://127.0.0.1:7890|http://127.0.0.1:7890|socks5h://127.0.0.1:7890|localhost,127.0.0.1,::1|macos-system-proxy' ]]

  explicit_output=$(env -u HTTP_PROXY -u ALL_PROXY -u http_proxy -u https_proxy -u all_proxy \
    HTTPS_PROXY=http://explicit.invalid:8080 PATH="$fake_bin:$PATH" "$shell" -c \
    'source "$1"; printf "%s|%s|%s|%s\n" "${HTTP_PROXY:-}" "$HTTPS_PROXY" "$https_proxy" "$ODSH_RELEASE_ROUTE_NAME"' \
    fixture "$script_directory/configure-cli-proxy.sh")
  [[ "$explicit_output" == '|http://explicit.invalid:8080|http://explicit.invalid:8080|explicit-proxy-environment' ]]

  disabled_output=$(env -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY \
    -u http_proxy -u https_proxy -u all_proxy ODSH_USE_SYSTEM_PROXY=0 \
    PATH="$fake_bin:$PATH" "$shell" -c \
    'source "$1"; printf "%s|%s|%s|%s\n" "${HTTP_PROXY:-}" "${HTTPS_PROXY:-}" "${ALL_PROXY:-}" "$ODSH_RELEASE_ROUTE_NAME"' \
    fixture "$script_directory/configure-cli-proxy.sh")
  [[ "$disabled_output" == '|||direct' ]]
done

echo "CLI proxy configuration fixture test passed"
