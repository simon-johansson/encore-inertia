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
  /** Result of import.meta.glob eager import for page components */
  pages: Record<string, unknown>;

  /** Root element ID. Default: "app" */
  rootId?: string;
}
