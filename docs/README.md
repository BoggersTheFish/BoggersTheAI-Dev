# Documentation — BoggersTheAI-Dev

Start with the **[root README](../README.md)** for:

- **How the website, Lab, and AI connect** — browser → Next `/api/boggers/*` → FastAPI → Ollama / graph / Redis  
- **Setup** — local Docker, Ubuntu VPS one-liner, split (Vercel + API) notes  
- **Production checklist** — TLS, CORS, token, models, firewall, backups  
- **Configuration and troubleshooting**

| Document | Description |
|----------|-------------|
| [VPS.md](VPS.md) | Firewall, swap, Docker volumes, backups, systemd, secrets. One-command install: [`scripts/vps-bootstrap.sh`](../scripts/vps-bootstrap.sh). |
| [WAVE13.md](WAVE13.md) | Wave 13 — Distributed Graph: logical sharding, `/distributed/*` API, multi-agent + Redis. |
| [WAVE15.md](WAVE15.md) | Wave 15 — WASM: Rust crate `wasm/ts-os-mini`, `/wasm` route, `scripts/build-wasm.sh`. |

**Product site:** [boggersthefish.com](https://boggersthefish.com) — roadmap, [Lab](https://boggersthefish.com/lab), [TS-OS](https://boggersthefish.com/ts-os).

**Frontend integration (paths, env):** [frontend/README.md](../frontend/README.md).
