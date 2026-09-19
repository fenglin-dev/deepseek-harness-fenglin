#!/bin/sh
set -eu

for directory in /config /workspaces; do
  if [ ! -d "$directory" ]; then
    echo "open-dsh-nas: required mount is missing: $directory" >&2
    exit 70
  fi
  if [ ! -w "$directory" ]; then
    echo "open-dsh-nas: mount is not writable by uid=$(id -u) gid=$(id -g): $directory" >&2
    exit 71
  fi
done

mkdir -p "${HOME:-/config/.home}" "${XDG_CACHE_HOME:-/config/.cache}"
echo "open-dsh-nas: storage preflight passed (uid=$(id -u) gid=$(id -g))"
exec "$@"
