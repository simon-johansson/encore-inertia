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
