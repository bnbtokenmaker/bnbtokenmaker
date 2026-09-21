"use client";

import Link from "next/link";
import { useState } from "react";

import {
  DRAFT_DEFAULTS,
  formatDecimals,
  formatSupplyDigits,
  formatSupplyDisplay,
  draftToQuery,
} from "../lib/draft";

function clampDecimals(raw: string): string {
  if (raw === "") return DRAFT_DEFAULTS.decimals;
  const value = formatDecimals(raw);
  return value ?? DRAFT_DEFAULTS.decimals;
}

export function HeroWizard() {
  const [name, setName] = useState<string>(DRAFT_DEFAULTS.name);
  const [symbol, setSymbol] = useState<string>(DRAFT_DEFAULTS.symbol);
  const [decimals, setDecimals] = useState<string>(DRAFT_DEFAULTS.decimals);
  const [supply, setSupply] = useState<string>(DRAFT_DEFAULTS.supply);

  function updateSymbol(next: string) {
    setSymbol(next.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11));
  }

  function updateSupply(next: string) {
    setSupply(next);
  }

  function commitSupply() {
    const digits = formatSupplyDigits(supply);
    setSupply(digits === null ? DRAFT_DEFAULTS.supply : formatSupplyDisplay(digits) ?? DRAFT_DEFAULTS.supply);
  }

  const query = draftToQuery({
    name,
    symbol,
    decimals: clampDecimals(decimals),
    supply: formatSupplyDigits(supply) ?? DRAFT_DEFAULTS.supply,
  });

  const previewDecimals = clampDecimals(decimals);
  const previewSupply =
    formatSupplyDisplay(formatSupplyDigits(supply) ?? DRAFT_DEFAULTS.supply) ??
    DRAFT_DEFAULTS.supply;
  const previewName = name.trim() === "" ? DRAFT_DEFAULTS.name : name.trim();
  const previewSymbol = symbol.trim() === "" ? DRAFT_DEFAULTS.symbol : symbol.trim();

  return (
    <aside className="deck reveal is-in" aria-label="Token configuration preview">
      <div className="deck-head">
        <span className="lbl"><span className="pulse"></span>New token</span>
        <span className="net"><img className="net-ico" src="/logo-bnb-chain.svg" alt="" width="14" height="14" />BNB Smart Chain</span>
      </div>
      <div className="deck-body">
        <label className="field">
          <span className="field-label">Token name</span>
          <input
            id="f-name"
            type="text"
            value={name}
            maxLength={40}
            spellCheck={false}
            autoComplete="off"
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <div className="field-row">
          <label className="field">
            <span className="field-label">Symbol</span>
            <input
              id="f-symbol"
              type="text"
              value={symbol}
              maxLength={11}
              spellCheck={false}
              autoComplete="off"
              onChange={(e) => updateSymbol(e.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">Decimals</span>
            <input
              id="f-dec"
              type="number"
              value={decimals}
              min={0}
              max={18}
              inputMode="numeric"
              onChange={(e) => setDecimals(e.target.value.replace(/\D/g, "").slice(0, 2))}
              onBlur={() => setDecimals(clampDecimals(decimals))}
            />
            <span className="field-hint">Standard&nbsp;·&nbsp;max&nbsp;18</span>
          </label>
        </div>
        <label className="field">
          <span className="field-label">Total supply</span>
          <input
            id="f-supply"
            type="text"
            value={supply}
            inputMode="numeric"
            autoComplete="off"
            onChange={(e) => updateSupply(e.target.value)}
            onBlur={commitSupply}
          />
        </label>
        <div className="preview" aria-live="polite">
          <span className="p-lbl">Draft</span>
          <span className="p-val" id="pv">
            {previewName}&nbsp;·&nbsp;{previewSymbol}&nbsp;·&nbsp;{previewSupply}&nbsp;·&nbsp;{previewDecimals}&nbsp;dec.
          </span>
        </div>
      </div>
      <div className="deck-foot">
        <div className="estimate">
          <span className="est">≈ 2 min</span>
          <span className="est-txt">estimated deployment&nbsp;·&nbsp;network fees paid in BNB</span>
        </div>
        <Link
          className="btn btn-primary"
          href={{ pathname: "/create", query: Object.fromEntries(query) }}
          style={{ width: "100%" }}
        >
          Create Token
          <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
        </Link>
        <div className="deploy-note">
          <i className="fa-solid fa-check" aria-hidden="true"></i>
          Signed from your wallet&nbsp;·&nbsp;source ready for verification on BscScan
        </div>
      </div>
    </aside>
  );
}