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
