#!/bin/sh
set -e
if [ -d /data ]; then
  chown -R boggers:boggers /data 2>/dev/null || true
fi
exec gosu boggers "$@"
