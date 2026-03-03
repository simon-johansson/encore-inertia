# encore-inertia Library Design

## Overview

Extract the Inertia.js adapter from `frontend/inertia.ts` into a reusable npm package (`encore-inertia`) for Encore.ts applications. The library provides a server-side Inertia protocol adapter and an optional React client helper.

## API Surface

### Main Export: `createInertiaAdapter(config)`

Factory function that accepts a config object and returns `{ render, getAssetTags }`.

```ts
import { createInertiaAdapter } from "encore-inertia";

const inertia = createInertiaAdapter({
  // Required
  viteEntry: "frontend/src/app.tsx",

  // Optional with defaults
  title: "Encore App",
  manifestPath: "frontend/dist/.vite/manifest.json",
  devServerUrl: "http://localhost:5173",
  rootId: "app",
  lang: "en",
  version: "1.0",
  head: "",

  // Escape hatch: override the entire HTML template
  renderHtml: (page, assetTags) => `<!DOCTYPE html>...`,
});
```

**Config behavior:**
- Only `viteEntry` is required. All others have sensible defaults.
- If `renderHtml` is provided, it overrides the built-in template. Slot config (`title`, `lang`, `head`, `rootId`) is ignored in that case.

**Returned object:**
- `render(req, res, component, props?)` — handles the Inertia protocol (full HTML on first visit, JSON on subsequent navigations via `X-Inertia` header)
- `getAssetTags()` — returns `<script>` and `<link>` tags string (reads manifest in production, falls back to dev server URLs)

### React Subpath: `encore-inertia/react`

```ts
import { mountInertiaApp } from "encore-inertia/react";

mountInertiaApp({
  pages: import.meta.glob("./pages/**/*.tsx"),
  rootId: "app", // optional, defaults to "app"
});
```

Wraps `@inertiajs/react`'s `createInertiaApp`, handling component resolution and React root setup.

## Package Structure

```
encore-inertia/
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── src/
│   ├── index.ts      # Main export: createInertiaAdapter
│   ├── types.ts      # Config & PageObject interfaces
│   ├── html.ts       # HTML template rendering
│   ├── vite.ts       # Manifest reading + dev server tags
│   └── react.ts      # React client helper
├── dist/
│   ├── index.js / index.d.ts
│   └── react.js / react.d.ts
└── tests/
    ├── adapter.test.ts
    └── vite.test.ts
```

## Dependencies

- **Runtime deps:** none (main entrypoint uses only Node.js built-ins)
- **Peer deps (optional):** `react`, `react-dom`, `@inertiajs/react` (for `/react` subpath only)
- **Build:** tsup for ESM output + TypeScript declarations

## Exports Map

```json
{
  "exports": {
    ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" },
    "./react": { "import": "./dist/react.js", "types": "./dist/react.d.ts" }
  }
}
```

## Usage Example

**Setup:**
```ts
// frontend/inertia-setup.ts
import { createInertiaAdapter } from "encore-inertia";

export const inertia = createInertiaAdapter({
  viteEntry: "frontend/src/app.tsx",
  title: "My App",
});
```

**Routes:**
```ts
// frontend/pages.ts
import { api } from "encore.dev/api";
import { inertia } from "./inertia-setup";

export const home = api.raw(
  { expose: true, path: "/", method: "GET" },
  async (req, res) => {
    inertia.render(req, res, "Home", { greeting: "Hello!" });
  }
);
```

**Client:**
```ts
// frontend/src/app.tsx
import { mountInertiaApp } from "encore-inertia/react";

mountInertiaApp({
  pages: import.meta.glob("./pages/**/*.tsx"),
});
```

## Design Decisions

1. **Factory over class** — idiomatic TypeScript, matches Encore patterns
2. **Config object over convention** — explicit, easy to understand, good IDE support
3. **Slot-based HTML + escape hatch** — covers 90% of cases simply, with full control when needed
4. **Zero runtime deps** — keeps the package lightweight, avoids version conflicts
5. **Separate React subpath** — main entrypoint stays backend-only, no frontend bundler issues
