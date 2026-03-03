# encore-inertia

Inertia.js adapter for [Encore.ts](https://encore.dev) applications. Build server-driven single-page apps with Encore.ts on the backend and React (via Inertia) on the frontend.

This library handles the [Inertia protocol](https://inertiajs.com/the-protocol) — full HTML responses on first visit, JSON responses on subsequent navigations — and integrates with Vite for asset loading in both development and production.

## Installation

```bash
npm install encore-inertia
```

For the React client helper, also install these peer dependencies:

```bash
npm install react react-dom @inertiajs/react
```

For Vite + React build tooling:

```bash
npm install -D vite @vitejs/plugin-react
```

## Quick Start

### 1. Create an Encore service

```ts
// frontend/encore.service.ts
import { Service } from "encore.dev/service";

export default new Service("frontend");
```

### 2. Configure the adapter

Create a setup file where you configure the Inertia adapter once:

```ts
// frontend/inertia-setup.ts
import { createInertiaAdapter } from "encore-inertia";

export const inertia = createInertiaAdapter({
  viteEntry: "frontend/src/app.tsx",
  title: "My App",
});
```

### 3. Define page routes

Use Encore's [raw endpoints](https://encore.dev/docs/ts/primitives/raw-endpoints) to serve Inertia pages:

```ts
// frontend/pages.ts
import { api } from "encore.dev/api";
import { inertia } from "./inertia-setup";

export const home = api.raw(
  { expose: true, method: "GET", path: "/" },
  async (req, res) => {
    inertia.render(req, res, "Home", { greeting: "Hello world!" });
  },
);

export const about = api.raw(
  { expose: true, method: "GET", path: "/about" },
  async (req, res) => {
    inertia.render(req, res, "About");
  },
);
```

### 4. Serve static assets

Serve Vite's build output using Encore's static asset support:

```ts
// frontend/static.ts
import { api } from "encore.dev/api";

export const assets = api.static({
  expose: true,
  path: "/assets/*path",
  dir: "./dist/assets",
});
```

### 5. Set up the React client

```tsx
// frontend/src/app.tsx
import { mountInertiaApp } from "encore-inertia/react";

mountInertiaApp({
  pages: import.meta.glob("./pages/**/*.tsx", { eager: true }),
});
```

### 6. Create page components

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
      <Link href="/about">About</Link>
    </div>
  );
}
```

```tsx
// frontend/src/pages/About.tsx
import { Link } from "@inertiajs/react";

export default function About() {
  return (
    <div>
      <h1>About</h1>
      <Link href="/">Home</Link>
    </div>
  );
}
```

### 7. Configure Vite

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

### 8. Add scripts to package.json

```json
{
  "scripts": {
    "build": "vite build",
    "dev:frontend": "vite dev"
  }
}
```

## Running

**Development** (with hot module replacement):

```bash
# Terminal 1: Start Encore backend
encore run

# Terminal 2: Start Vite dev server
npm run dev:frontend
```

The adapter automatically falls back to the Vite dev server when no production manifest is found.

**Production**:

```bash
# Build frontend assets
npm run build

# Start Encore
encore run
```

## Configuration

`createInertiaAdapter` accepts a config object:

```ts
const inertia = createInertiaAdapter({
  // Required: key in the Vite manifest matching your entry file
  viteEntry: "frontend/src/app.tsx",

  // Optional (shown with defaults)
  title: "Encore App",                                    // HTML <title>
  manifestPath: "frontend/dist/.vite/manifest.json",      // Vite manifest location
  devServerUrl: "http://localhost:5173",                   // Vite dev server URL
  rootId: "app",                                          // Mount point element ID
  lang: "en",                                             // HTML lang attribute
  version: "1.0",                                         // Inertia protocol version
  head: "",                                               // Extra HTML for <head>
});
```

### Custom HTML template

For full control over the HTML shell, provide a `renderHtml` function. When set, it overrides `title`, `lang`, `head`, and `rootId`:

```ts
const inertia = createInertiaAdapter({
  viteEntry: "frontend/src/app.tsx",
  renderHtml: (page, assetTags) => `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    ${assetTags}
</head>
<body>
    <div id="app" data-page='${JSON.stringify(page)}'></div>
</body>
</html>`,
});
```

The function receives:
- `page` — the Inertia [page object](https://inertiajs.com/the-protocol#the-page-object) (`{ component, props, url, version }`)
- `assetTags` — pre-built `<script>` and `<link>` tags from the Vite manifest

### React client options

```ts
mountInertiaApp({
  // Required: result of import.meta.glob with eager: true
  pages: import.meta.glob("./pages/**/*.tsx", { eager: true }),

  // Optional (shown with default)
  rootId: "app",  // Must match the rootId in your adapter config
});
```

## API Reference

### `createInertiaAdapter(config): InertiaAdapter`

Creates an adapter instance. Returns:

- **`render(req, res, component, props?)`** — Handles the Inertia protocol. On first visit (no `X-Inertia` header), responds with a full HTML page. On subsequent navigations, responds with a JSON page object.
- **`getAssetTags()`** — Returns the `<script>` and `<link>` tags string. In production, reads from the Vite manifest. In development, points to the Vite dev server.

### `mountInertiaApp(config): void`

*Import from `encore-inertia/react`*

Wraps `@inertiajs/react`'s `createInertiaApp` with automatic page component resolution from Vite's `import.meta.glob` output.

## Project Structure

A typical Encore + Inertia project:

```
my-app/
├── encore.app
├── package.json
├── vite.config.ts
└── frontend/
    ├── encore.service.ts        # Encore service definition
    ├── inertia-setup.ts         # Adapter configuration
    ├── pages.ts                 # Page route endpoints
    ├── static.ts                # Static asset serving
    ├── src/
    │   ├── app.tsx              # React/Inertia client entry
    │   └── pages/
    │       ├── Home.tsx         # Page components
    │       └── About.tsx
    └── dist/                    # Vite build output (gitignored)
```

## How It Works

1. A browser request hits an Encore raw endpoint
2. The endpoint calls `inertia.render(req, res, "ComponentName", { props })`
3. **First visit** (no `X-Inertia` header): the adapter responds with a full HTML page containing the Vite asset tags and the page object embedded in a `data-page` attribute
4. **Subsequent navigation** (`X-Inertia` header present): the adapter responds with just the JSON page object, and the Inertia client-side library swaps the page component without a full reload

## License

MPL-2.0
