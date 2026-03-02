# Inertia.js + Encore.ts Integration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Inertia.js with React to an Encore.ts project, creating a minimal working example with two pages and client-side navigation.

**Architecture:** A new `frontend` Encore service uses `api.raw()` endpoints to implement the Inertia protocol (HTML on first visit, JSON on subsequent). A custom ~60-line adapter handles the protocol. Vite builds React/Inertia client code; `api.static()` serves the output.

**Tech Stack:** Encore.ts, Inertia.js v2, React 19, Vite 6, TypeScript

---

### Task 1: Install dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install runtime dependencies**

Run: `npm install @inertiajs/react react react-dom`

**Step 2: Install dev dependencies**

Run: `npm install -D @vitejs/plugin-react vite @types/react @types/react-dom`

**Step 3: Verify installation**

Run: `npm ls @inertiajs/react react vite`
Expected: All packages listed, no errors

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add Inertia.js, React, and Vite dependencies"
```

---

### Task 2: Configure Vite and TypeScript for React

**Files:**
- Create: `vite.config.ts`
- Modify: `tsconfig.json`

**Step 1: Create Vite config**

```ts
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    manifest: true,
    outDir: "frontend/dist",
    rollupOptions: {
      input: "frontend/src/app.tsx",
    },
  },
  server: {
    origin: "http://localhost:5173",
    cors: {
      origin: "http://localhost:4000",
    },
  },
});
```

**Step 2: Add JSX support to tsconfig.json**

Add `"jsx": "react-jsx"` to `compilerOptions`. This enables TypeScript to understand JSX syntax for both IDE support and type checking.

**Step 3: Commit**

```bash
git add vite.config.ts tsconfig.json
git commit -m "chore: configure Vite and TypeScript for React/JSX"
```

---

### Task 3: Create the frontend Encore service

**Files:**
- Create: `frontend/encore.service.ts`

**Step 1: Create the service definition**

```ts
// frontend/encore.service.ts
import { Service } from "encore.dev/service";

export default new Service("frontend");
```

**Step 2: Commit**

```bash
git add frontend/encore.service.ts
git commit -m "feat: add frontend Encore service"
```

---

### Task 4: Create the Inertia protocol adapter

This is the core piece — a `render()` function that implements the Inertia server protocol.

**Files:**
- Create: `frontend/inertia.ts`
- Create: `frontend/inertia.test.ts`

**Step 1: Write the test**

```ts
// frontend/inertia.test.ts
import { describe, it, expect, vi } from "vitest";
import { createPageObject, getViteAssetTags } from "./inertia";

describe("createPageObject", () => {
  it("creates a page object with component, props, url, and version", () => {
    const page = createPageObject("Home", { greeting: "Hello" }, "/");
    expect(page).toEqual({
      component: "Home",
      props: { greeting: "Hello" },
      url: "/",
      version: "1.0",
    });
  });
});

describe("getViteAssetTags", () => {
  it("returns dev server script tags when manifest is not found", () => {
    const tags = getViteAssetTags();
    expect(tags).toContain("localhost:5173");
    expect(tags).toContain("@vite/client");
    expect(tags).toContain("frontend/src/app.tsx");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `encore test ./frontend/inertia.test.ts`
Expected: FAIL — functions not found

**Step 3: Write the Inertia adapter**

```ts
// frontend/inertia.ts
import { IncomingMessage, ServerResponse } from "node:http";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

interface PageObject {
  component: string;
  props: Record<string, unknown>;
  url: string;
  version: string;
}

interface ManifestChunk {
  file: string;
  css?: string[];
  isEntry?: boolean;
}

export function createPageObject(
  component: string,
  props: Record<string, unknown>,
  url: string,
): PageObject {
  return { component, props, url, version: "1.0" };
}

export function getViteAssetTags(): string {
  try {
    const manifestPath = resolve("frontend/dist/.vite/manifest.json");
    const manifest: Record<string, ManifestChunk> = JSON.parse(
      readFileSync(manifestPath, "utf-8"),
    );
    const entry = manifest["frontend/src/app.tsx"];
    if (!entry) throw new Error("Entry not found in manifest");

    let tags = `<script type="module" src="/${entry.file}"></script>`;
    if (entry.css) {
      for (const cssFile of entry.css) {
        tags += `\n    <link rel="stylesheet" href="/${cssFile}">`;
      }
    }
    return tags;
  } catch {
    return [
      '<script type="module" src="http://localhost:5173/@vite/client"></script>',
      '<script type="module" src="http://localhost:5173/frontend/src/app.tsx"></script>',
    ].join("\n    ");
  }
}

function renderHtml(page: PageObject): string {
  const pageJson = JSON.stringify(page).replace(/'/g, "&#039;");
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Encore + Inertia</title>
    ${getViteAssetTags()}
</head>
<body>
    <div id="app" data-page='${pageJson}'></div>
</body>
</html>`;
}

export function render(
  req: IncomingMessage,
  res: ServerResponse,
  component: string,
  props: Record<string, unknown> = {},
): void {
  const url = req.url ?? "/";
  const page = createPageObject(component, props, url);

  if (req.headers["x-inertia"]) {
    res.writeHead(200, {
      "Content-Type": "application/json",
      "X-Inertia": "true",
      Vary: "X-Inertia",
    });
    res.end(JSON.stringify(page));
    return;
  }

  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(renderHtml(page));
}
```

**Step 4: Run test to verify it passes**

Run: `encore test ./frontend/inertia.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/inertia.ts frontend/inertia.test.ts
git commit -m "feat: add minimal Inertia protocol adapter"
```

---

### Task 5: Create the React client entry and page components

**Files:**
- Create: `frontend/src/app.tsx`
- Create: `frontend/src/pages/Home.tsx`
- Create: `frontend/src/pages/About.tsx`

**Step 1: Create the Inertia client bootstrap**

```tsx
// frontend/src/app.tsx
import { createInertiaApp } from "@inertiajs/react";
import { createRoot } from "react-dom/client";

createInertiaApp({
  resolve: (name) => {
    const pages = import.meta.glob("./pages/**/*.tsx", { eager: true });
    const page = pages[`./pages/${name}.tsx`];
    if (!page) throw new Error(`Page not found: ${name}`);
    return page;
  },
  setup({ el, App, props }) {
    createRoot(el).render(<App {...props} />);
  },
});
```

**Step 2: Create the Home page**

```tsx
// frontend/src/pages/Home.tsx
import { Link } from "@inertiajs/react";

interface HomeProps {
  greeting: string;
}

export default function Home({ greeting }: HomeProps) {
  return (
    <div>
      <h1>{greeting}</h1>
      <p>This page is rendered with Inertia.js + Encore.ts</p>
      <Link href="/about">Go to About</Link>
    </div>
  );
}
```

**Step 3: Create the About page**

```tsx
// frontend/src/pages/About.tsx
import { Link } from "@inertiajs/react";

export default function About() {
  return (
    <div>
      <h1>About</h1>
      <p>This is a bare minimum Inertia.js + Encore.ts example.</p>
      <Link href="/">Back to Home</Link>
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add frontend/src/
git commit -m "feat: add React entry point and Inertia page components"
```

---

### Task 6: Create page route endpoints and static asset serving

**Files:**
- Create: `frontend/pages.ts`
- Create: `frontend/static.ts`

**Step 1: Create page route endpoints**

```ts
// frontend/pages.ts
import { api } from "encore.dev/api";
import { render } from "./inertia";

export const home = api.raw(
  { expose: true, method: "GET", path: "/" },
  async (req, res) => {
    render(req, res, "Home", { greeting: "Welcome to Encore + Inertia!" });
  },
);

export const about = api.raw(
  { expose: true, method: "GET", path: "/about" },
  async (req, res) => {
    render(req, res, "About");
  },
);
```

**Step 2: Create static asset endpoint for production builds**

```ts
// frontend/static.ts
import { api } from "encore.dev/api";

export const assets = api.static({
  expose: true,
  path: "/assets/*path",
  dir: "./dist/assets",
});
```

**Step 3: Commit**

```bash
git add frontend/pages.ts frontend/static.ts
git commit -m "feat: add Inertia page routes and static asset endpoint"
```

---

### Task 7: Update .gitignore and add dev script

**Files:**
- Modify: `.gitignore`
- Modify: `package.json`

**Step 1: Add Vite build output to .gitignore**

Append to `.gitignore`:
```
frontend/dist/
```

**Step 2: Add dev script to package.json**

Add to `scripts`:
```json
"dev:frontend": "vite dev"
```

**Step 3: Commit**

```bash
git add .gitignore package.json
git commit -m "chore: add gitignore for Vite output and dev script"
```

---

### Task 8: Manual smoke test

**Step 1: Start Vite dev server**

Run (in background): `npx vite dev`
Expected: Vite dev server starts on http://localhost:5173

**Step 2: Start Encore**

Run: `encore run`
Expected: Encore starts, frontend service registered

**Step 3: Test in browser**

Open: `http://localhost:4000/`
Expected:
- Page loads with "Welcome to Encore + Inertia!"
- "Go to About" link visible
- Click link → navigates to /about without full page reload (Inertia SPA navigation)
- "Back to Home" link works

**Step 4: Test Inertia protocol directly**

Run: `curl -H "X-Inertia: true" http://localhost:4000/`
Expected: JSON response with `{"component":"Home","props":{"greeting":"Welcome to Encore + Inertia!"},"url":"/","version":"1.0"}`

**Step 5: Commit any fixes, then final commit**

```bash
git add -A
git commit -m "feat: complete Inertia.js + Encore.ts integration"
```
