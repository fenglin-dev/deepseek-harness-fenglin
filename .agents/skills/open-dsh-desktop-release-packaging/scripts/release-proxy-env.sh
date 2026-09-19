#!/usr/bin/env bash

# Release traffic uses the workstation's local proxy unless the caller supplies
# another route. Set ODSH_PROXY_URL to an empty value for a deliberate direct run.
if [[ -z ${ODSH_PROXY_URL+x} ]]; then
  ODSH_PROXY_URL=http://127.0.0.1:7890
fi
export ODSH_PROXY_URL

if [[ -n $ODSH_PROXY_URL ]]; then
  export HTTP_PROXY=${HTTP_PROXY:-$ODSH_PROXY_URL}
  export HTTPS_PROXY=${HTTPS_PROXY:-$ODSH_PROXY_URL}
  export ALL_PROXY=${ALL_PROXY:-$ODSH_PROXY_URL}
  export http_proxy=${http_proxy:-$ODSH_PROXY_URL}
  export https_proxy=${https_proxy:-$ODSH_PROXY_URL}
  export all_proxy=${all_proxy:-$ODSH_PROXY_URL}
  export NODE_USE_ENV_PROXY=${NODE_USE_ENV_PROXY:-1}
fi
