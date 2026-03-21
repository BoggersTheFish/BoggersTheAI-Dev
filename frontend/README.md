# BoggersTheFish — Thinking System / Thinking Wave

> *This site is not "about" TS — it IS a running instance of TS.*

Live at [boggersthefish.com](https://boggersthefish.com) · Wave 12 — Pages Island LIVE · March 21, 2026

---

## Quick Start

Requires **Node.js 18+** and **npm 9+**.

```bash
# Install Node.js first if needed:
# https://nodejs.org/en/download

# Clone or enter the project
cd boggersthefish-site

# Install dependencies
npm install

# Copy env vars
cp .env.example .env.local
# Edit .env.local and add your GITHUB_TOKEN

# Run dev server
npm run dev
# → http://localhost:3000
```

## Build & Deploy

```bash
npm run build    # Production build
npm run start    # Start production server

# Deploy to Vercel (one command):
npx vercel --prod
```

## Wave Structure

The site is built in modular "waves" mirroring the TS-OS evolution cycle:

| Wave | Status | Description |
|------|--------|-------------|
| **1 — Foundation** | ✅ Complete | Next.js 15, Tailwind, Zustand wave store, Nav/Footer, Hero |
| **2 — Graph Hero** | 🔜 Next | Cytoscape.js / react-force-graph interactive hero |
| **3 — About** | 🔜 Pending | Creator story, Minecraft → TS arc |
| **4 — TS-OS Deep Dive** | 🔜 Pending | Full interactive wave cycle docs |
| **5 — Projects** | 🔜 Pending | GitHub API repo grid |
| **6 — Lab** | 🔜 Pending | Live demo, mini-simulator |
| **7 — Waves Log** | 🔜 Pending | MDX blog / progress log |
| **8 — Network** | 🔜 Pending | Force graph of all links |
| **9 — Polish** | 🔜 Pending | GSAP scroll effects, SEO, a11y |

## Tech Stack

- **Next.js 15** App Router + TypeScript
- **Tailwind CSS 3** with custom TS cyber-theme
- **Framer Motion** — scroll + activation animations
- **Zustand** — global wave cycle state
- **shadcn/ui** — base UI components
- **lucide-react** — icons
- **react-force-graph-2d** (Wave 2)
- **@octokit/rest** — GitHub API (Wave 5)
- **next-mdx-remote** — blog/waves log (Wave 7)

## TS Philosophy

```
while true:
  Propagate()  // wave spreads activation (topological + semantic cosine)
  Relax()      // decay toward base_strength
  if tension too high:
    Break()    // collapse weakest patterns
    Evolve()   // spawn higher-stability nodes
```

Everything that exists = stable clusters of constraints (nodes + edges). Change = wave propagation. Truth = the most stable configuration the constraints allow.

---

© 2026 BoggersTheFish. All nodes reserved.
