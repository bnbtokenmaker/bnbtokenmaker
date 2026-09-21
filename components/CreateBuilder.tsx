"use client";

import { useEffect, useMemo, useState } from "react";

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
import { DRAFT_DEFAULTS } from "../lib/draft";
import type { DraftConfig } from "../lib/draft";

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
};

export function CreateBuilder({
  pricingConfigDto,
  serverQuote,
  initialDraft = DRAFT_DEFAULTS,
}: CreateBuilderProps) {
  const [name, setName] = useState(() => initialDraft.name);
  const [sym, setSym] = useState(() => initialDraft.symbol);
  const [dec, setDec] = useState(() => initialDraft.decimals);
  const [supply, setSupply] = useState(() => initialDraft.supply);
  const [feats, setFeats] = useState<FeatureSelection>(DEFAULT_FEAT_SELECTION);
  const [xMaxbuy, setXMaxbuy] = useState("1");
  const [xMaxwal, setXMaxwal] = useState("2");
  const [inv, setInv] = useState<Inv>(CLEAR_INV);

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
              inputMode="numeric"
              autoComplete="off"
              onChange={(e) => setSupply(e.target.value)}
              onBlur={() => {
                const f = fmtNumber(supply);
                setSupply(f || "0");
                const sn = parseInt((supply || "").replace(/\D/g, ""), 10);
                setInv((cur) => ({ ...cur, supply: !(sn > 0) }));
              }}
            />
            <span className="field-hint">Initial number of tokens created at deployment.</span>
            <span className="err">Total supply must be greater than zero.</span>
          </label>
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
                  {p === "standard" && (<><span>Fixed supply</span><span>Burnable</span><span>Ownership control</span></>)}
                  {p === "mintable" && (<><span>Mintable</span><span>Burnable</span><span>Ownership control</span></>)}
                  {p === "community" && (<><span>Burnable</span><span>Max transaction</span><span>Max wallet</span></>)}
                  {p === "custom" && (<><span>Base BEP-20</span><span>You decide</span></>)}
                </span>
                <span className="p-desc">
                  {p === "standard" && "A clean transferable token with burn and ownership control."}
                  {p === "mintable" && "Mint extra supply later when growth calls for it."}
                  {p === "community" && "Burnable, with per-transaction and per-wallet limits for tighter control."}
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
            <div className="price-break">
              <div className="price-row"><span>Base BEP-20 Token</span><span>{formatWeiBnbDisplay(result.baseFeeWei)} BNB</span></div>
              {result.lineItems.map((item) => (
                <div className="price-row" key={item.feature}>
                  <span>{SUMMARY_LABEL[item.feature]}</span>
                  <span>+{formatWeiBnbDisplay(item.priceWei)} BNB</span>
                </div>
              ))}
              <div className="price-total">
                <span className="lbl">Platform fee</span>
                <span className="val" id="pTotal" data-pricing-version={serverQuote.pricingVersion} data-quote-state="estimate">{formatWeiBnbDisplay(result.totalPlatformFeeWei)} BNB</span>
              </div>
              <p className="gas-note" id="feeNote">Estimate — the exact amount is confirmed by the server when you deploy.</p>
            </div>
          ) : (
            <div className="warn" id="pricingFault" role="alert">
              <i className="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>Pricing is temporarily unavailable. Please try again later.
            </div>
          )}
          <p className="gas-note">Network gas is paid to BNB Smart Chain separately and shown just before you sign.</p>
          <div className="sum-actions">
            <button className="btn btn-primary" type="button" id="walletBtn">
              <i className="fa-solid fa-wallet" aria-hidden="true"></i>Connect Wallet
            </button>
            <button className="btn btn-dark" type="button" id="createBtn" disabled>
              Create Token
            </button>
            <p className="sum-note">Connect your wallet to continue.</p>
          </div>
        </div>
      </aside>
    </div>
  );
}