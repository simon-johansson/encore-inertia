# encore-inertia Library Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract the Inertia adapter from `frontend/inertia.ts` into a reusable npm package at `packages/encore-inertia/` with configurable options and a React client helper.

**Architecture:** Factory function (`createInertiaAdapter`) accepts a config object and returns `{ render, getAssetTags }`. The main entrypoint uses only Node.js built-ins. A separate `/react` subpath provides a `mountInertiaApp` helper wrapping `@inertiajs/react`. Built with tsup for ESM + declarations.

**Tech Stack:** TypeScript, tsup (build), vitest (tests), Node.js built-ins (fs, path, http)

---

### Task 1: Scaffold package structure

**Files:**
- Create: `packages/encore-inertia/package.json`
- Create: `packages/encore-inertia/tsconfig.json`
- Create: `packages/encore-inertia/tsup.config.ts`

**Step 1: Create package.json**

```json
{
  "name": "encore-inertia",
  "version": "0.1.0",
  "description": "Inertia.js adapter for Encore.ts applications",
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./react": {
      "import": "./dist/react.js",
      "types": "./dist/react.d.ts"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "peerDependencies": {
    "react": ">=18",
    "react-dom": ">=18",
    "@inertiajs/react": ">=2"
  },
  "peerDependenciesMeta": {
    "react": { "optional": true },
    "react-dom": { "optional": true },
    "@inertiajs/react": { "optional": true }
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.2.0",
    "vitest": "^1.5.0",
    "@types/node": "^20.5.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@inertiajs/react": "^2.3.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "license": "MPL-2.0"
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "lib": ["ES2022", "DOM"],
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "declaration": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "dist",
    "rootDir": "src",
    "types": ["node"]
  },
  "include": ["src"]
}
```

**Step 3: Create tsup.config.ts**

```ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    react: "src/react.ts",
  },
  format: ["esm"],
  dts: true,
  clean: true,
  target: "es2022",
});
```

**Step 4: Install dependencies**

Run: `cd packages/encore-inertia && npm install`

**Step 5: Commit**

```bash
git add packages/encore-inertia/package.json packages/encore-inertia/tsconfig.json packages/encore-inertia/tsup.config.ts packages/encore-inertia/package-lock.json
git commit -m "chore: scaffold encore-inertia package structure"
```

---

### Task 2: Types module

**Files:**
- Create: `packages/encore-inertia/src/types.ts`

**Step 1: Write types.ts**

All shared interfaces live here. This is the single source of truth for the library's type surface.

```ts
import type { IncomingMessage, ServerResponse } from "node:http";

export interface PageObject {
  component: string;
  props: Record<string, unknown>;
  url: string;
  version: string;
}

export interface InertiaConfig {
  /** Key in the Vite manifest matching your entry file (e.g. "frontend/src/app.tsx") */
  viteEntry: string;

  /** HTML document title. Default: "Encore App" */
  title?: string;

  /** Path to Vite manifest.json relative to cwd. Default: "frontend/dist/.vite/manifest.json" */
  manifestPath?: string;

  /** Vite dev server URL for HMR. Default: "http://localhost:5173" */
  devServerUrl?: string;

  /** Root element ID for the Inertia mount point. Default: "app" */
  rootId?: string;

  /** HTML lang attribute. Default: "en" */
  lang?: string;

  /** Inertia protocol version string. Default: "1.0" */
  version?: string;

  /** Extra HTML to inject into <head> (e.g. meta tags, fonts). Default: "" */
  head?: string;

  /** Full custom HTML template. Overrides title/lang/head/rootId when provided. */
  renderHtml?: (page: PageObject, assetTags: string) => string;
}

export interface InertiaAdapter {
  /** Render an Inertia response. Full HTML on first visit, JSON on X-Inertia requests. */
  render(
    req: IncomingMessage,
    res: ServerResponse,
    component: string,
    props?: Record<string, unknown>,
  ): void;

  /** Get Vite asset tags string (<script> and <link> tags). */
  getAssetTags(): string;
}

export interface ManifestChunk {
  file: string;
  css?: string[];
  isEntry?: boolean;
}

export interface MountInertiaAppConfig {
  /** Result of import.meta.glob("./pages/**/*.tsx", { eager: true }) */
  pages: Record<string, unknown>;

  /** Root element ID. Default: "app" */
  rootId?: string;
}
```

**Step 2: Commit**

```bash
git add packages/encore-inertia/src/types.ts
git commit -m "feat: add type definitions for encore-inertia"
```

---

### Task 3: Vite asset tags module (TDD)

**Files:**
- Create: `packages/encore-inertia/tests/vite.test.ts`
- Create: `packages/encore-inertia/src/vite.ts`

**Step 1: Write the failing tests**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAssetTagsResolver } from "../src/vite.js";
import * as fs from "node:fs";

vi.mock("node:fs", () => ({
  readFileSync: vi.fn(),
}));

describe("createAssetTagsResolver", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns dev server tags when manifest is not found", () => {
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      throw new Error("ENOENT");
    });

    const getAssetTags = createAssetTagsResolver({
      viteEntry: "frontend/src/app.tsx",
      devServerUrl: "http://localhost:5173",
      manifestPath: "frontend/dist/.vite/manifest.json",
    });

    const tags = getAssetTags();
    expect(tags).toContain("http://localhost:5173/@vite/client");
    expect(tags).toContain("http://localhost:5173/frontend/src/app.tsx");
  });

  it("returns production tags from manifest", () => {
    const manifest = {
      "frontend/src/app.tsx": {
        file: "assets/app-abc123.js",
        css: ["assets/app-abc123.css"],
        isEntry: true,
      },
    };
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(manifest));

    const getAssetTags = createAssetTagsResolver({
      viteEntry: "frontend/src/app.tsx",
      devServerUrl: "http://localhost:5173",
      manifestPath: "frontend/dist/.vite/manifest.json",
    });

    const tags = getAssetTags();
    expect(tags).toContain('src="/assets/app-abc123.js"');
    expect(tags).toContain('href="/assets/app-abc123.css"');
    expect(tags).not.toContain("localhost:5173");
  });

  it("returns production tags without CSS when entry has no CSS", () => {
    const manifest = {
      "frontend/src/app.tsx": {
        file: "assets/app-abc123.js",
        isEntry: true,
      },
    };
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(manifest));

    const getAssetTags = createAssetTagsResolver({
      viteEntry: "frontend/src/app.tsx",
      devServerUrl: "http://localhost:5173",
      manifestPath: "frontend/dist/.vite/manifest.json",
    });

    const tags = getAssetTags();
    expect(tags).toContain('src="/assets/app-abc123.js"');
    expect(tags).not.toContain("<link");
  });

  it("falls back to dev tags when entry key is missing from manifest", () => {
    const manifest = {
      "other/entry.tsx": { file: "assets/other.js", isEntry: true },
    };
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(manifest));

    const getAssetTags = createAssetTagsResolver({
      viteEntry: "frontend/src/app.tsx",
      devServerUrl: "http://localhost:5173",
      manifestPath: "frontend/dist/.vite/manifest.json",
    });

    const tags = getAssetTags();
    expect(tags).toContain("localhost:5173");
  });

  it("uses custom devServerUrl", () => {
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      throw new Error("ENOENT");
    });

    const getAssetTags = createAssetTagsResolver({
      viteEntry: "src/main.tsx",
      devServerUrl: "http://localhost:3000",
      manifestPath: "dist/.vite/manifest.json",
    });

    const tags = getAssetTags();
    expect(tags).toContain("http://localhost:3000/@vite/client");
    expect(tags).toContain("http://localhost:3000/src/main.tsx");
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd packages/encore-inertia && npx vitest run tests/vite.test.ts`
Expected: FAIL — `createAssetTagsResolver` not found

**Step 3: Write the implementation**

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ManifestChunk } from "./types.js";

interface AssetTagsOptions {
  viteEntry: string;
  devServerUrl: string;
  manifestPath: string;
}

export function createAssetTagsResolver(options: AssetTagsOptions): () => string {
  const { viteEntry, devServerUrl, manifestPath } = options;

  return function getAssetTags(): string {
    try {
      const fullPath = resolve(manifestPath);
      const manifest: Record<string, ManifestChunk> = JSON.parse(
        readFileSync(fullPath, "utf-8"),
      );
      const entry = manifest[viteEntry];
      if (!entry) throw new Error(`Entry "${viteEntry}" not found in manifest`);

      let tags = `<script type="module" src="/${entry.file}"></script>`;
      if (entry.css) {
        for (const cssFile of entry.css) {
          tags += `\n    <link rel="stylesheet" href="/${cssFile}">`;
        }
      }
      return tags;
    } catch {
      return [
        `<script type="module" src="${devServerUrl}/@vite/client"></script>`,
        `<script type="module" src="${devServerUrl}/${viteEntry}"></script>`,
      ].join("\n    ");
    }
  };
}
```

**Step 4: Run tests to verify they pass**

Run: `cd packages/encore-inertia && npx vitest run tests/vite.test.ts`
Expected: All 5 tests PASS

**Step 5: Commit**

```bash
git add packages/encore-inertia/src/vite.ts packages/encore-inertia/tests/vite.test.ts
git commit -m "feat: add Vite asset tags resolver with dev/prod support"
```

---

### Task 4: HTML template module (TDD)

**Files:**
- Create: `packages/encore-inertia/tests/html.test.ts`
- Create: `packages/encore-inertia/src/html.ts`

**Step 1: Write the failing tests**

```ts
import { describe, it, expect } from "vitest";
import { createHtmlRenderer } from "../src/html.js";
import type { PageObject } from "../src/types.js";

const testPage: PageObject = {
  component: "Home",
  props: { greeting: "Hello" },
  url: "/",
  version: "1.0",
};

describe("createHtmlRenderer", () => {
  it("renders HTML with default config", () => {
    const renderHtml = createHtmlRenderer({});
    const html = renderHtml(testPage, '<script type="module" src="/app.js"></script>');

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain('<html lang="en">');
    expect(html).toContain("<title>Encore App</title>");
    expect(html).toContain('<div id="app"');
    expect(html).toContain("data-page=");
    expect(html).toContain('/app.js');
  });

  it("uses custom title", () => {
    const renderHtml = createHtmlRenderer({ title: "My App" });
    const html = renderHtml(testPage, "");

    expect(html).toContain("<title>My App</title>");
  });

  it("uses custom lang", () => {
    const renderHtml = createHtmlRenderer({ lang: "fr" });
    const html = renderHtml(testPage, "");

    expect(html).toContain('<html lang="fr">');
  });

  it("uses custom rootId", () => {
    const renderHtml = createHtmlRenderer({ rootId: "root" });
    const html = renderHtml(testPage, "");

    expect(html).toContain('<div id="root"');
  });

  it("injects extra head content", () => {
    const renderHtml = createHtmlRenderer({
      head: '<link rel="icon" href="/favicon.ico">',
    });
    const html = renderHtml(testPage, "");

    expect(html).toContain('<link rel="icon" href="/favicon.ico">');
  });

  it("escapes single quotes in page JSON", () => {
    const page: PageObject = {
      component: "Home",
      props: { msg: "it's working" },
      url: "/",
      version: "1.0",
    };
    const renderHtml = createHtmlRenderer({});
    const html = renderHtml(page, "");

    expect(html).toContain("&#039;");
    expect(html).not.toMatch(/data-page='[^']*'[^']*'/);
  });

  it("uses custom renderHtml when provided", () => {
    const custom = (page: PageObject, assetTags: string) =>
      `<custom>${page.component}|${assetTags}</custom>`;
    const renderHtml = createHtmlRenderer({ renderHtml: custom });
    const html = renderHtml(testPage, "<script></script>");

    expect(html).toBe("<custom>Home|<script></script></custom>");
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd packages/encore-inertia && npx vitest run tests/html.test.ts`
Expected: FAIL — `createHtmlRenderer` not found

**Step 3: Write the implementation**

```ts
import type { PageObject } from "./types.js";

interface HtmlRendererOptions {
  title?: string;
  lang?: string;
  rootId?: string;
  head?: string;
  renderHtml?: (page: PageObject, assetTags: string) => string;
}

export function createHtmlRenderer(
  options: HtmlRendererOptions,
): (page: PageObject, assetTags: string) => string {
  if (options.renderHtml) {
    return options.renderHtml;
  }

  const title = options.title ?? "Encore App";
  const lang = options.lang ?? "en";
  const rootId = options.rootId ?? "app";
  const head = options.head ?? "";

  return function renderHtml(page: PageObject, assetTags: string): string {
    const pageJson = JSON.stringify(page).replace(/'/g, "&#039;");
    return `<!DOCTYPE html>
<html lang="${lang}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    ${assetTags}
    ${head}
</head>
<body>
    <div id="${rootId}" data-page='${pageJson}'></div>
</body>
</html>`;
  };
}
```

**Step 4: Run tests to verify they pass**

Run: `cd packages/encore-inertia && npx vitest run tests/html.test.ts`
Expected: All 7 tests PASS

**Step 5: Commit**

```bash
git add packages/encore-inertia/src/html.ts packages/encore-inertia/tests/html.test.ts
git commit -m "feat: add configurable HTML template renderer"
```

---

### Task 5: Main adapter factory (TDD)

**Files:**
- Create: `packages/encore-inertia/tests/adapter.test.ts`
- Create: `packages/encore-inertia/src/index.ts`

**Step 1: Write the failing tests**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createInertiaAdapter } from "../src/index.js";
import type { IncomingMessage, ServerResponse } from "node:http";
import * as fs from "node:fs";

vi.mock("node:fs", () => ({
  readFileSync: vi.fn(() => {
    throw new Error("ENOENT");
  }),
}));

function createMockReq(overrides: Partial<IncomingMessage> = {}): IncomingMessage {
  return {
    url: "/",
    headers: {},
    ...overrides,
  } as IncomingMessage;
}

function createMockRes(): ServerResponse & { _status: number; _headers: Record<string, string>; _body: string } {
  const res = {
    _status: 0,
    _headers: {} as Record<string, string>,
    _body: "",
    writeHead(status: number, headers: Record<string, string>) {
      res._status = status;
      Object.assign(res._headers, headers);
    },
    end(body: string) {
      res._body = body;
    },
  };
  return res as any;
}

describe("createInertiaAdapter", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns an object with render and getAssetTags", () => {
    const inertia = createInertiaAdapter({ viteEntry: "src/app.tsx" });
    expect(inertia).toHaveProperty("render");
    expect(inertia).toHaveProperty("getAssetTags");
    expect(typeof inertia.render).toBe("function");
    expect(typeof inertia.getAssetTags).toBe("function");
  });

  it("render returns full HTML on first visit (no X-Inertia header)", () => {
    const inertia = createInertiaAdapter({ viteEntry: "src/app.tsx" });
    const req = createMockReq();
    const res = createMockRes();

    inertia.render(req, res, "Home", { greeting: "Hello" });

    expect(res._status).toBe(200);
    expect(res._headers["Content-Type"]).toBe("text/html");
    expect(res._body).toContain("<!DOCTYPE html>");
    expect(res._body).toContain('"component":"Home"');
    expect(res._body).toContain('"greeting":"Hello"');
  });

  it("render returns JSON on Inertia navigation (X-Inertia header present)", () => {
    const inertia = createInertiaAdapter({ viteEntry: "src/app.tsx" });
    const req = createMockReq({ headers: { "x-inertia": "true" } });
    const res = createMockRes();

    inertia.render(req, res, "About");

    expect(res._status).toBe(200);
    expect(res._headers["Content-Type"]).toBe("application/json");
    expect(res._headers["X-Inertia"]).toBe("true");
    expect(res._headers["Vary"]).toBe("X-Inertia");

    const body = JSON.parse(res._body);
    expect(body.component).toBe("About");
    expect(body.url).toBe("/");
    expect(body.version).toBe("1.0");
  });

  it("uses custom version from config", () => {
    const inertia = createInertiaAdapter({ viteEntry: "src/app.tsx", version: "2.0" });
    const req = createMockReq({ headers: { "x-inertia": "true" } });
    const res = createMockRes();

    inertia.render(req, res, "Home");

    const body = JSON.parse(res._body);
    expect(body.version).toBe("2.0");
  });

  it("uses req.url in page object", () => {
    const inertia = createInertiaAdapter({ viteEntry: "src/app.tsx" });
    const req = createMockReq({ url: "/about?foo=bar", headers: { "x-inertia": "true" } });
    const res = createMockRes();

    inertia.render(req, res, "About");

    const body = JSON.parse(res._body);
    expect(body.url).toBe("/about?foo=bar");
  });

  it("defaults props to empty object", () => {
    const inertia = createInertiaAdapter({ viteEntry: "src/app.tsx" });
    const req = createMockReq({ headers: { "x-inertia": "true" } });
    const res = createMockRes();

    inertia.render(req, res, "Home");

    const body = JSON.parse(res._body);
    expect(body.props).toEqual({});
  });

  it("uses custom title in HTML", () => {
    const inertia = createInertiaAdapter({ viteEntry: "src/app.tsx", title: "My App" });
    const req = createMockReq();
    const res = createMockRes();

    inertia.render(req, res, "Home");

    expect(res._body).toContain("<title>My App</title>");
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd packages/encore-inertia && npx vitest run tests/adapter.test.ts`
Expected: FAIL — `createInertiaAdapter` not found

**Step 3: Write the implementation**

```ts
import type { IncomingMessage, ServerResponse } from "node:http";
import type { InertiaAdapter, InertiaConfig, PageObject } from "./types.js";
import { createAssetTagsResolver } from "./vite.js";
import { createHtmlRenderer } from "./html.js";

export type { InertiaAdapter, InertiaConfig, PageObject, MountInertiaAppConfig } from "./types.js";

export function createInertiaAdapter(config: InertiaConfig): InertiaAdapter {
  const version = config.version ?? "1.0";

  const getAssetTags = createAssetTagsResolver({
    viteEntry: config.viteEntry,
    devServerUrl: config.devServerUrl ?? "http://localhost:5173",
    manifestPath: config.manifestPath ?? "frontend/dist/.vite/manifest.json",
  });

  const renderHtml = createHtmlRenderer({
    title: config.title,
    lang: config.lang,
    rootId: config.rootId,
    head: config.head,
    renderHtml: config.renderHtml,
  });

  function render(
    req: IncomingMessage,
    res: ServerResponse,
    component: string,
    props: Record<string, unknown> = {},
  ): void {
    const url = req.url ?? "/";
    const page: PageObject = { component, props, url, version };

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
    res.end(renderHtml(page, getAssetTags()));
  }

  return { render, getAssetTags };
}
```

**Step 4: Run all tests to verify they pass**

Run: `cd packages/encore-inertia && npx vitest run`
Expected: All tests PASS (vite + html + adapter)

**Step 5: Commit**

```bash
git add packages/encore-inertia/src/index.ts packages/encore-inertia/tests/adapter.test.ts
git commit -m "feat: add createInertiaAdapter factory with render and getAssetTags"
```

---

### Task 6: React client helper

**Files:**
- Create: `packages/encore-inertia/src/react.ts`

**Step 1: Write the implementation**

Note: This module depends on browser APIs (`document`) and `@inertiajs/react`, making it impractical to unit test in Node.js. It's a thin wrapper around `createInertiaApp` — the logic is minimal.

```ts
import { createInertiaApp } from "@inertiajs/react";
import { createRoot } from "react-dom/client";
import type { MountInertiaAppConfig } from "./types.js";

export type { MountInertiaAppConfig } from "./types.js";

export function mountInertiaApp(config: MountInertiaAppConfig): void {
  const { pages, rootId = "app" } = config;

  createInertiaApp({
    resolve: (name) => {
      const key = Object.keys(pages).find((k) => k.includes(`/${name}.`));
      if (!key) throw new Error(`Page not found: ${name}`);
      return pages[key] as any;
    },
    setup({ el, App, props }) {
      createRoot(el).render(<App {...props} />);
    },
  });
}
```

**Step 2: Commit**

```bash
git add packages/encore-inertia/src/react.ts
git commit -m "feat: add mountInertiaApp React client helper"
```

---

### Task 7: Build and verify

**Step 1: Build the package**

Run: `cd packages/encore-inertia && npx tsup`
Expected: Builds successfully, generates `dist/index.js`, `dist/index.d.ts`, `dist/react.js`, `dist/react.d.ts`

**Step 2: Verify dist files exist**

Run: `ls packages/encore-inertia/dist/`
Expected: `index.js`, `index.d.ts`, `react.js`, `react.d.ts` (plus `.d.mts` variants)

**Step 3: Add dist to .gitignore**

Add to `packages/encore-inertia/.gitignore`:
```
dist/
node_modules/
```

**Step 4: Commit**

```bash
git add packages/encore-inertia/.gitignore
git commit -m "chore: add .gitignore for encore-inertia package"
```

---

### Task 8: Update example app to use the library

**Files:**
- Create: `frontend/inertia-setup.ts`
- Modify: `frontend/pages.ts`
- Modify: `frontend/src/app.tsx`
- Delete: `frontend/inertia.ts` (after migration)
- Delete: `frontend/inertia.test.ts` (tests now in packages/)

**Step 1: Install the library from local path**

Run (from repo root): `npm install ./packages/encore-inertia`

**Step 2: Create inertia-setup.ts**

Create `frontend/inertia-setup.ts`:
```ts
import { createInertiaAdapter } from "encore-inertia";

export const inertia = createInertiaAdapter({
  viteEntry: "frontend/src/app.tsx",
  title: "Encore + Inertia",
});
```

**Step 3: Update pages.ts**

Replace `frontend/pages.ts`:
```ts
import { api } from "encore.dev/api";
import { inertia } from "./inertia-setup";

export const home = api.raw(
  { expose: true, method: "GET", path: "/" },
  async (req, res) => {
    inertia.render(req, res, "Home", { greeting: "Welcome to Encore + Inertia!" });
  },
);

export const about = api.raw(
  { expose: true, method: "GET", path: "/about" },
  async (req, res) => {
    inertia.render(req, res, "About");
  },
);
```

**Step 4: Update frontend/src/app.tsx**

Replace `frontend/src/app.tsx`:
```tsx
import { mountInertiaApp } from "encore-inertia/react";

mountInertiaApp({
  pages: import.meta.glob("./pages/**/*.tsx", { eager: true }),
});
```

**Step 5: Delete old files**

Delete `frontend/inertia.ts` and `frontend/inertia.test.ts`.

**Step 6: Run the library tests**

Run: `cd packages/encore-inertia && npx vitest run`
Expected: All tests PASS

**Step 7: Commit**

```bash
git add frontend/inertia-setup.ts frontend/pages.ts frontend/src/app.tsx package.json package-lock.json
git rm frontend/inertia.ts frontend/inertia.test.ts
git commit -m "refactor: migrate example app to use encore-inertia library"
```
