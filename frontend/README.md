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

**Environment (local):** copy [`.env.example`](.env.example) to `.env.local`. Set `BOGGERS_INTERNAL_URL=http://127.0.0.1:8000` and `BOGGERS_DASHBOARD_TOKEN` if the backend uses a token.

**Docker:** compose sets `BOGGERS_INTERNAL_URL=http://backend:8000` — no token in the browser bundle.

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

**BoggersTheAI-Dev production:** use the repo root `docker compose` (see [../README.md](../README.md)); the frontend image uses `output: standalone` in [`next.config.ts`](next.config.ts).

Vercel-only deploys do not include the Python backend unless you host API separately.

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
