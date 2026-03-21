# BoggersTheAI-Dev — convenience targets (Unix make; on Windows use Git Bash or WSL)

.PHONY: verify compose-config build up down test-backend test-wasm

compose-config:
	docker compose -f docker-compose.yml config

build:
	docker compose -f docker-compose.yml build

up:
	docker compose -f docker-compose.yml up -d

down:
	docker compose -f docker-compose.yml down

verify:
	bash scripts/verify-stack.sh

test-backend:
	cd backend && python -m pytest -q --tb=short tests/test_dashboard_endpoints.py tests/test_distributed_sharding.py tests/test_multi_agent.py

# Requires wasm-pack + Rust: https://rustup.rs https://rustwasm.wasm-pack.dev/
test-wasm:
	cd wasm/ts-os-mini && wasm-pack test --chrome --headless

build-wasm:
	bash scripts/build-wasm.sh
