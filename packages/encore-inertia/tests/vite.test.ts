import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAssetTagsResolver } from "../src/vite.js";
import * as fs from "node:fs";

vi.mock("node:fs", () => ({
  readFileSync: vi.fn(),
}));

describe("createAssetTagsResolver", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns dev server tags when manifest is not found", () => {
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      throw new Error("ENOENT");
    });

    const getAssetTags = createAssetTagsResolver({
      viteEntry: "frontend/src/app.tsx",
      devServerUrl: "http://localhost:5173",
      manifestPath: "frontend/dist/.vite/manifest.json",
    });

    const tags = getAssetTags();
    expect(tags).toContain("http://localhost:5173/@vite/client");
    expect(tags).toContain("http://localhost:5173/frontend/src/app.tsx");
  });

  it("returns production tags from manifest", () => {
    const manifest = {
      "frontend/src/app.tsx": {
        file: "assets/app-abc123.js",
        css: ["assets/app-abc123.css"],
        isEntry: true,
      },
    };
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(manifest));

    const getAssetTags = createAssetTagsResolver({
      viteEntry: "frontend/src/app.tsx",
      devServerUrl: "http://localhost:5173",
      manifestPath: "frontend/dist/.vite/manifest.json",
    });

    const tags = getAssetTags();
    expect(tags).toContain('src="/assets/app-abc123.js"');
    expect(tags).toContain('href="/assets/app-abc123.css"');
    expect(tags).not.toContain("localhost:5173");
  });

  it("returns production tags without CSS when entry has no CSS", () => {
    const manifest = {
      "frontend/src/app.tsx": {
        file: "assets/app-abc123.js",
        isEntry: true,
      },
    };
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(manifest));

    const getAssetTags = createAssetTagsResolver({
      viteEntry: "frontend/src/app.tsx",
      devServerUrl: "http://localhost:5173",
      manifestPath: "frontend/dist/.vite/manifest.json",
    });

    const tags = getAssetTags();
    expect(tags).toContain('src="/assets/app-abc123.js"');
    expect(tags).not.toContain("<link");
  });

  it("falls back to dev tags when entry key is missing from manifest", () => {
    const manifest = {
      "other/entry.tsx": { file: "assets/other.js", isEntry: true },
    };
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(manifest));

    const getAssetTags = createAssetTagsResolver({
      viteEntry: "frontend/src/app.tsx",
      devServerUrl: "http://localhost:5173",
      manifestPath: "frontend/dist/.vite/manifest.json",
    });

    const tags = getAssetTags();
    expect(tags).toContain("localhost:5173");
  });

  it("uses custom devServerUrl", () => {
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      throw new Error("ENOENT");
    });

    const getAssetTags = createAssetTagsResolver({
      viteEntry: "src/main.tsx",
      devServerUrl: "http://localhost:3000",
      manifestPath: "dist/.vite/manifest.json",
    });

    const tags = getAssetTags();
    expect(tags).toContain("http://localhost:3000/@vite/client");
    expect(tags).toContain("http://localhost:3000/src/main.tsx");
  });
});
