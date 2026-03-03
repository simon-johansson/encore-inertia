import { describe, it, expect, vi, beforeEach } from "vitest";
import { createInertiaAdapter } from "../src/index.js";
import type { IncomingMessage, ServerResponse } from "node:http";
import * as fs from "node:fs";

vi.mock("node:fs", () => ({
  readFileSync: vi.fn(() => {
    throw new Error("ENOENT");
  }),
}));

function Home(_props: { greeting: string }) { return null; }
function About() { return null; }

function createMockReq(overrides: Partial<IncomingMessage> = {}): IncomingMessage {
  return {
    url: "/",
    headers: {},
    ...overrides,
  } as IncomingMessage;
}

function createMockRes(): ServerResponse & { _status: number; _headers: Record<string, string>; _body: string } {
  const res = {
    _status: 0,
    _headers: {} as Record<string, string>,
    _body: "",
    writeHead(status: number, headers: Record<string, string>) {
      res._status = status;
      Object.assign(res._headers, headers);
    },
    end(body: string) {
      res._body = body;
    },
  };
  return res as any;
}

describe("createInertiaAdapter", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns an object with render and getAssetTags", () => {
    const inertia = createInertiaAdapter({ viteEntry: "src/app.tsx" });
    expect(inertia).toHaveProperty("render");
    expect(inertia).toHaveProperty("getAssetTags");
    expect(typeof inertia.render).toBe("function");
    expect(typeof inertia.getAssetTags).toBe("function");
  });

  it("render returns full HTML on first visit (no X-Inertia header)", () => {
    const inertia = createInertiaAdapter({ viteEntry: "src/app.tsx" });
    const req = createMockReq();
    const res = createMockRes();

    inertia.render(req, res, Home, { greeting: "Hello" });

    expect(res._status).toBe(200);
    expect(res._headers["Content-Type"]).toBe("text/html");
    expect(res._body).toContain("<!DOCTYPE html>");
    expect(res._body).toContain('"component":"Home"');
    expect(res._body).toContain('"greeting":"Hello"');
  });

  it("render returns JSON on Inertia navigation (X-Inertia header present)", () => {
    const inertia = createInertiaAdapter({ viteEntry: "src/app.tsx" });
    const req = createMockReq({ headers: { "x-inertia": "true" } });
    const res = createMockRes();

    inertia.render(req, res, About);

    expect(res._status).toBe(200);
    expect(res._headers["Content-Type"]).toBe("application/json");
    expect(res._headers["X-Inertia"]).toBe("true");
    expect(res._headers["Vary"]).toBe("X-Inertia");

    const body = JSON.parse(res._body);
    expect(body.component).toBe("About");
    expect(body.url).toBe("/");
    expect(body.version).toBe("1.0");
  });

  it("uses custom version from config", () => {
    const inertia = createInertiaAdapter({ viteEntry: "src/app.tsx", version: "2.0" });
    const req = createMockReq({ headers: { "x-inertia": "true" } });
    const res = createMockRes();

    inertia.render(req, res, Home);

    const body = JSON.parse(res._body);
    expect(body.version).toBe("2.0");
  });

  it("uses req.url in page object", () => {
    const inertia = createInertiaAdapter({ viteEntry: "src/app.tsx" });
    const req = createMockReq({ url: "/about?foo=bar", headers: { "x-inertia": "true" } });
    const res = createMockRes();

    inertia.render(req, res, About);

    const body = JSON.parse(res._body);
    expect(body.url).toBe("/about?foo=bar");
  });

  it("defaults props to empty object", () => {
    const inertia = createInertiaAdapter({ viteEntry: "src/app.tsx" });
    const req = createMockReq({ headers: { "x-inertia": "true" } });
    const res = createMockRes();

    inertia.render(req, res, Home);

    const body = JSON.parse(res._body);
    expect(body.props).toEqual({});
  });

  it("uses custom title in HTML", () => {
    const inertia = createInertiaAdapter({ viteEntry: "src/app.tsx", title: "My App" });
    const req = createMockReq();
    const res = createMockRes();

    inertia.render(req, res, Home);

    expect(res._body).toContain("<title>My App</title>");
  });
});
