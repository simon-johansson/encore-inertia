# Encore.ts + Inertia.js Example

This is a minimal example of using [Inertia.js](https://inertiajs.com/) with [Encore.ts](https://encore.dev/) and React to build a full-stack application with server-driven UI and client-side navigation.

Inertia.js lets you build single-page apps without building a separate API — your Encore.ts backend renders page components directly, while React handles the frontend. Navigation between pages happens client-side without full page reloads.

## How it works

1. Encore raw endpoints act as page controllers, returning Inertia page responses
2. On the first request, the server renders a full HTML page with embedded page data
3. Subsequent navigations are handled client-side by Inertia, which fetches JSON and swaps React components
4. Vite builds and serves the React frontend

## Project structure

```
├── encore.app
├── vite.config.ts
├── frontend/
│   ├── encore.service.ts     # Encore service definition
│   ├── inertia.ts            # Inertia server-side protocol adapter
│   ├── pages.ts              # Page route endpoints
│   ├── static.ts             # Static asset serving
│   └── src/
│       ├── app.tsx           # React entry point with Inertia setup
│       └── pages/
│           ├── Home.tsx      # Home page component
│           └── About.tsx     # About page component
```

## Prerequisites

**Install Encore:**
- **macOS:** `brew install encoredev/tap/encore`
- **Linux:** `curl -L https://encore.dev/install.sh | bash`
- **Windows:** `iwr https://encore.dev/install.ps1 | iex`

## Running locally

Start the Encore backend and the Vite dev server:

```bash
encore run
```

```bash
npm run dev:frontend
```

Then open [http://localhost:4000](http://localhost:4000).
