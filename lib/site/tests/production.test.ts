import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import robots from "../../../app/robots";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..", "..");
const readSource = (rel: string): string =>
  readFileSync(join(repoRoot, rel), "utf8");
const readPublic = (name: string): Buffer =>
  readFileSync(join(repoRoot, "public", name));

const INDEXNOW_FILE = "d2b4222247f04b74b762efb0ec56a7f3.txt";
const INDEXNOW_KEY = "d2b4222247f04b74b762efb0ec56a7f3";

describe("production — IndexNow verification file", () => {
  it("exists in source public/ with the exact key body", () => {
    const body = readPublic(INDEXNOW_FILE);
    assert.equal(body.toString("utf8"), INDEXNOW_KEY);
    assert.equal(body.length, INDEXNOW_KEY.length);
  });

  it("carries no HTML, quotes, JSON, or extra text", () => {
    const body = readPublic(INDEXNOW_FILE).toString("utf8");
    assert.ok(!body.includes("<"));
    assert.ok(!body.includes('"'));
    assert.ok(!body.includes("{"));
    assert.ok(!/[\r\n]/.test(body));
  });
});

describe("production — branded favicon", () => {
  it("public/favicon.ico exists and is a valid multi-size ICO", () => {
    const ico = readPublic("favicon.ico");
    assert.ok(ico.length > 100, "favicon must not be empty");
    assert.equal(ico.readUInt16LE(0), 0);
    assert.equal(ico.readUInt16LE(2), 1);
    const count = ico.readUInt16LE(4);
    assert.ok(count >= 1, "ICO must contain at least one image");
    const sizes = new Set<number>();
    for (let i = 0; i < count; i++) {
      const offset = 6 + i * 16;
      sizes.add(ico[offset] || 256);
      assert.equal(ico.readUInt16LE(offset + 6), 32);
      assert.ok(ico.readUInt32LE(offset + 8) > 0);
    }
    assert.ok(sizes.has(16), "ICO must include a 16px entry");
    assert.ok(sizes.has(32), "ICO must include a 32px entry");
  });

  it("layout metadata points at branded icons without BNB-logo confusion", () => {
    const layout = readSource(join("app", "layout.tsx"));
    assert.ok(layout.includes('url: "/favicon.ico"'));
    assert.ok(layout.includes('url: "/icon.svg"'));
    assert.ok(!layout.includes("/logo-bnb-chain.svg"));
  });
});

describe("production — custom 404", () => {
  it("app/not-found.tsx exists with real routes and no redirect", () => {
    const page = readSource(join("app", "not-found.tsx"));
    assert.ok(page.includes('href="/"'));
    assert.ok(page.includes('href="/create"'));
    assert.ok(page.includes("Back to home"));
    assert.ok(page.includes("Create a token"));
    assert.ok(!page.includes("redirect("));
    assert.ok(!page.includes("router.replace"));
    assert.ok(!page.includes("window.open"));
  });

  it("loads shared styling explicitly (hard-load safe, no CSS leakage needed)", () => {
    const page = readSource(join("app", "not-found.tsx"));
    assert.ok(page.includes("site-chrome.css"));
  });
});

describe("production — robots policy", () => {
  it("allows broad crawling with admin/api exclusions and a sitemap", () => {
    const policy = robots();
    assert.deepEqual(policy.rules, {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/"],
    });
    assert.ok(
      typeof policy.sitemap === "string" &&
        policy.sitemap.endsWith("/sitemap.xml")
    );
  });

  it("does not block AI/search crawlers specifically", () => {
    const text = JSON.stringify(robots());
    for (const bot of [
      "GPTBot",
      "OAI-SearchBot",
      "ChatGPT-User",
      "ClaudeBot",
      "Claude-SearchBot",
      "PerplexityBot",
      "Google-Extended",
    ]) {
      assert.ok(!text.includes(bot), `must not block ${bot}`);
    }
  });

  it("has a single application source of truth", () => {
    const layout = readSource(join("app", "layout.tsx"));
    assert.ok(!layout.includes("Content-Signal"));
  });
});

describe("production — deploy artifact guards", () => {
  it("CI verifies every critical public asset in the assembled artifact", () => {
    const workflow = readSource(
      join(".github", "workflows", "build-deploy-branch.yml")
    );
    for (const asset of [
      "public/logo-bnb-token-maker.svg",
      "public/logo-bnb-chain.svg",
      `public/${INDEXNOW_FILE}`,
      "public/favicon.ico",
    ]) {
      assert.ok(
        workflow.includes(`deploy/$asset`) || workflow.includes(asset),
        `CI must guard ${asset}`
      );
    }
  });

  it("CI smoke-tests favicon, IndexNow body, and the 404 contract", () => {
    const workflow = readSource(
      join(".github", "workflows", "build-deploy-branch.yml")
    );
    assert.ok(workflow.includes("/favicon.ico"));
    assert.ok(workflow.includes(`/${INDEXNOW_FILE}`));
    assert.ok(workflow.includes(INDEXNOW_KEY));
    assert.ok(workflow.includes("definitely-missing-page"));
    assert.ok(workflow.includes('"404"'));
  });
});
