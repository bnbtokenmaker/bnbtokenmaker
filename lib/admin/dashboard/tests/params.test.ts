import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ADMIN_PAGE_DEFAULT,
  ADMIN_PAGE_SIZE_DEFAULT,
  ADMIN_PAGE_SIZE_MAX,
  isAdminFeatureFilter,
  parseAdminListParams,
  sanitizeAdminSearch,
} from "../params";

describe("admin dashboard — list query validation", () => {
  it("defaults empty input safely", () => {
    assert.deepEqual(parseAdminListParams({}), {
      search: null,
      chain: null,
      feature: null,
      from: null,
      toExclusive: null,
      sort: "newest",
      page: ADMIN_PAGE_DEFAULT,
      pageSize: ADMIN_PAGE_SIZE_DEFAULT,
    });
  });

  it("trims search, strips LIKE wildcards, enforces max length", () => {
    assert.equal(sanitizeAdminSearch("  Test Token  "), "Test Token");
    assert.equal(sanitizeAdminSearch("100%_real\\thing"), "100realthing");
    assert.equal(sanitizeAdminSearch("   "), null);
    assert.equal(sanitizeAdminSearch(null), null);
    assert.equal(sanitizeAdminSearch(["a", "b"]), "a");
    const long = sanitizeAdminSearch("x".repeat(500));
    assert.equal(long?.length, 128);
  });

  it("bounds page and pageSize (maximum enforced)", () => {
    assert.equal(parseAdminListParams({ page: "0" }).page, 1);
    assert.equal(parseAdminListParams({ page: "-3" }).page, 1);
    assert.equal(parseAdminListParams({ page: "abc" }).page, 1);
    assert.equal(parseAdminListParams({ page: "2.5" }).page, 1);
    assert.equal(parseAdminListParams({ page: "3" }).page, 3);
    assert.equal(
      parseAdminListParams({ pageSize: String(ADMIN_PAGE_SIZE_MAX + 50) }).pageSize,
      ADMIN_PAGE_SIZE_MAX
    );
    assert.equal(parseAdminListParams({ pageSize: "0" }).pageSize, 20);
    assert.equal(parseAdminListParams({ pageSize: "7" }).pageSize, 7);
  });

  it("allow-lists sort, feature, and chain", () => {
    assert.equal(parseAdminListParams({ sort: "oldest" }).sort, "oldest");
    assert.equal(parseAdminListParams({ sort: "NEWEST" }).sort, "newest");
    assert.equal(parseAdminListParams({ sort: "drop table" }).sort, "newest");
    assert.equal(parseAdminListParams({ feature: "mint" }).feature, "mint");
    assert.equal(parseAdminListParams({ feature: "evil" }).feature, null);
    assert.equal(parseAdminListParams({ chain: "97" }).chain, 97);
    assert.equal(parseAdminListParams({ chain: "mainnet" }).chain, null);
    assert.ok(!isAdminFeatureFilter("evil"));
    assert.ok(isAdminFeatureFilter("whitelist"));
  });

  it("parses date days; rejects impossible dates and datetimes", () => {
    const parsed = parseAdminListParams({ from: "2026-09-01", to: "2026-09-10" });
    assert.equal(parsed.from?.toISOString(), "2026-09-01T00:00:00.000Z");
    // `to` is inclusive in the URL, exclusive midnight-after internally.
    assert.equal(parsed.toExclusive?.toISOString(), "2026-09-11T00:00:00.000Z");
    assert.equal(parseAdminListParams({ from: "2026-13-01" }).from, null);
    assert.equal(parseAdminListParams({ from: "2026-02-30" }).from, null);
    assert.equal(
      parseAdminListParams({ from: "2026-09-01T12:00:00Z" }).from,
      null
    );
    assert.equal(parseAdminListParams({ to: "yesterday" }).toExclusive, null);
  });
});
