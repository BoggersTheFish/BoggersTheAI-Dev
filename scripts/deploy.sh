#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -d backend || ! -d frontend ]]; then
  echo "Run from ts-os-public with backend/ and frontend/ cloned (see README)." >&2
  exit 1
fi

if [[ -f .env ]]; then
  # shellcheck source=/dev/null
  set -a && source .env && set +a
fi

echo "==> Building images"
docker compose build

echo "==> Starting stack"
docker compose up -d

echo "==> Redis ping"
docker compose exec -T redis redis-cli ping || true

echo "==> Pulling Ollama models (idempotent)"
docker compose exec -T ollama ollama pull llama3.2 || true
docker compose exec -T ollama ollama pull nomic-embed-text || true

echo "==> Health"
docker compose ps
curl -sf "http://127.0.0.1:8000/health/live" && echo " backend OK" || echo " backend not ready yet"
curl -sf -o /dev/null "http://127.0.0.1:3000" && echo " frontend OK" || echo " frontend not ready yet"

echo "==> Stack verify (optional — fails if services not ready yet)"
bash scripts/verify-stack.sh || true

echo "Done. Optional TLS: docker compose --profile tls up -d"
