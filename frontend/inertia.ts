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
