import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

/**
 * Test 7: Phase 6A performs NO automatic network switching.
 *
 * Fails if any UI-path source (components or wallet lib) references a chain
 * mutation primitive or a removed automatic-switch helper. Users change the
 * network manually inside their wallet; the app only observes. Test fixtures
 * under tests/ are intentionally out of scope (fakes, not UI paths).
 */
const SCOPED_FILES = [
  "components/CreateBuilder.tsx",
  "components/wallet/WalletModal.tsx",
  "components/wallet/useWalletNetwork.ts",
  "components/wallet/NetState.tsx",
  "components/wallet/WalletProvider.tsx",
  "components/wallet/ProviderDiagnostics.tsx",
  "lib/wallet/switch.ts",
  "lib/wallet/session.ts",
  "lib/wallet/network.ts",
  "lib/wallet/config.ts",
  "lib/wallet/chains.ts",
  "lib/wallet/errors.ts",
  "lib/wallet/select.ts",
];

const FORBIDDEN_TOKENS = [
  "wallet_switchEthereumChain",
  "wallet_addEthereumChain",
  "useSwitchChain",
  "switchToChain",
  "switchProviderToChain",
  "requestProviderSwitch",
  "verifyProviderReportsChain",
  "switchSelectedProviderToBnb",
  "switchToBnbMainnet",
  "WalletSwitchRejectedError",
  "WalletSwitchNotChangedError",
];

describe("phase 6A — no automatic network switching in UI paths", () => {
  for (const token of FORBIDDEN_TOKENS) {
    it(`contains no ${token}`, () => {
      const hits: string[] = [];
      for (const file of SCOPED_FILES) {
        const source = readFileSync(join(process.cwd(), file), "utf8");
        if (source.includes(token)) hits.push(file);
      }
      assert.deepEqual(hits, []);
    });
  }

  it("all scoped sources exist (scan is not silently empty)", () => {
    for (const file of SCOPED_FILES) {
      const source = readFileSync(join(process.cwd(), file), "utf8");
      assert.ok(source.length > 0, file);
    }
  });
});
