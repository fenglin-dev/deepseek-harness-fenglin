#!/usr/bin/env bash
set -euo pipefail

script_directory=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
proxy_script="$script_directory/release-proxy-env.sh"

default_output=$(env -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY -u http_proxy -u https_proxy -u all_proxy \
  -u ODSH_PROXY_URL -u NODE_USE_ENV_PROXY bash -c \
  'source "$1"; printf "%s\n" "$HTTP_PROXY" "$HTTPS_PROXY" "$ALL_PROXY" "$NODE_USE_ENV_PROXY"' bash "$proxy_script")
[[ "$default_output" == $'http://127.0.0.1:7890\nhttp://127.0.0.1:7890\nhttp://127.0.0.1:7890\n1' ]]

override_output=$(env -u HTTPS_PROXY -u ALL_PROXY -u http_proxy -u https_proxy -u all_proxy \
  HTTP_PROXY=http://existing.example:8080 ODSH_PROXY_URL=http://selected.example:9090 \
  bash -c 'source "$1"; printf "%s\n" "$HTTP_PROXY" "$HTTPS_PROXY"' bash "$proxy_script")
[[ "$override_output" == $'http://existing.example:8080\nhttp://selected.example:9090' ]]

direct_output=$(env -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY -u http_proxy -u https_proxy -u all_proxy \
  ODSH_PROXY_URL= bash -c 'source "$1"; printf "%s" "${HTTPS_PROXY-unset}"' bash "$proxy_script")
[[ "$direct_output" == unset ]]

echo "release proxy environment fixture test passed"
