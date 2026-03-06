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
  let cached: string | undefined;

  return function getAssetTags(): string {
    if (cached !== undefined) return cached;

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
      cached = tags;
      return tags;
    } catch {
      // Don't cache dev server tags — manifest may appear later after a build
      return [
        `<script type="module" src="${devServerUrl}/@vite/client"></script>`,
        `<script type="module">
      import RefreshRuntime from "${devServerUrl}/@react-refresh";
      RefreshRuntime.injectIntoGlobalHook(window);
      window.$RefreshReg$ = () => {};
      window.$RefreshSig$ = () => (type) => type;
      window.__vite_plugin_react_preamble_installed__ = true;
    </script>`,
        `<script type="module" src="${devServerUrl}/${viteEntry}"></script>`,
      ].join("\n    ");
    }
  };
}
