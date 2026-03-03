import type { IncomingMessage, ServerResponse } from "node:http";
import type { InertiaAdapter, InertiaConfig, PageObject } from "./types.js";
import { createAssetTagsResolver } from "./vite.js";
import { createHtmlRenderer } from "./html.js";

export type { InertiaAdapter, InertiaConfig, PageObject, MountInertiaAppConfig } from "./types.js";

export function createInertiaAdapter(config: InertiaConfig): InertiaAdapter {
  const version = config.version ?? "1.0";
  const sharedData = new WeakMap<IncomingMessage, Record<string, unknown>>();

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

  function share(req: IncomingMessage, data: Record<string, unknown>): void {
    const existing = sharedData.get(req) ?? {};
    sharedData.set(req, { ...existing, ...data });
  }

  function render(
    req: IncomingMessage,
    res: ServerResponse,
    component: (...args: any[]) => any,
    props: Record<string, unknown> = {},
  ): void {
    const url = req.url ?? "/";
    const mergedProps = { ...sharedData.get(req), ...props };
    const page: PageObject = { component: component.name, props: mergedProps, url, version };

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

  return { render, share, getAssetTags };
}
