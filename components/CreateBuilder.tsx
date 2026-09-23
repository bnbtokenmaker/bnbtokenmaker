"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useConnection } from "wagmi";
import { useRouter } from "next/navigation";

import { networkLabel } from "../lib/wallet/chains";
import { shortenAddress } from "../lib/wallet/format";
import { walletDeploymentEligibility } from "../lib/wallet/network";
import { useWalletUI } from "./wallet/WalletUI";
import { useWalletNetwork } from "./wallet/useWalletNetwork";
import {
  loadDeployDraft,
  saveDeployDraft,
} from "../lib/deploy/draft-transfer";
import {
  calculatePlatformFee,
  formatWeiBnbDisplay,
  fromPricingConfigDto,
  PricingError,
} from "../lib/pricing";
import type {
  PaidFeatureId,
  PricingConfig,
  PricingConfigDto,
  PricingResult,
} from "../lib/pricing";
import type { QuoteResponse } from "../lib/pricing/server/types";
import {
  DEFAULT_FEAT_SELECTION,
  PRESET_IDS,
  PRESETS,
  presetForSelection,
  selectedFeatureIds,
} from "../lib/pricing/presets";
import type { FeatureSelection, PresetId } from "../lib/pricing/presets";
import { DRAFT_DEFAULTS, SUPPLY_QUICK_PRESETS, formatSupplyInput } from "../lib/draft";
import type { DraftConfig } from "../lib/draft";
import {
  fetchPromoQuote,
  type AuthoritativeQuote,
} from "../lib/deploy/quote-client";
import { useSupplyField } from "./useSupplyField";

const SUMMARY_LABEL: Record<PaidFeatureId, string> = {
  burn: "Burnable",
  mint: "Mintable",
  pause: "Pausable",
  maxTx: "Max Transaction",
  maxWallet: "Max Wallet",
  blacklist: "Blacklist",
  whitelist: "Whitelist",
};

const PRESET_NAME: Record<PresetId, string> = {
  standard: "Standard",
  mintable: "Mintable",
  community: "Community",
  custom: "Custom",
};

function fmtNumber(v: string) {
  const n = (v || "").replace(/\D/g, "");
  return n ? Number(n).toLocaleString("en-US") : "";
}

type Inv = {
  name: boolean;
  sym: boolean;
  dec: boolean;
  supply: boolean;
  xb: boolean;
  xw: boolean;
};

const CLEAR_INV: Inv = {
  name: false,
  sym: false,
  dec: false,
  supply: false,
  xb: false,
  xw: false,
};

type ConfigState =
  | { ok: true; value: PricingConfig }
  | { ok: false; error: PricingError };

type PricingState =
  | { ok: true; result: PricingResult }
  | { ok: false; error: PricingError };

function reconstructConfig(dto: PricingConfigDto): ConfigState {
  try {
    return { ok: true, value: fromPricingConfigDto(dto) };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof PricingError
          ? error
          : new PricingError("invalid-config", "pricing configuration could not be loaded"),
    };
  }
}

type CreateBuilderProps = {
  pricingConfigDto: PricingConfigDto;
  serverQuote: QuoteResponse;
  initialDraft?: DraftConfig;
  /**
   * Sanitized public campaign summary for the live ESTIMATE breakdown.
   * Display-only: bigint math runs locally on server-provided parameters,
   * and the deploy flow re-quotes authoritatively server-side before any
   * transaction. Null when no campaign is currently active.
   */
  activeCampaign?: ActiveCampaignEstimate | null;
  /**
   * Raw campaign code from ?campaign=CODE (operator-shared links). Untrusted:
   * prefilled into the promo input and validated through the authoritative
   * quote API like any typed code — never assumed valid from the URL, and
   * only the code travels (never money).
   */
  initialCampaignCode?: string | null;
};

export type ActiveCampaignEstimate = {
  name: string;
  code: string | null;
  discountBasisPoints: number;
  /** Real campaign end, ISO string (server-provided). */
  endsAt: string;
};

/** Exact "10.00" percent label from integer basis points (no floats). */
function basisPointsLabel(basisPoints: number): string {
  const whole = Math.floor(basisPoints / 100);
  const frac = String(basisPoints % 100).padStart(2, "0");
  return `${whole}.${frac}`;
}

export type SummaryActionsProps = {
  walletConnected: boolean;
  needsNetworkSwitch: boolean;
  connectorName: string | null;
  walletAddrText: string;
  eligible: boolean;
  /** Human label of the live chain, shown only in the Wrong Network copy. */
  wrongChainLabel: string | null;
  /** Test hook: render the manual-switch explanation open. */
  forceShowHelp?: boolean;
  /**
   * Continuation to the dedicated /deploy review page (same tab, Next
   * routing — never a new tab/window). The button stays disabled until the
   * caller sets `canContinue`.
   */
  canContinue?: boolean;
  onContinue?: () => void;
  onConnect: () => void;
  onOpenAccount: () => void;
};

/**
 * Pure presentational wallet/network actions for the Deployment Summary.
 * Every branch is driven by caller-supplied verified state — this component
 * performs no chain derivation itself, so rendered-output tests can assert
 * the exact markup (warn visibility, manual-switch info, eligibility flag,
 * note text) for any given state.
 *
 * Phase 6A never requests a network change: the Wrong Network state is
 * informational only ("Switch network in your wallet"), optionally revealing
 * a short explanation. No RPC is ever sent from this component.
 */
export function SummaryActions({
  walletConnected,
  needsNetworkSwitch,
  connectorName,
  walletAddrText,
  eligible,
  wrongChainLabel,
  forceShowHelp = false,
  canContinue = false,
  onContinue,
  onConnect,
  onOpenAccount,
}: SummaryActionsProps) {
  const [showSwitchHelp, setShowSwitchHelp] = useState(forceShowHelp);
  const wrongDetail = `Your wallet is connected to ${wrongChainLabel ?? "an unsupported network"}. Switch to BNB Smart Chain in your wallet to continue.`;
  return (
    <div className="sum-actions">
      {needsNetworkSwitch ? (
        <div className="sum-netwarn" id="sumNetWarn" role="status">
          <span className="snw-ic" aria-hidden="true"><i className="fa-solid fa-triangle-exclamation"></i></span>
          <span className="snw-txt">
            <b>Wrong network</b>
            <span>{wrongDetail}</span>
          </span>
        </div>
      ) : null}
      {!walletConnected ? (
        <button
          className="btn btn-primary"
          type="button"
          id="walletBtn"
          onClick={onConnect}
        >
          <i className="fa-solid fa-wallet" aria-hidden="true"></i>Connect Wallet
        </button>
      ) : needsNetworkSwitch ? (
        <div className="sum-manual-switch">
          <button
            className="btn btn-primary"
            type="button"
            id="walletBtn"
            onClick={() => setShowSwitchHelp((value) => !value)}
            aria-expanded={showSwitchHelp}
          >
            <i className="fa-solid fa-arrow-right-arrow-left" aria-hidden="true"></i>
            Switch network in your wallet
          </button>
          {showSwitchHelp ? (
            <p className="sum-note" role="status">
              Open your wallet and set the network for this site to BNB Smart
              Chain (BSC): in MetaMask, click the site icon at the top, then
              the network name, then select BNB Smart Chain. Changing only the
              wallet&apos;s main network is not enough — wallets can remember a
              separate network for each site.
            </p>
          ) : null}
        </div>
      ) : (
        <button
          className="btn btn-ghost sum-wallet"
          type="button"
          id="walletBtn"
          onClick={onOpenAccount}
        >
          <span className="wal-dot" aria-hidden="true"></span>
          <span className="sum-wallet-name">
            {connectorName ?? "Wallet"}
          </span>
          <span className="sum-wallet-addr">
            {walletAddrText}
          </span>
        </button>
      )}
      <button
        className="btn btn-dark"
        type="button"
        id="createBtn"
        disabled={!canContinue}
        data-deploy-eligible={eligible ? "true" : "false"}
        onClick={onContinue}
      >
        Create Token
      </button>
      <p className="sum-note">
        {!walletConnected
          ? "Connect your wallet to continue."
          : needsNetworkSwitch
            ? `Wrong Network \u00b7 ${wrongDetail}`
            : canContinue
              ? "Ready — continue to review and deploy."
              : "Complete the token details above to continue."}
      </p>
    </div>
  );
}

export function CreateBuilder({
  pricingConfigDto,
  serverQuote,
  initialDraft = DRAFT_DEFAULTS,
  activeCampaign = null,
  initialCampaignCode = null,
}: CreateBuilderProps) {
  // Restore the tab-scoped draft carried back from /deploy ("Edit token").
  // Absent on fresh tabs; cleared by "Create another token" for a clean start.
  const [restoredDraft] = useState(() => loadDeployDraft());
  const [name, setName] = useState(() => restoredDraft?.name ?? initialDraft.name);
  const [sym, setSym] = useState(() => restoredDraft?.symbol ?? initialDraft.symbol);
  const [dec, setDec] = useState(() => restoredDraft?.decimals ?? initialDraft.decimals);
  const [supply, setSupply] = useState(() => restoredDraft?.supply ?? initialDraft.supply);
  const supplyRef = useRef<HTMLInputElement | null>(null);
  const supplyField = useSupplyField({ value: supply, setValue: setSupply, inputRef: supplyRef });
  const [feats, setFeats] = useState<FeatureSelection>(
    () => restoredDraft?.feats ?? DEFAULT_FEAT_SELECTION
  );
  const [xMaxbuy, setXMaxbuy] = useState(() => restoredDraft?.maxTxPercent ?? "1");
  const [xMaxwal, setXMaxwal] = useState(() => restoredDraft?.maxWalletPercent ?? "2");
  const [inv, setInv] = useState<Inv>(CLEAR_INV);

  const {
    isConnected: walletConnected,
    address: walletAddress,
    connector: walletConnector,
  } = useConnection();
  const network = useWalletNetwork();
  const { open: openWallet } = useWalletUI();
  const walletChainId = network.chainId;
  const needsNetworkSwitch = network.status === "wrong";
  // Authoritative, reusable deployment gate for Phase 6B. Deployment is NOT
  // enabled yet; the live chain is re-checked via `revalidateActiveChain`
  // immediately before any future transaction.
  const deploymentEligibility = walletDeploymentEligibility({
    isConnected: walletConnected,
    address: walletAddress,
    chainId: walletChainId,
  });

  const decNum = parseInt(dec, 10);
  const decValid = dec !== "" && !isNaN(decNum) && decNum >= 0 && decNum <= 18;
  const supplyNum = parseInt(supply.replace(/\D/g, ""), 10);
  const supplyValid = supplyNum > 0;

  const showNameErr = inv.name;
  const showSymErr = inv.sym;
  const showDecErr = inv.dec;
  const showSupplyErr = inv.supply;

  function validate() {
    return {
      ...CLEAR_INV,
      dec: !decValid,
      supply: !supplyValid,
    };
  }

  const configState = useMemo(() => reconstructConfig(pricingConfigDto), [pricingConfigDto]);

  const pricingState = useMemo<PricingState>(() => {
    if (!configState.ok) {
      return { ok: false, error: configState.error };
    }
    try {
      return {
        ok: true,
        result: calculatePlatformFee(configState.value, selectedFeatureIds(feats)),
      };
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof PricingError
            ? error
            : new PricingError("invalid-config", "pricing calculation failed"),
      };
    }
  }, [configState, feats]);

  const result = pricingState.ok ? pricingState.result : null;

  // Honest campaign estimate: exact bigint discount from the server-provided
  // campaign parameters (round down, never exceeding the subtotal). Shown
  // only when a REAL campaign is active; otherwise no discount UI at all.
  const campaignEstimate = useMemo(() => {
    if (!result || !activeCampaign) return null;
    if (
      !Number.isInteger(activeCampaign.discountBasisPoints) ||
      activeCampaign.discountBasisPoints < 1 ||
      activeCampaign.discountBasisPoints > 9000
    ) {
      return null;
    }
    const discountWei =
      (result.subtotalWei * BigInt(activeCampaign.discountBasisPoints)) / 10000n;
    if (discountWei <= 0n) return null;
    return {
      discountWei,
      totalWei: result.subtotalWei - discountWei,
    };
  }, [result, activeCampaign]);

  useEffect(() => {
    if (!pricingState.ok) {
      console.error(
        "Pricing calculation failed (",
        pricingState.error.code,
        "):",
        pricingState.error.message
      );
    }
  }, [pricingState]);

  // Promo-code flow (coded campaigns). The code travels to the authoritative
  // quote API and back; displayed money always comes from the server DTO,
  // never from local math or the URL.
  type PromoState =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "applied"; quote: AuthoritativeQuote }
    | { status: "invalid" }
    | { status: "unavailable" };
  const [codeInput, setCodeInput] = useState(() => initialCampaignCode ?? "");
  // A ?campaign=CODE link starts applied exactly like a typed code — still
  // validated through the API by the effect below, never trusted on arrival.
  const [appliedCode, setAppliedCode] = useState<string | null>(() =>
    typeof initialCampaignCode === "string" &&
    initialCampaignCode.trim().length > 0
      ? initialCampaignCode
      : null
  );
  const [promo, setPromo] = useState<PromoState>({ status: "idle" });
  const promoRequestRef = useRef(0);

  const featureKey = useMemo(
    () => selectedFeatureIds(feats).join(","),
    [feats]
  );

  // Revalidate the applied code against the CURRENT selection (debounced).
  // While refetching, the previous authoritative quote stays visible; all
  // state sets happen in async callbacks or event handlers, never
  // synchronously in the effect body.
  useEffect(() => {
    if (appliedCode === null) return;
    const code = appliedCode;
    const ids = featureKey.length > 0 ? featureKey.split(",") : [];
    const requestId = ++promoRequestRef.current;
    const timer = setTimeout(() => {
      void (async () => {
        const outcome = await fetchPromoQuote(ids, code);
        if (promoRequestRef.current !== requestId) return;
        if (outcome.ok) {
          setPromo({ status: "applied", quote: outcome.quote });
        } else {
          setPromo({
            status: outcome.reason === "invalid-code" ? "invalid" : "unavailable",
          });
        }
      })();
    }, 350);
    return () => clearTimeout(timer);
  }, [appliedCode, featureKey]);

  function applyPromoCode(): void {
    const raw = codeInput.trim();
    if (raw.length === 0) return;
    promoRequestRef.current += 1;
    setAppliedCode(raw);
    setPromo({ status: "loading" });
  }

  function clearPromoCode(): void {
    promoRequestRef.current += 1;
    setAppliedCode(null);
    setCodeInput("");
    setPromo({ status: "idle" });
  }

  const promoQuote = promo.status === "applied" ? promo.quote : null;

  const preset: PresetId = presetForSelection(feats);

  function applyPreset(p: PresetId) {
    setFeats({ ...PRESETS[p] });
    const v = validate();
    setInv(v);
  }

  function toggle(id: PaidFeatureId) {
    setFeats((cur) => {
      const val = !cur[id];
      const next = { ...cur };
      if (val) {
        if (id === "blacklist") next.whitelist = false;
        if (id === "whitelist") next.blacklist = false;
      }
      next[id] = val;
      return next;
    });
  }

  function extraOk(v: string) {
    return v === "" || (!isNaN(parseFloat(v)) && parseFloat(v) > 0 && parseFloat(v) <= 100);
  }

  // Continuation gate for the /deploy review page (lightweight client-side
  // check only — /deploy revalidates through the token domain rules and the
  // pre-transaction gates revalidate again with the live deployer).
  const formValid = useMemo(() => {
    const compact = name.replace(/\s+/g, " ").trim();
    if (compact.length < 1 || compact.length > 40) return false;
    try {
      if (new TextEncoder().encode(compact).length > 64) return false;
    } catch {
      return false;
    }
    if (!/^[A-Z0-9]{1,11}$/.test(sym.trim().toUpperCase())) return false;
    if (!decValid || !supplyValid) return false;
    if (feats.blacklist && feats.whitelist) return false;
    const pctOk = (v: string) =>
      v !== "" && !isNaN(parseFloat(v)) && parseFloat(v) > 0 && parseFloat(v) <= 100;
    if (feats.maxTx && !pctOk(xMaxbuy)) return false;
    if (feats.maxWallet && !pctOk(xMaxwal)) return false;
    return true;
  }, [name, sym, decValid, supplyValid, feats, xMaxbuy, xMaxwal]);

  const router = useRouter();

  // Same-tab continuation: persist the non-secret draft for /deploy, then
  // navigate with normal Next.js routing. Never a new tab or window.
  const goToDeploy = useCallback(() => {
    if (!formValid || !walletConnected) return;
    saveDeployDraft({
      version: 1,
      name,
      symbol: sym,
      decimals: dec,
      supply,
      feats: { ...feats },
      maxTxPercent: xMaxbuy,
      maxWalletPercent: xMaxwal,
      savedAt: Date.now(),
    });
    router.push("/deploy");
  }, [formValid, walletConnected, name, sym, dec, supply, feats, xMaxbuy, xMaxwal, router]);

  const nameDisplay = name.trim() || "Untitled";
  const symDisplay = sym.toUpperCase() || "SYM";
  const supplyDisplay = fmtNumber(supply) || "0";
  const decDisplay = dec || "\u2014";

  return (
    <div className="app-grid">
      <div className="form-col">
        <section className="form-box">
          <div className="form-sec-h">
            <span className="idx">01</span>
            <h2>Token Details</h2>
            <span className="small-note">What holders see on wallets and explorers.</span>
          </div>
          <label className={"field" + (showNameErr ? " is-invalid" : "")} id="fld-name">
            <span className="field-label">Token name</span>
            <input
              id="f-name"
              type="text"
              value={name}
              maxLength={40}
              spellCheck={false}
              autoComplete="off"
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setInv((cur) => ({ ...cur, name: name.trim() === "" }))}
            />
            <span className="field-hint">The public name of your token.</span>
            <span className="err">Token name is required.</span>
          </label>
          <div className="field-row">
            <label className={"field" + (showSymErr ? " is-invalid" : "")} id="fld-symbol">
              <span className="field-label">Symbol</span>
              <input
                id="f-symbol"
                type="text"
                value={sym}
                maxLength={11}
                spellCheck={false}
                autoComplete="off"
                onChange={(e) =>
                  setSym(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11))
                }
                onBlur={() => setInv((cur) => ({ ...cur, sym: sym.trim() === "" }))}
              />
              <span className="field-hint">Uppercase letters and numbers, e.g. MAKER.</span>
              <span className="err">Symbol is required.</span>
            </label>
            <label className={"field" + (showDecErr ? " is-invalid" : "")} id="fld-dec">
              <span className="field-label">Decimals</span>
              <input
                id="f-dec"
                type="number"
                value={dec}
                min={0}
                max={18}
                inputMode="numeric"
                onChange={(e) => setDec(e.target.value.replace(/\D/g, "").slice(0, 2))}
                onBlur={() => {
                  const n = parseInt(dec, 10);
                  if (dec !== "" && !isNaN(n)) {
                    setDec(String(Math.min(18, Math.max(0, n))));
                  }
                  setInv((cur) => ({ ...cur, dec: !decValid }));
                }}
              />
              <span className="field-hint">18 is the standard for BEP-20.</span>
              <span className="err">Decimals must be between 0 and 18.</span>
            </label>
          </div>
          <label className={"field" + (showSupplyErr ? " is-invalid" : "")} id="fld-supply">
            <span className="field-label">Total supply</span>
            <input
              id="f-supply"
              type="text"
              value={supply}
              ref={supplyRef}
              inputMode="numeric"
              autoComplete="off"
              onChange={(e) => supplyField.handleChange(e.target.value)}
              onBlur={() => {
                const sn = parseInt((supply || "").replace(/\D/g, ""), 10);
                setInv((cur) => ({ ...cur, supply: !(sn > 0) }));
              }}
            />
            <span className="field-hint">Initial number of tokens created at deployment.</span>
            <span className="err">Total supply must be greater than zero.</span>
          </label>
          <div className="supply-presets" role="group" aria-label="Quick supply presets">
            {SUPPLY_QUICK_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                className="supply-preset"
                data-supply={p.label}
                onClick={() => {
                  setSupply(formatSupplyInput(p.digits));
                  setInv((cur) => ({ ...cur, supply: false }));
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </section>

        <section className="form-box">
          <div className="form-sec-h">
            <span className="idx">02</span>
            <h2>Token Features</h2>
            <span className="small-note">Pick a quick start, then fine-tune every feature below.</span>
          </div>

          <div className="presets" role="group" aria-label="Quick start presets">
            {PRESET_IDS.map((p) => (
              <button
                key={p}
                className={"preset" + (preset === p ? " is-on" : "")}
                type="button"
                data-preset={p}
                aria-pressed={preset === p}
                onClick={() => applyPreset(p)}
              >
                <span className="p-name">
                  {PRESET_NAME[p]}{" "}
                  <i className="fa-solid fa-check" aria-hidden="true"></i>
                </span>
                <span className="p-tags">
                  {p === "standard" && (<><span>Fixed supply</span><span>Ownership control</span></>)}
                  {p === "mintable" && (<><span>Mintable</span><span>Ownership control</span></>)}
                  {p === "community" && (<><span>Max transaction</span><span>Max wallet</span><span>Ownership control</span></>)}
                  {p === "custom" && (<><span>Base BEP-20</span><span>You decide</span></>)}
                </span>
                <span className="p-desc">
                  {p === "standard" && "A clean transferable token with fixed supply and ownership control."}
                  {p === "mintable" && "Mint extra supply later when growth calls for it."}
                  {p === "community" && "Per-transaction and per-wallet limits for tighter control."}
                  {p === "custom" && "Start from the base contract and switch every feature manually."}
                </span>
              </button>
            ))}
          </div>

          <div className="base-box">
            <div className="base-head">
              <span className="f-ic" aria-hidden="true"><i className="fa-solid fa-cube"></i></span>
              <span className="f-txt">
                <b>Base BEP-20 Token</b>
                <span className="f-desc">Always included. Standard BEP-20, fixed initial supply and ownership controls.</span>
              </span>
              {configState.ok && (
                <span className="base-cost"><em>Base</em>{formatWeiBnbDisplay(configState.value.baseFeeWei)} BNB</span>
              )}
            </div>
            <ul className="base-rows">
              <li><i className="fa-solid fa-check" aria-hidden="true"></i>Standard BEP-20</li>
              <li><i className="fa-solid fa-check" aria-hidden="true"></i>Fixed initial supply</li>
              <li><i className="fa-solid fa-check" aria-hidden="true"></i>Ownership controls</li>
            </ul>
          </div>

          <div className="feat-list">
            <span className="f-group-label">Supply Controls</span>
            <div className={"f-row" + (feats.burn ? " is-on" : "")} id="f-row-burnable">
              <span className="f-left">
                <span className="f-ic" aria-hidden="true"><i className="fa-solid fa-fire"></i></span>
                <span className="f-txt">
                  <b>Burnable</b>
                  <span className="f-desc">Remove tokens from circulation permanently.</span>
                </span>
              </span>
              <span className="f-right">
                {configState.ok && (
                  <span className="f-price"><em>Add-on</em>+{formatWeiBnbDisplay(configState.value.featureFees.burn as bigint)} BNB</span>
                )}
                <label className="switch">
                  <input type="checkbox" data-feat="burnable" aria-label="Burnable" checked={feats.burn} onChange={() => toggle("burn")} />
                  <span className="sl" aria-hidden="true"></span>
                </label>
              </span>
            </div>
            <div className={"f-row" + (feats.mint ? " is-on" : "")} id="f-row-mintable">
              <span className="f-left">
                <span className="f-ic" aria-hidden="true"><i className="fa-solid fa-arrow-trend-up"></i></span>
                <span className="f-txt">
                  <b>Mintable</b>
                  <span className="f-desc">Create additional supply after launch, under owner control.</span>
                </span>
              </span>
              <span className="f-right">
                {configState.ok && (
                  <span className="f-price"><em>Add-on</em>+{formatWeiBnbDisplay(configState.value.featureFees.mint as bigint)} BNB</span>
                )}
                <label className="switch">
                  <input type="checkbox" data-feat="mintable" aria-label="Mintable" checked={feats.mint} onChange={() => toggle("mint")} />
                  <span className="sl" aria-hidden="true"></span>
                </label>
              </span>
            </div>
            <span className="f-group-label">Transfer Controls</span>
            <div className={"f-row" + (feats.pause ? " is-on" : "")} id="f-row-pausable">
              <span className="f-left">
                <span className="f-ic" aria-hidden="true"><i className="fa-solid fa-circle-pause"></i></span>
                <span className="f-txt">
                  <b>Pausable</b>
                  <span className="f-desc">Pause transfers instantly in an emergency.</span>
                </span>
              </span>
              <span className="f-right">
                {configState.ok && (
                  <span className="f-price"><em>Add-on</em>+{formatWeiBnbDisplay(configState.value.featureFees.pause as bigint)} BNB</span>
                )}
                <label className="switch">
                  <input type="checkbox" data-feat="pausable" aria-label="Pausable" checked={feats.pause} onChange={() => toggle("pause")} />
                  <span className="sl" aria-hidden="true"></span>
                </label>
              </span>
            </div>
            <div className={"f-row" + (feats.maxTx ? " is-on" : "")} id="f-row-maxbuy">
              <span className="f-left">
                <span className="f-ic" aria-hidden="true"><i className="fa-solid fa-arrow-right-arrow-left"></i></span>
                <span className="f-txt">
                  <b>Max Transaction Limit</b>
                  <span className="f-desc">Cap how much a single transfer can move.</span>
                </span>
              </span>
              <span className="f-right">
                {configState.ok && (
                  <span className="f-price"><em>Add-on</em>+{formatWeiBnbDisplay(configState.value.featureFees.maxTx as bigint)} BNB</span>
                )}
                <label className="switch">
                  <input type="checkbox" data-feat="maxbuy" aria-label="Max Transaction Limit" checked={feats.maxTx} onChange={() => toggle("maxTx")} />
                  <span className="sl" aria-hidden="true"></span>
                </label>
              </span>
              <span className={"f-extra" + (inv.xb ? " is-invalid" : "")} id="xr-maxbuy">
                <span className="xrow">
                  <label htmlFor="x-maxbuy">Max per tx</label>
                  <input
                    id="x-maxbuy"
                    type="number"
                    value={xMaxbuy}
                    min="0.1"
                    max="100"
                    step="0.1"
                    inputMode="decimal"
                    onChange={(e) => {
                      setXMaxbuy(e.target.value);
                      setInv((cur) => ({ ...cur, xb: !extraOk(e.target.value) }));
                    }}
                  />
                </span>
                <span className="xhint">Share of total supply — a single transfer can&apos;t exceed this %. 0.1–100%.</span>
                <span className="xerr">Enter a value between 0.1 and 100%.</span>
              </span>
            </div>
            <div className={"f-row" + (feats.maxWallet ? " is-on" : "")} id="f-row-maxwal">
              <span className="f-left">
                <span className="f-ic" aria-hidden="true"><i className="fa-solid fa-wallet"></i></span>
                <span className="f-txt">
                  <b>Max Wallet Limit</b>
                  <span className="f-desc">Cap how much a single wallet can hold.</span>
                </span>
              </span>
              <span className="f-right">
                {configState.ok && (
                  <span className="f-price"><em>Add-on</em>+{formatWeiBnbDisplay(configState.value.featureFees.maxWallet as bigint)} BNB</span>
                )}
                <label className="switch">
                  <input type="checkbox" data-feat="maxwal" aria-label="Max Wallet Limit" checked={feats.maxWallet} onChange={() => toggle("maxWallet")} />
                  <span className="sl" aria-hidden="true"></span>
                </label>
              </span>
              <span className={"f-extra" + (inv.xw ? " is-invalid" : "")} id="xr-maxwal">
                <span className="xrow">
                  <label htmlFor="x-maxwal">Max per wallet</label>
                  <input
                    id="x-maxwal"
                    type="number"
                    value={xMaxwal}
                    min="0.1"
                    max="100"
                    step="0.1"
                    inputMode="decimal"
                    onChange={(e) => {
                      setXMaxwal(e.target.value);
                      setInv((cur) => ({ ...cur, xw: !extraOk(e.target.value) }));
                    }}
                  />
                </span>
                <span className="xhint">Share of total supply — a wallet can&apos;t hold beyond this %. 0.1–100%.</span>
                <span className="xerr">Enter a value between 0.1 and 100%.</span>
              </span>
            </div>
            <span className="f-group-label">Access Controls</span>
            <div className={"f-row" + (feats.blacklist ? " is-on" : "")} id="f-row-blacklist">
              <span className="f-left">
                <span className="f-ic" aria-hidden="true"><i className="fa-solid fa-ban"></i></span>
                <span className="f-txt">
                  <b>Blacklist</b>
                  <span className="f-desc">Block specific wallets from holding or transferring.</span>
                </span>
              </span>
              <span className="f-right">
                {configState.ok && (
                  <span className="f-price"><em>Add-on</em>+{formatWeiBnbDisplay(configState.value.featureFees.blacklist as bigint)} BNB</span>
                )}
                <label className="switch">
                  <input type="checkbox" data-feat="blacklist" aria-label="Blacklist" checked={feats.blacklist} onChange={() => toggle("blacklist")} />
                  <span className="sl" aria-hidden="true"></span>
                </label>
              </span>
            </div>
            <div className={"f-row" + (feats.whitelist ? " is-on" : "")} id="f-row-whitelist">
              <span className="f-left">
                <span className="f-ic" aria-hidden="true"><i className="fa-solid fa-user-check"></i></span>
                <span className="f-txt">
                  <b>Whitelist</b>
                  <span className="f-desc">Restrict transfers to a pre-approved set of wallets.</span>
                </span>
              </span>
              <span className="f-right">
                {configState.ok && (
                  <span className="f-price"><em>Add-on</em>+{formatWeiBnbDisplay(configState.value.featureFees.whitelist as bigint)} BNB</span>
                )}
                <label className="switch">
                  <input type="checkbox" data-feat="whitelist" aria-label="Whitelist" checked={feats.whitelist} onChange={() => toggle("whitelist")} />
                  <span className="sl" aria-hidden="true"></span>
                </label>
              </span>
            </div>
            <span className="f-group-label">Ownership</span>
            <div className="f-row" id="f-row-owntransfer">
              <span className="f-left">
                <span className="f-ic" aria-hidden="true"><i className="fa-solid fa-share-nodes"></i></span>
                <span className="f-txt">
                  <b>Transfer Ownership</b>
                  <span className="f-desc">Pass the contract to a multisig or someone else anytime.</span>
                </span>
              </span>
              <span className="f-right"><span className="f-inc">Included</span></span>
            </div>
            <div className="f-row" id="f-row-ownrenounce">
              <span className="f-left">
                <span className="f-ic" aria-hidden="true"><i className="fa-solid fa-user-slash"></i></span>
                <span className="f-txt">
                  <b>Renounce Ownership</b>
                  <span className="f-desc">Lock the contract to its final form, forever.</span>
                </span>
              </span>
              <span className="f-right"><span className="f-inc">Included</span></span>
              <span className="warn">
                <i className="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>Renouncing is irreversible once executed on-chain. After that, no one — not even you — can restore control or change the contract.
              </span>
            </div>
          </div>

          <details className="adv">
            <summary>
              <span className="adv-lbl"><i className="fa-solid fa-chevron-right" aria-hidden="true"></i>Advanced Features</span>
              <span className="soon">Coming later</span>
            </summary>
            <div className="adv-list">
              <div className="adv-row">
                <span className="a-ic" aria-hidden="true"><i className="fa-solid fa-percent"></i></span>
                <span className="a-txt"><b>Buy / Sell Tax</b><span>Set tax rates and a treasury wallet for every transfer.</span></span>
                <span className="soon">Coming later</span>
              </div>
              <div className="adv-row">
                <span className="a-ic" aria-hidden="true"><i className="fa-solid fa-bullseye"></i></span>
                <span className="a-txt"><b>Marketing Wallet</b><span>Route a share of every trade to a project wallet.</span></span>
                <span className="soon">Coming later</span>
              </div>
              <div className="adv-row">
                <span className="a-ic" aria-hidden="true"><i className="fa-solid fa-circle-minus"></i></span>
                <span className="a-txt"><b>Fee Exemption</b><span>Exempt contract, liquidity or selected wallets from fees.</span></span>
                <span className="soon">Coming later</span>
              </div>
              <div className="adv-row">
                <span className="a-ic" aria-hidden="true"><i className="fa-solid fa-robot"></i></span>
                <span className="a-txt"><b>Anti-bot</b><span>Block automated traders around launch.</span></span>
                <span className="soon">Coming later</span>
              </div>
              <div className="adv-row">
                <span className="a-ic" aria-hidden="true"><i className="fa-solid fa-water"></i></span>
                <span className="a-txt"><b>Auto Liquidity</b><span>Lock a flow of liquidity into a DEX pool automatically.</span></span>
                <span className="soon">Coming later</span>
              </div>
            </div>
          </details>
        </section>

        <section className="form-box" style={{ marginBottom: 0 }}>
          <div className="form-sec-h">
            <span className="idx">03</span>
            <h2>Before you deploy</h2>
          </div>
          <div className="safety">
            <h3><i className="fa-solid fa-shield-halved" aria-hidden="true"></i>Double-check these</h3>
            <ul>
              <li><i className="fa-solid fa-check" aria-hidden="true"></i>The token is deployed on BNB Smart Chain.</li>
              <li><i className="fa-solid fa-check" aria-hidden="true"></i>Deployment is signed from your connected wallet.</li>
              <li><i className="fa-solid fa-check" aria-hidden="true"></i>BNB Token Maker never accesses your private keys or seed phrase.</li>
              <li><i className="fa-solid fa-check" aria-hidden="true"></i>Platform fee and BNB Smart Chain network gas are separate.</li>
              <li><i className="fa-solid fa-check" aria-hidden="true"></i>Network gas is paid in BNB.</li>
              <li><i className="fa-solid fa-check" aria-hidden="true"></i>Your contract address is shown right after deployment.</li>
              <li><i className="fa-solid fa-check" aria-hidden="true"></i>Irreversible actions — like Renounce Ownership — are clearly warned.</li>
            </ul>
          </div>
        </section>
      </div>

      <aside className="summary-wrap" aria-label="Deployment summary">
        <div className="summary">
          <div className="sum-head">
            <b><i className="fa-solid fa-list-check" aria-hidden="true"></i>Deployment Summary</b>
          </div>
          <div className="sum-rows">
            <div className="sum-row">
              <span>Network</span>
              <b className="sum-net">
                <img className="net-ico" src="/logo-bnb-chain.svg" alt="" width="14" height="14" />BNB Smart Chain
              </b>
            </div>
            <div className="sum-row"><span>Standard</span><b>BEP-20</b></div>
            <div className="sum-row"><span>Token</span><b id="sumToken">{nameDisplay} · {symDisplay}</b></div>
            <div className="sum-row"><span>Supply</span><b id="sumSupply">{supplyDisplay}</b></div>
            <div className="sum-row"><span>Decimals</span><b id="sumDec">{decDisplay}</b></div>
          </div>
          <hr className="sum-sep" />
          <div className="sum-label">Selected features</div>
          <div className="sum-feats" id="sumFeats">
            <span className="is-in">Standard BEP-20</span>
            {result !== null &&
              result.selectedFeatures.map((id) => (
                <span className="is-in" key={id}>{SUMMARY_LABEL[id]}</span>
              ))}
          </div>
          <hr className="sum-sep" />
          <div className="sum-label">Pricing</div>
          {result !== null ? (
            <>
            <div className="price-break">
              <div className="price-row"><span>Base BEP-20 Token</span><span>{formatWeiBnbDisplay(result.baseFeeWei)} BNB</span></div>
              {result.lineItems.map((item) => (
                <div className="price-row" key={item.feature}>
                  <span>{SUMMARY_LABEL[item.feature]}</span>
                  <span>+{formatWeiBnbDisplay(item.priceWei)} BNB</span>
                </div>
              ))}
              {promoQuote !== null && promoQuote.campaign ? (
                <>
                  <div className="price-row"><span>Subtotal</span><span><s>{formatWeiBnbDisplay(BigInt(promoQuote.subtotalWei))} BNB</s></span></div>
                  <div className="price-row"><span>{promoQuote.campaign.name} (−{basisPointsLabel(promoQuote.campaign.discountBasisPoints)}%)</span><span>−{formatWeiBnbDisplay(BigInt(promoQuote.discountWei))} BNB</span></div>
                </>
              ) : campaignEstimate !== null && activeCampaign !== null ? (
                <>
                  <div className="price-row"><span>Subtotal</span><span><s>{formatWeiBnbDisplay(result.subtotalWei)} BNB</s></span></div>
                  <div className="price-row"><span>Campaign “{activeCampaign.name}” (−{basisPointsLabel(activeCampaign.discountBasisPoints)}%)</span><span>−{formatWeiBnbDisplay(campaignEstimate.discountWei)} BNB</span></div>
                </>
              ) : null}
              <div className="price-total">
                <span className="lbl">Standard price</span>
                <span className="val" id="pTotal" data-pricing-version={promoQuote !== null ? promoQuote.pricingVersion : serverQuote.pricingVersion} data-quote-state={promoQuote !== null ? "quoted" : "estimate"}>{formatWeiBnbDisplay(promoQuote !== null ? BigInt(promoQuote.totalWei) : campaignEstimate !== null ? campaignEstimate.totalWei : result.totalPlatformFeeWei)} BNB</span>
              </div>
              {promoQuote !== null && promoQuote.campaign ? (
                <p className="gas-note">{promoQuote.campaign.endsAt !== null ? `Promo ends ${new Date(promoQuote.campaign.endsAt).toUTCString()}. ` : ""}Authoritative server quote — re-quoted again before deployment.</p>
              ) : campaignEstimate !== null && activeCampaign !== null ? (
                <p className="gas-note">Campaign discount ends {new Date(activeCampaign.endsAt).toUTCString()}. The final price is re-quoted from the server before deployment.</p>
              ) : null}
              <div className="price-row"><span>Testnet platform fee</span><span>0 BNB</span></div>
              <p className="gas-note" id="feeNote">Reference product price — testnet deployments are fee-free (0 BNB platform fee + network gas).</p>
            </div>
            <div style={{ marginTop: ".7rem" }}>
              <div className="price-row" style={{ alignItems: "center" }}>
                <label htmlFor="promoCode"><span>Promo code</span></label>
                {appliedCode !== null ? (
                  <span className="mono" style={{ fontSize: ".72rem" }}>“{appliedCode.toUpperCase()}” applied</span>
                ) : null}
              </div>
              <div style={{ display: "flex", gap: ".5rem", marginTop: ".35rem" }}>
                <input
                  id="promoCode"
                  type="text"
                  autoComplete="off"
                  placeholder="e.g. LAUNCH10"
                  value={codeInput}
                  onChange={(event) => setCodeInput(event.target.value)}
                  disabled={promo.status === "loading"}
                  aria-describedby="promoNote"
                  style={{ flex: 1, minWidth: 0, background: "var(--bg)", border: "1px solid var(--line-strong)", borderRadius: "8px", padding: ".6rem .75rem", color: "var(--text)", font: "500 .85rem/1.2 var(--font-mono)" }}
                />
                {appliedCode !== null ? (
                  <button className="btn btn-ghost" type="button" onClick={clearPromoCode}>Remove</button>
                ) : (
                  <button className="btn btn-ghost" type="button" onClick={applyPromoCode} disabled={codeInput.trim().length === 0 || promo.status === "loading"}>Apply</button>
                )}
              </div>
              <div id="promoNote" aria-live="polite">
                {promo.status === "loading" ||
                (appliedCode !== null && promo.status === "idle") ? (
                  <p className="gas-note">Checking code…</p>
                ) : null}
                {promo.status === "invalid" ? (
                  <p className="gas-note" role="alert">That code isn&apos;t active right now — check the code or continue without it.</p>
                ) : null}
                {promo.status === "unavailable" ? (
                  <p className="gas-note" role="alert">Price check unavailable — showing the standard estimate.</p>
                ) : null}
              </div>
            </div>
            </>
          ) : (
            <div className="warn" id="pricingFault" role="alert">
              <i className="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>Pricing is temporarily unavailable. Please try again later.
            </div>
          )}
          <p className="gas-note">Network gas is paid to BNB Smart Chain separately and shown just before you sign.</p>
          <SummaryActions
            walletConnected={walletConnected}
            needsNetworkSwitch={needsNetworkSwitch}
            connectorName={walletConnector?.name ?? null}
            walletAddrText={shortenAddress(walletAddress)}
            eligible={deploymentEligibility.eligible}
            wrongChainLabel={
              needsNetworkSwitch ? networkLabel(walletChainId) : null
            }
            canContinue={formValid && walletConnected}
            onContinue={goToDeploy}
            onConnect={() => openWallet("connect")}
            onOpenAccount={() => openWallet("account")}
          />
        </div>
      </aside>
    </div>
  );
}