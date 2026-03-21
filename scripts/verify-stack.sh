#!/usr/bin/env bash
# Verify Wave 14 stack: compose valid, services healthy, critical HTTP paths.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

FAIL=0

if [[ -f .env ]]; then
  # shellcheck source=/dev/null
  set -a && source .env && set +a
fi

echo "==> docker compose config"
docker compose -f docker-compose.yml config >/dev/null

echo "==> curl backend /health/live"
if curl -sf --max-time 5 "http://127.0.0.1:8000/health/live" >/dev/null; then
  echo "    OK"
else
  echo "    FAIL (is backend up?)"
  FAIL=1
fi

echo "==> curl frontend /"
if curl -sf --max-time 5 -o /dev/null "http://127.0.0.1:3000/"; then
  echo "    OK"
else
  echo "    FAIL (is frontend up?)"
  FAIL=1
fi

if [[ -n "${BOGGERS_DASHBOARD_TOKEN:-}" ]]; then
  echo "==> curl Next /api/boggers/status (with token)"
  if curl -sf --max-time 5 -H "Authorization: Bearer ${BOGGERS_DASHBOARD_TOKEN}" \
    "http://127.0.0.1:3000/api/boggers/status" >/dev/null; then
    echo "    OK"
  else
    echo "    FAIL"
    FAIL=1
  fi
else
  echo "==> skip authenticated /api/boggers/status (BOGGERS_DASHBOARD_TOKEN unset)"
fi

exit "$FAIL"
