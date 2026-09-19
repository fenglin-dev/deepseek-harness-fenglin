#!/usr/bin/env bash

# Preserve explicit CLI proxy settings. Mirror case variants because curl,
# GitHub CLI, npm, and pnpm do not all consult the same spelling.
odsh_sync_proxy_pair() {
  local upper_name=$1 lower_name=$2 upper_value lower_value value
  eval "upper_value=\${${upper_name}:-}"
  eval "lower_value=\${${lower_name}:-}"
  value=${upper_value:-$lower_value}
  [[ -n "$value" ]] || return 0
  export "$upper_name=$value" "$lower_name=$value"
}

odsh_configure_cli_proxy() {
  odsh_sync_proxy_pair HTTP_PROXY http_proxy
  odsh_sync_proxy_pair HTTPS_PROXY https_proxy
  odsh_sync_proxy_pair ALL_PROXY all_proxy
  odsh_sync_proxy_pair NO_PROXY no_proxy
  if [[ -n ${HTTP_PROXY:-}${HTTPS_PROXY:-}${ALL_PROXY:-} ]]; then return 0; fi

  [[ ${ODSH_USE_SYSTEM_PROXY:-1} != 0 ]] || return 0
  [[ $(uname -s 2>/dev/null || true) == Darwin ]] || return 0
  command -v scutil >/dev/null || return 0

  local settings http_enable http_host http_port
  local https_enable https_host https_port socks_enable socks_host socks_port
  settings=$(scutil --proxy 2>/dev/null) || return 0
  http_enable=$(printf '%s\n' "$settings" | awk '$1 == "HTTPEnable" && $2 == ":" { print $3; exit }')
  http_host=$(printf '%s\n' "$settings" | awk '$1 == "HTTPProxy" && $2 == ":" { print $3; exit }')
  http_port=$(printf '%s\n' "$settings" | awk '$1 == "HTTPPort" && $2 == ":" { print $3; exit }')
  https_enable=$(printf '%s\n' "$settings" | awk '$1 == "HTTPSEnable" && $2 == ":" { print $3; exit }')
  https_host=$(printf '%s\n' "$settings" | awk '$1 == "HTTPSProxy" && $2 == ":" { print $3; exit }')
  https_port=$(printf '%s\n' "$settings" | awk '$1 == "HTTPSPort" && $2 == ":" { print $3; exit }')
  socks_enable=$(printf '%s\n' "$settings" | awk '$1 == "SOCKSEnable" && $2 == ":" { print $3; exit }')
  socks_host=$(printf '%s\n' "$settings" | awk '$1 == "SOCKSProxy" && $2 == ":" { print $3; exit }')
  socks_port=$(printf '%s\n' "$settings" | awk '$1 == "SOCKSPort" && $2 == ":" { print $3; exit }')

  local adopted=''
  if [[ $http_enable == 1 && -n $http_host && $http_port =~ ^[1-9][0-9]*$ ]]; then
    HTTP_PROXY="http://$http_host:$http_port"
    http_proxy=$HTTP_PROXY
    export HTTP_PROXY http_proxy
    adopted="HTTP $http_host:$http_port"
  fi
  if [[ $https_enable == 1 && -n $https_host && $https_port =~ ^[1-9][0-9]*$ ]]; then
    HTTPS_PROXY="http://$https_host:$https_port"
    https_proxy=$HTTPS_PROXY
    export HTTPS_PROXY https_proxy
    [[ -z $adopted ]] || adopted="$adopted, "
    adopted="${adopted}HTTPS $https_host:$https_port"
  fi
  if [[ $socks_enable == 1 && -n $socks_host && $socks_port =~ ^[1-9][0-9]*$ ]]; then
    ALL_PROXY="socks5h://$socks_host:$socks_port"
    all_proxy=$ALL_PROXY
    export ALL_PROXY all_proxy
    [[ -z $adopted ]] || adopted="$adopted, "
    adopted="${adopted}SOCKS $socks_host:$socks_port"
  fi
  [[ -n $adopted ]] || return 0

  if [[ -z ${NO_PROXY:-}${no_proxy:-} ]]; then
    NO_PROXY='localhost,127.0.0.1,::1'
    no_proxy=$NO_PROXY
    export NO_PROXY no_proxy
  fi
  printf 'release network: adopted macOS system proxy for CLI tools (%s)\n' "$adopted" >&2
}

odsh_configure_cli_proxy
unset -f odsh_configure_cli_proxy odsh_sync_proxy_pair
