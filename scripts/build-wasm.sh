#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/wasm/ts-os-mini"
command -v wasm-pack >/dev/null 2>&1 || {
  echo "Install wasm-pack: https://rustwasm.wasm-pack.dev/installer/" >&2
  exit 1
}
wasm-pack build --target web --out-dir ../../frontend/public/wasm/ts-os-mini
echo "WASM built to frontend/public/wasm/ts-os-mini/"
