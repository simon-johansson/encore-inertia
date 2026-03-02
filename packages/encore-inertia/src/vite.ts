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
