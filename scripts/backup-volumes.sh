#!/usr/bin/env bash
# Backup Docker named volumes for ts-os (run on host with docker).
set -euo pipefail
OUT="${1:-./backups}"
mkdir -p "$OUT"
STAMP=$(date +%Y%m%d-%H%M%S)
PROJECT="${COMPOSE_PROJECT_NAME:-ts-os}"

docker run --rm \
  -v "${PROJECT}_boggers-data":/v \
  -v "$(cd "$OUT" && pwd)":/backup \
  alpine:latest \
  tar czf "/backup/boggers-data-${STAMP}.tgz" -C /v .

docker run --rm \
  -v "${PROJECT}_ollama-data":/v \
  -v "$(cd "$OUT" && pwd)":/backup \
  alpine:latest \
  tar czf "/backup/ollama-data-${STAMP}.tgz" -C /v . || true

echo "Wrote archives under $OUT"
