"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useConnection } from "wagmi";

import { useWalletUI } from "../wallet/WalletUI";
import { trackManagerEvent } from "../../lib/manage/analytics";
import { loadRecents, saveRecent } from "./recents";

import { BSC_MAINNET_CHAIN_ID, BSC_TESTNET_CHAIN_ID, isSupportedV1ChainId } from "../../lib/deploy/chains";

const MANAGE_CHAIN_IDS = [BSC_MAINNET_CHAIN_ID, BSC_TESTNET_CHAIN_ID];
const DEFAULT_MANAGE_CHAIN_ID = BSC_MAINNET_CHAIN_ID;

function isAddressString(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}

/**
 * /manage landing: connect, inspect any token by address, jump back to
 * recent inspections. No dead routes: continue requires a valid address on
 * the supported chain; mainnet stays disabled with an explicit message.
 */
export function ManageLanding() {
  const router = useRouter();
  const { isConnected, address } = useConnection();
  const { open: openWallet } = useWalletUI();
  const [input, setInput] = useState("");
  // Tab-local recents (storage-guarded, SSR-safe): absent on prerender,
  // hydrated from this device on mount — same precedent as deploy recovery.
  const [recents, setRecents] = useState<string[]>(() => loadRecents(DEFAULT_MANAGE_CHAIN_ID));
  const [onchain, setOnchain] = useState<Array<{
    contractAddress: string;
    tokenName: string;
    tokenSymbol: string;
    txHash: string;
  }> | null>(null);
  const openedTracked = useRef(false);

  useEffect(() => {
    if (openedTracked.current) return;
    openedTracked.current = true;
    trackManagerEvent(
      { name: "manager_opened", chainId: DEFAULT_MANAGE_CHAIN_ID },
      typeof window !== "undefined" ? window.gtag : undefined
    );
  }, []);

  // Read-only on-chain discovery: verified deployments by the connected
  // deployer. Best-effort and non-blocking — local recents always remain.
  // On-chain owner() still decides privileges at the dashboard.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isConnected || !address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return;
      }
      try {
        const response = await fetch(
          `/api/deployments?deployer=${address.toLowerCase()}&chainId=${DEFAULT_MANAGE_CHAIN_ID}&limit=8`
        );
        if (!response.ok) return;
        const body = (await response.json()) as {
          deployments?: Array<{
            contractAddress: string;
            tokenName: string;
            tokenSymbol: string;
            txHash: string;
          }>;
        };
        if (cancelled || !Array.isArray(body.deployments)) return;
        setOnchain(
          body.deployments
            .filter(
              (d) =>
                typeof d.contractAddress === "string" &&
                /^0x[a-fA-F0-9]{40}$/.test(d.contractAddress)
            )
            .slice(0, 8)
        );
      } catch {
        /* discovery is a convenience — silent failure */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isConnected, address]);

  const valid = isAddressString(input);

  const go = (token: string) => {
    const normalized = token.trim().toLowerCase();
    if (!isAddressString(normalized)) return;
    setRecents(saveRecent(DEFAULT_MANAGE_CHAIN_ID, normalized));
    router.push(`/manage/${DEFAULT_MANAGE_CHAIN_ID}/${normalized}`);
  };

  return (
    <div className="app-grid">
      <div className="form-col">
        <section className="form-box">
          <div className="form-sec-h">
            <span className="idx">01</span>
            <h2>Inspect a token</h2>
            <span className="small-note">BNB Smart Chain Testnet (97) only for now.</span>
          </div>
          {!isConnected ? (
            <div className="deploy-card">
              <h3>Connect your wallet</h3>
              <p className="deploy-muted">
                Inspection works best connected: the manager compares the
                connected wallet against the on-chain owner to unlock
                owner actions. Address: {address ?? "—"}
              </p>
              <button type="button" className="btn btn-primary" onClick={() => openWallet("connect")}>
                Connect Wallet
              </button>
            </div>
          ) : null}
          <label className="field" id="fld-manage-address">
            <span className="field-label">Token contract address</span>
            <input
              id="f-manage-address"
              type="text"
              value={input}
              spellCheck={false}
              autoComplete="off"
              placeholder="0x…"
              onChange={(e) => setInput(e.target.value.trim())}
            />
            <span className="field-hint">
              Paste any BEP-20 contract address. BNBTokenMaker V1 tokens unlock
              full management; other tokens get conservative read-only inspection.
            </span>
            <span className="err">Enter a valid 0x contract address.</span>
          </label>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!valid}
            onClick={() => go(input)}
          >
            Inspect token
          </button>
          <p className="deploy-muted">
            Mainnet (56) stays disabled until mainnet activation — this manager
            targets Testnet (97) in this phase.
          </p>
        </section>

        {onchain !== null && onchain.length > 0 && (
          <section className="form-box">
            <div className="form-sec-h">
              <span className="idx">02</span>
              <h2>Your on-chain deployments</h2>
              <span className="small-note">Verified records. On-chain owner decides privileges.</span>
            </div>
            <ul className="deploy-feats">
              {onchain.map((d) => (
                <li key={d.contractAddress}>
                  <b>{d.tokenName} · {d.tokenSymbol}</b>{" "}
                  <code className="mono">{d.contractAddress}</code>{" "}
                  <button type="button" className="linklike" onClick={() => go(d.contractAddress)}>
                    Open
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {recents.length > 0 && (
          <section className="form-box">
            <div className="form-sec-h">
              <span className="idx">03</span>
              <h2>Recently inspected</h2>
              <span className="small-note">This device only. On-chain owner always decides privileges.</span>
            </div>
            <ul className="deploy-feats">
              {recents.map((recent) => (
                <li key={recent}>
                  <code className="mono">{recent}</code>{" "}
                  <button type="button" className="linklike" onClick={() => go(recent)}>
                    Open
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <aside className="summary-wrap" aria-label="About Token Manager">
        <div className="summary">
          <div className="sum-head">
            <b>Token Manager</b>
          </div>
          <div className="sum-rows">
            <div className="sum-row"><span>Own tokens</span><b>Free · gas only</b></div>
            <div className="sum-row"><span>Network</span><b>BSC Testnet (97)</b></div>
          </div>
          <hr className="sum-sep" />
          <p className="deploy-muted">
            Tokens created with BNBTokenMaker get full management: supply,
            pause, lists, trading, pairs, launch, liquidity and ownership —
            every write signed by your wallet. External tokens get careful
            read-only inspection in this phase.
          </p>
        </div>
      </aside>
    </div>
  );
}
