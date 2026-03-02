import { describe, it, expect } from "vitest";
import { createHtmlRenderer } from "../src/html.js";
import type { PageObject } from "../src/types.js";

const testPage: PageObject = {
  component: "Home",
  props: { greeting: "Hello" },
  url: "/",
  version: "1.0",
};

describe("createHtmlRenderer", () => {
  it("renders HTML with default config", () => {
    const renderHtml = createHtmlRenderer({});
    const html = renderHtml(testPage, '<script type="module" src="/app.js"></script>');

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain('<html lang="en">');
    expect(html).toContain("<title>Encore App</title>");
    expect(html).toContain('<div id="app"');
    expect(html).toContain("data-page=");
    expect(html).toContain('/app.js');
  });

  it("uses custom title", () => {
    const renderHtml = createHtmlRenderer({ title: "My App" });
    const html = renderHtml(testPage, "");

    expect(html).toContain("<title>My App</title>");
  });

  it("uses custom lang", () => {
    const renderHtml = createHtmlRenderer({ lang: "fr" });
    const html = renderHtml(testPage, "");

    expect(html).toContain('<html lang="fr">');
  });

  it("uses custom rootId", () => {
    const renderHtml = createHtmlRenderer({ rootId: "root" });
    const html = renderHtml(testPage, "");

    expect(html).toContain('<div id="root"');
  });

  it("injects extra head content", () => {
    const renderHtml = createHtmlRenderer({
      head: '<link rel="icon" href="/favicon.ico">',
    });
    const html = renderHtml(testPage, "");

    expect(html).toContain('<link rel="icon" href="/favicon.ico">');
  });

  it("escapes single quotes in page JSON", () => {
    const page: PageObject = {
      component: "Home",
      props: { msg: "it's working" },
      url: "/",
      version: "1.0",
    };
    const renderHtml = createHtmlRenderer({});
    const html = renderHtml(page, "");

    expect(html).toContain("&#039;");
    expect(html).not.toMatch(/data-page='[^']*'[^']*'/);
  });

  it("uses custom renderHtml when provided", () => {
    const custom = (page: PageObject, assetTags: string) =>
      `<custom>${page.component}|${assetTags}</custom>`;
    const renderHtml = createHtmlRenderer({ renderHtml: custom });
    const html = renderHtml(testPage, "<script></script>");

    expect(html).toBe("<custom>Home|<script></script></custom>");
  });
});
