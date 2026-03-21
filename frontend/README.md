# boggersthefish-site (frontend in BoggersTheAI-Dev)

> *This site is not "about" TS — it IS a running instance of TS.*

Upstream lives at [boggersthefish.com](https://boggersthefish.com). In **[BoggersTheAI-Dev](https://github.com/BoggersTheFish/BoggersTheAI-Dev)** this tree is the **Next.js frontend** wired to the real **BoggersTheAI** FastAPI backend.

## BoggersTheAI-Dev integration (read this first)

| Feature | Location |
|---------|----------|
| **API proxy** (server-side `BOGGERS_DASHBOARD_TOKEN`) | [`src/app/api/boggers/[...path]/route.ts`](src/app/api/boggers/%5B...path%5D/route.ts) |
| **Client API base** | [`src/lib/boggersApi.ts`](src/lib/boggersApi.ts) — default `/api/boggers` |
| **Lab** — live `/status`, `POST /query` | [`src/app/lab/page.tsx`](src/app/lab/page.tsx) |
| **Wave 15 — WASM / TS-OS Mini** | [`src/app/wasm/page.tsx`](src/app/wasm/page.tsx), [`src/lib/wasmTsOs.ts`](src/lib/wasmTsOs.ts) |

**How it behaves on the public site:** the browser only calls **same-origin** routes (`/api/boggers/status`, `/api/boggers/query`, …). The Next **server** forwards to FastAPI using **`BOGGERS_INTERNAL_URL`** and attaches **`BOGGERS_DASHBOARD_TOKEN`** — never exposed as `NEXT_PUBLIC_*`. Full diagrams, VPS setup, and production checklist: **[root README — How the website, Lab, and AI connect](../README.md#how-the-website-lab-and-ai-connect)**.

**Environment (local):** copy [`.env.example`](.env.example) to `.env.local`. Set `BOGGERS_INTERNAL_URL=http://127.0.0.1:8000` and `BOGGERS_DASHBOARD_TOKEN` if the backend uses a token.

**Docker (all-in-one):** compose sets `BOGGERS_INTERNAL_URL=http://backend:8000` for the frontend service.

**Split hosting (e.g. Vercel + API on a VPS):** set **`BOGGERS_INTERNAL_URL`** in the **frontend** environment to your API’s reachable base URL (HTTPS). The Python stack must still run with matching **`BOGGERS_DASHBOARD_TOKEN`** and appropriate **`BOGGERS_CORS_ORIGINS`** if anything calls FastAPI from the browser directly.

---

## Quick Start (standalone Node)

Requires **Node.js 18+** and **npm 9+**.

```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local — GITHUB_TOKEN, BOGGERS_INTERNAL_URL, BOGGERS_DASHBOARD_TOKEN

npm run dev
# → http://localhost:3000
```

## Build & Deploy

```bash
npm run build
npm run start
```

**BoggersTheAI-Dev production (recommended):** repo root **`docker compose`** — see [../README.md](../README.md) (VPS bootstrap, Caddy TLS, verification). The frontend image uses `output: standalone` in [`next.config.ts`](next.config.ts).

**Vercel / static-only frontend:** the Python backend and Ollama are **not** included. Point **`BOGGERS_INTERNAL_URL`** at your hosted API, or run the full stack on a VPS.

## Site “waves” (UI milestones)

Site structure waves (foundation, hero, lab, …) are separate from the **official** [boggersthefish.com](https://boggersthefish.com) roadmap waves (12–15). For roadmap status see the root README and [`src/lib/tsData.ts`](src/lib/tsData.ts) (`WAVE_LOG`).

## Tech Stack

- **Next.js 15** App Router + TypeScript
- **Tailwind CSS 3** — TS cyber-theme
- **Framer Motion**, **Zustand**, **shadcn/ui**, **lucide-react**
- **react-force-graph-2d**, **@octokit/rest**, **next-mdx-remote** (where used)

## TS Philosophy

```
while true:
  Propagate()
  Relax()
  if tension too high:
    Break()
    Evolve()
```

---

© 2026 BoggersTheFish. All nodes reserved.
