import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..", "..");
const readSource = (rel: string): string =>
  readFileSync(join(repoRoot, rel), "utf8");

/**
 * Regression guard for the production incident where /admin pages rendered
 * the global header/footer unstyled: admin chrome reached those routes only
 * incidentally through a shared CSS chunk (via app/not-found.tsx's
 * site-chrome.css import), never through a declared dependency.
 */
describe("production — admin chrome dependency is explicit", () => {
  it("app/admin/layout.tsx exists and imports the shared site chrome", () => {
    const layout = readSource("app/admin/layout.tsx");
    assert.ok(
      /import\s+["']\.\.\/site-chrome\.css["']/.test(layout),
      "admin layout must explicitly import ../site-chrome.css"
    );
  });

  it("site-chrome.css carries the header/footer layout rules", () => {
    const chrome = readSource("app/site-chrome.css");
    for (const rule of [".site-header{", ".nav-inner{", ".footer{", ".footer-grid{"]) {
      assert.ok(
        chrome.includes(rule),
        `site-chrome.css must define ${rule}`
      );
    }
  });

  it("Header/Footer class hooks resolve to delivered global rules", () => {
    const header = readSource("components/Header.tsx");
    const footer = readSource("components/Footer.tsx");
    const chrome = readSource("app/site-chrome.css");
    const globals = readSource("app/globals.css");
    const wallet = readSource("app/wallet.css");
    const delivered = chrome + globals + wallet;
    for (const hook of ["site-header", "nav-inner", "footer", "footer-grid"]) {
      assert.ok(
        delivered.includes(`.${hook}`),
        `site chrome must style .${hook} used by Header/Footer`
      );
    }
    assert.ok(header.includes("site-header"));
    assert.ok(footer.includes("footer"));
  });
});
