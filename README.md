# UtilityHub — Free Browser-Based Image Tools

A fast, extensible utility tools website. All processing runs in the browser — no server uploads.

## Tech Stack

- **Next.js 14** (App Router)
- **Tailwind CSS** (custom design system)
- **@imgly/background-removal** (WASM-based AI bg removal)
- **browser-image-compression** (client-side compression)
- **react-filerobot-image-editor** (full image editor — optional)

---

## Setup

### 1. Prerequisites
- Node.js 18+ installed
- npm or yarn

### 2. Install dependencies
```bash
cd utility-hub
npm install
```

### 3. Run development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

### 4. Build for production
```bash
npm run build
npm start
```

### 5. Deploy to Vercel (recommended)
```bash
npm install -g vercel
vercel
```

### 6. Production deployment checklist (Vercel)

Before your first production deploy, confirm:

1. **Node.js version is 18+** (Vercel Project → Settings → General → Node.js Version).
2. **Build command** is `npm run build`.
3. **Install command** is `npm ci` (reproducible install from lockfile).
4. **Output settings** use Next.js framework defaults.
5. If you use a custom domain, set it in Vercel Project → **Domains**.
6. Redeploy after any dependency updates to keep serverless bundles in sync.

This repo includes a `vercel.json` with sane defaults for build/install and a Next.js framework hint.

### Background remover deployment fix (important)

If background removal fails in production, add this env var in Vercel:

`NEXT_PUBLIC_BG_MODEL_PATH=https://cdn.jsdelivr.net/npm/@imgly/background-removal-data@1.7.0/dist/`

You can also host the model files yourself and point this var to your own public path.

---

## Adding a New Tool

This takes **3 steps** and touches **2 files**:

### Step 1 — Create tool folder
```
src/tools/your-tool-name/
├── meta.js    ← tool metadata
└── Tool.jsx   ← React component
```

### Step 2 — Write meta.js
```js
const myToolMeta = {
  id: "your-tool-name",
  name: "Your Tool Name",
  tagline: "Short one-liner",
  description: "Longer description shown on tool page",
  icon: "⊕",
  tags: ["image", "convert"],   // used for filtering
  status: "new",                // "new" | "popular" | "beta" | null
  path: "/tools/your-tool-name",
};

export default myToolMeta;
```

### Step 3 — Register in two places

**src/registry.js** — add import + array entry:
```js
import myToolMeta from "./tools/your-tool-name/meta";

export const tools = [bgRemoverMeta, imageResizeMeta, myToolMeta];  // add here
```

**src/app/tools/[toolId]/page.jsx** — add to toolComponents map:
```js
const toolComponents = {
  "bg-remover": () => import("@/tools/bg-remover/Tool"),
  "image-resize": () => import("@/tools/image-resize/Tool"),
  "your-tool-name": () => import("@/tools/your-tool-name/Tool"),  // add here
};
```

That's it. The homepage, routing, and metadata are all auto-generated.

---

## Project Structure

```
src/
├── app/
│   ├── layout.jsx          Root layout + fonts
│   ├── page.jsx            Homepage
│   ├── globals.css         Design system + base styles
│   └── tools/[toolId]/
│       └── page.jsx        Dynamic tool page
├── components/
│   ├── Navbar.jsx
│   ├── ToolCard.jsx        Browser-chrome card component
│   └── Footer.jsx
├── registry.js             Central tool manifest ← EDIT THIS to add tools
└── tools/
    ├── bg-remover/
    │   ├── meta.js
    │   └── Tool.jsx
    └── image-resize/
        ├── meta.js
        └── Tool.jsx
```

---

## Design System

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#F2F0EB` | Page background |
| `--ink` | `#0A0A0A` | Primary text |
| `--accent` | `#FF3800` | Highlights, CTAs |
| `--muted` | `#9B9789` | Secondary text |
| `--card` | `#E8E5DE` | Card backgrounds |
| `--border`| `#C8C4BB` | Borders |

Fonts: **Syne** (display/headings) + **DM Sans** (body) + **DM Mono** (labels/code)
