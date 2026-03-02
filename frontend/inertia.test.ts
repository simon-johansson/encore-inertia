// frontend/inertia.test.ts
import { describe, it, expect } from "vitest";
import { createPageObject, getViteAssetTags } from "./inertia";

describe("createPageObject", () => {
  it("creates a page object with component, props, url, and version", () => {
    const page = createPageObject("Home", { greeting: "Hello" }, "/");
    expect(page).toEqual({
      component: "Home",
      props: { greeting: "Hello" },
      url: "/",
      version: "1.0",
    });
  });
});

describe("getViteAssetTags", () => {
  it("returns dev server script tags when manifest is not found", () => {
    const tags = getViteAssetTags();
    expect(tags).toContain("localhost:5173");
    expect(tags).toContain("@vite/client");
    expect(tags).toContain("frontend/src/app.tsx");
  });
});
