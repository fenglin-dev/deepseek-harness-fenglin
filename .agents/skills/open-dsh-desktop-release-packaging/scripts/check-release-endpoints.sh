#!/usr/bin/env bash
set -euo pipefail

usage() { echo "usage: $0 <desktop-owner/repo>" >&2; exit 2; }
[[ $# -eq 1 ]] || usage
desktop_repository=$1
script_directory=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
source "$script_directory/configure-cli-proxy.sh"

gh api "repos/$desktop_repository" --silent >/dev/null
curl --fail --silent --show-error --location --max-time 20 --range 0-0 --output /dev/null \
  'https://registry.npmjs.org/%40deepseek-ai%2Flibreoffice-kit'

echo "release endpoints: GitHub API and official npm registry are reachable via ${ODSH_RELEASE_ROUTE_NAME:-unknown}"
