# VPS runbook — BoggersTheAI-Dev (Docker)

Stack: **Ollama**, **Redis** (Wave 13 multi-agent), **BoggersTheAI** (FastAPI), **Next.js**, optional **Caddy** (TLS). See root [`docker-compose.yml`](../docker-compose.yml).

## One-command bootstrap (Ubuntu)

From a fresh Ubuntu VPS (SSH as a sudo user):

```bash
curl -fsSL https://raw.githubusercontent.com/BoggersTheFish/BoggersTheAI-Dev/main/scripts/vps-bootstrap.sh | sudo bash
```

Public hostname + TLS (Caddy): `sudo bash ... -- --domain boggersthefish.com --tls` (DNS must point here before Let’s Encrypt will succeed).

The script installs **Docker** if missing, clones to **`/opt/BoggersTheAI-Dev`**, wires **`.env`** (shared dashboard token + CORS when `--domain` is set), runs **`docker compose up -d --build`**, pulls **llama3.2** and **nomic-embed-text**, and runs **`scripts/verify-stack.sh`**. Re-run the same command later to **git pull** and rebuild.

## Ports

- **3000** — Next.js (primary UI; proxies `/api/boggers/*` to FastAPI with `BOGGERS_DASHBOARD_TOKEN` server-side).
- **8000** — BoggersTheAI FastAPI (optional public exposure; prefer only via Next proxy or Caddy).
- **11434** — Ollama API (do not expose publicly; keep on private network / firewall).
- **6379** — Redis — **not** published to the host in the default compose file (internal Docker network only). Do not expose Redis to the public internet.
- **80 / 443** — optional Caddy (`docker compose --profile tls up -d`).

## Firewall (example: `ufw`)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
# Only if you need direct access for debugging:
# sudo ufw allow 3000/tcp
sudo ufw enable
```

## Swap (Ollama + embeddings)

Low-RAM VPS: add 4–8G swap before pulling large models.

```bash
sudo fallocate -l 8G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## Backups

Persisted state lives in Docker volumes:

- `boggers-data` — SQLite `graph.db`, vault, traces, snapshots (`/data` in the backend container).
- `ollama-data` — pulled models.
- `redis-data` — optional agent task broker persistence for Wave 13 multi-agent.

**Scripted backup** (from repo root, respects `COMPOSE_PROJECT_NAME`):

```bash
bash scripts/backup-volumes.sh ./backups
```

Manual example:

```bash
docker run --rm -v ts-os_boggers-data:/v -v "$(pwd)":/backup alpine \
  tar czf /backup/boggers-data.tgz -C /v .
```

## systemd (Docker Compose unit)

Run compose from a fixed path (e.g. `/opt/BoggersTheAI-Dev` or `/opt/ts-os-public`):

```ini
[Unit]
Description=TS-OS Docker Compose
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/BoggersTheAI-Dev
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

Install:

```bash
sudo install -m 644 ts-os.service /etc/systemd/system/ts-os.service
sudo systemctl daemon-reload
sudo systemctl enable --now ts-os.service
```

Pair with `restart: unless-stopped` in `docker-compose.yml` for container-level recovery.

## Rate limiting and abuse

- FastAPI: `POST /query` is limited (slowapi) per **client IP** or **`X-Boggers-Session-ID`** when present.
- Wave 13 **agent** tasks use Redis; keep Redis on the internal network only.
- Edge: add a CDN or reverse-proxy rate limit (many operators use Cloudflare or nginx `limit_req` in front).

## Secrets

- Set a long random `BOGGERS_DASHBOARD_TOKEN` in `.env`.
- Rotate by updating `.env`, `docker compose up -d --force-recreate`.
