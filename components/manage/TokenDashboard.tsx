"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useConnection } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { formatUnits } from "viem";
import { isSupportedV1ChainId } from "../../lib/deploy/chains";

import { managerPublicClient } from "../../lib/manage/client";
import { useWalletUI } from "../wallet/WalletUI";
import {
  classificationLabel,
  type TokenClassification,
} from "../../lib/manage/classification";
import {
  canBurnFrom,
  canBurnOwn,
  ownerActions,
  unavailableReason,
  type ManagerActionId,
  type TokenCapabilities,
} from "../../lib/manage/permissions";
import {
  burnCall,
  burnFromCall,
  enableTradingCall,
  mintCall,
  pauseCall,
  renounceOwnershipCall,
  setAMMPairCall,
  setBlacklistedCall,
  setFeeExemptCall,
  setMarketingWalletCall,
  setSwapBackEnabledCall,
  setWhitelistEnforcedCall,
  setWhitelistedCall,
  transferOwnershipCall,
  unpauseCall,
} from "../../lib/manage/calls";
import { mintCapacity } from "../../lib/manage/capacity";
import { trackManagerEvent } from "../../lib/manage/analytics";
import { parseHumanToBaseUnits } from "../../lib/deploy/v1-config";
import { tokenAbi } from "../../lib/token/factory";
import { TxAction } from "./TxAction";
import { useTokenData, type V1TokenState } from "./useTokenData";

function fmtAmount(value: bigint | null, decimals: number | null): string {
  if (value === null || decimals === null) return "—";
  try {
    const whole = formatUnits(value, decimals);
    const [head, tail = ""] = whole.split(".");
    const grouped = Number(head).toLocaleString("en-US");
    return tail ? `${grouped}.${tail.slice(0, 6)}` : grouped;
  } catch {
    return value.toString(10);
  }
}

function isAddressString(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}

function AddressInput({
  id,
  label,
  value,
  onChange,
  placeholder = "0x…",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <span className="xrow">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="text"
        value={value}
        spellCheck={false}
        autoComplete="off"
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value.trim())}
      />
    </span>
  );
}

function AmountInput({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <span className="xrow">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="text"
        value={value}
        inputMode="decimal"
        autoComplete="off"
        placeholder="0.0"
        onChange={(e) => onChange(e.target.value)}
      />
    </span>
  );
}

function PairInspector({
  token,
  chainId,
}: {
  token: `0x${string}`;
  chainId: number;
}) {
  const [pair, setPair] = useState("");
  const [result, setResult] = useState<null | {
    flagged: boolean | null;
    blacklisted: boolean | null;
    whitelisted: boolean | null;
    hasCode: boolean | null;
  }>(null);
  const [checking, setChecking] = useState(false);
  const inspect = async () => {
    if (!isAddressString(pair)) {
      setResult(null);
      return;
    }
    setChecking(true);
    try {
      const addr = pair as `0x${string}`;
      // Reads must run on the dashboard's own chain; an unsupported chain
      // yields no result rather than another chain's state.
      const client = managerPublicClient(chainId);
      if (!client) {
        setResult(null);
        return;
      }
      const [flagged, blacklisted, whitelisted, code] = await Promise.all([
        client.readContract({ address: token, abi: tokenAbi as never, functionName: "automatedMarketMakerPairs", args: [addr] } as never).catch(() => null),
        client.readContract({ address: token, abi: tokenAbi as never, functionName: "isBlacklisted", args: [addr] } as never).catch(() => null),
        client.readContract({ address: token, abi: tokenAbi as never, functionName: "isWhitelisted", args: [addr] } as never).catch(() => null),
        client.getBytecode({ address: addr }).catch(() => null),
      ]);
      setResult({
        flagged: typeof flagged === "boolean" ? flagged : null,
        blacklisted: typeof blacklisted === "boolean" ? blacklisted : null,
        whitelisted: typeof whitelisted === "boolean" ? whitelisted : null,
        hasCode: typeof code === "string" ? code !== "0x" && code.length > 2 : null,
      });
    } finally {
      setChecking(false);
    }
  };
  return (
    <div className="mgr-action" data-action="pairInspect">
      <h4>Inspect pair address</h4>
      <p className="deploy-muted">
        Check whether an address is a registered liquidity pair. Only
        registered pairs get buy/sell detection — never assume an arbitrary
        address is a safe pair.
      </p>
      <AddressInput id="mgr-pair-inspect" label="Pair address" value={pair} onChange={setPair} />
      <button type="button" className="btn btn-ghost" disabled={!isAddressString(pair) || checking} onClick={() => void inspect()}>
        {checking ? "Checking…" : "Inspect"}
      </button>
      {result && (
        <dl className="deploy-review">
          <div><dt>Registered pair</dt><dd>{result.flagged === null ? "—" : result.flagged ? "Yes" : "No"}</dd></div>
          <div><dt>Blacklisted</dt><dd>{result.blacklisted === null ? "—" : result.blacklisted ? "Yes" : "No"}</dd></div>
          <div><dt>Whitelisted</dt><dd>{result.whitelisted === null ? "—" : result.whitelisted ? "Yes" : "No"}</dd></div>
          <div><dt>Contract code present</dt><dd>{result.hasCode === null ? "—" : result.hasCode ? "Yes — real contract" : "No — externally owned account"}</dd></div>
        </dl>
      )}
    </div>
  );
}

function RenounceSection({
  token,
  symbol,
  chainId,
  disabledReason,
  action,
  onDone,
}: {
  token: `0x${string}`;
  symbol: string | null;
  chainId: number;
  disabledReason: string | null;
  action: ManagerActionId;
  onDone: () => void;
}) {
  const [ack, setAck] = useState(false);
  const [typed, setTyped] = useState("");
  const expect = (symbol ?? "").toUpperCase();
  const ready = ack && typed.trim().toUpperCase() === expect && expect.length > 0;
  const [confirmArmed, setConfirmArmed] = useState(false);
  void confirmArmed;
  void setConfirmArmed;
  if (disabledReason !== null) {
    return (
      <div className="mgr-action" data-action={action}>
        <h4>Renounce ownership</h4>
        <p className="deploy-muted" role="note">Unavailable — {disabledReason}</p>
      </div>
    );
  }
  return (
    <div className="mgr-action" data-action={action}>
      <h4>Renounce ownership</h4>
      <p className="deploy-muted">
        Destructive and irreversible. After renouncing you lose: minting,
        pause/unpause, blacklist/whitelist management, marketing wallet
        changes, fee exemption changes, AMM pair management, swapBack control,
        and every other owner-only action. There is no platform recovery
        mechanism.
      </p>
      <label>
        <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} /> I
        understand this cannot be undone.
      </label>
      <span className="xrow">
        <label htmlFor="mgr-renounce-type">Type the token symbol ({expect || "—"}) to confirm</label>
        <input
          id="mgr-renounce-type"
          type="text"
          value={typed}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setTyped(e.target.value)}
        />
      </span>
      <TxAction
        action={action}
        title="Renounce ownership"
        expectedChainId={chainId}
        submitLabel="Renounce ownership"
        danger
        disabledReason={ready ? null : "Confirm the acknowledgement and symbol above first."}
        confirmText="This permanently removes all owner authority. Sign only if you are certain."
        buildCall={() => renounceOwnershipCall(token)}
        onDone={onDone}
      />
    </div>
  );
}

export function TokenDashboard({
  chainId,
  tokenAddress,
}: {
  chainId: number;
  tokenAddress: string;
}) {
  const { isConnected, address } = useConnection();
  const { open: openWallet } = useWalletUI();
  const validAddress =
    /^0x[a-fA-F0-9]{40}$/.test(tokenAddress.trim()) && isSupportedV1ChainId(chainId);
  const token = (validAddress ? tokenAddress.toLowerCase() : null) as `0x${string}` | null;
  const account = (
    isConnected && address && /^0x[a-fA-F0-9]{40}$/.test(address)
      ? address.toLowerCase()
      : null
  ) as `0x${string}` | null;

  const { data, isLoading, isError, refetch } = useTokenData(
    validAddress && isSupportedV1ChainId(chainId) ? chainId : null,
    token,
    account
  );
  const blockQuery = useQuery({
    queryKey: ["manager-block", chainId],
    // Block height must come from the dashboard's chain: comparing a testnet
    // block number against a mainnet launchBlock would corrupt the anti-bot
    // window verdict.
    queryFn: async () => {
      const client = managerPublicClient(chainId);
      if (!client) throw new Error("unsupported-chain");
      return client.getBlockNumber();
    },
    enabled: validAddress,
    retry: 1,
    staleTime: 15_000,
  });

  const inspectedRef = useRef<Set<string> | null>(null);
  if (inspectedRef.current === null) inspectedRef.current = new Set<string>();
  useEffect(() => {
    const seen = inspectedRef.current as Set<string>;
    if (data && !seen.has(data.address)) {
      seen.add(data.address);
      trackManagerEvent(
        {
          name: "token_inspected",
          chainId: data.chainId,
          kind: data.classification.kind,
        },
        typeof window !== "undefined" ? window.gtag : undefined
      );
    }
  }, [data]);

  if (!validAddress) {
    return (
      <div className="deploy-card" role="alert">
        <h3>Unsupported manager target</h3>
        <p className="deploy-muted">
          {!isSupportedV1ChainId(chainId)
            ? "Only BNB Smart Chain (56) and BNB Smart Chain Testnet (97) are supported."
            : "That is not a valid token contract address."}
        </p>
        <Link className="btn btn-ghost" href="/manage">Back to Token Manager</Link>
      </div>
    );
  }

  return (
    <div className="mgr-dash">
      {!isConnected ? (
        <div className="deploy-card">
          <h3>Connect your wallet</h3>
          <p className="deploy-muted">
            Read-only inspection works without a wallet. Owner actions need the
            connected owner wallet.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => openWallet("connect")}>
            Connect Wallet
          </button>
        </div>
      ) : null}
      {isLoading && (
        <div className="deploy-card" role="status"><h3>Inspecting token…</h3></div>
      )}
      {isError && (
        <div className="deploy-card" role="alert">
          <h3>Inspection failed</h3>
          <p className="deploy-muted">The token could not be read. Check the address and try again.</p>
          <button type="button" className="btn btn-ghost" onClick={() => refetch()}>Retry</button>
        </div>
      )}
      {data && <DashboardBody data={data} account={account} onDone={() => refetch()} blockNumber={blockQuery.data ?? null} />}
    </div>
  );
}

function OverviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div><dt>{label}</dt><dd>{value}</dd></div>
  );
}

function DashboardBody({
  data,
  account,
  onDone,
  blockNumber,
}: {
  data: NonNullable<ReturnType<typeof useTokenData>["data"]>;
  account: `0x${string}` | null;
  onDone: () => void;
  blockNumber: bigint | null;
}) {
  const { classification } = data;
  const v1: V1TokenState | null = data.v1;
  const caps: TokenCapabilities = data.capabilities;
  const owner = v1?.owner ?? null;
  const ownerView = { kind: classification.kind, connected: account, owner, capabilities: caps } as const;
  const acts = ownerActions(ownerView);
  const has = (id: ManagerActionId) => acts.includes(id);
  const reason = (id: ManagerActionId) => unavailableReason(ownerView, id);
  const chainId = data.chainId;
  const token = data.address;
  const decimals = data.decimals;

  const capacity =
    v1?.maxSupply !== null && v1?.maxSupply !== undefined && v1?.totalMinted !== null && v1?.totalMinted !== undefined
      ? mintCapacity({ maxSupply: v1.maxSupply as bigint, totalMinted: v1.totalMinted as bigint })
      : null;

  const antibotActive =
    v1?.antiBotEnabled === true &&
    v1?.tradingEnabled === true &&
    v1?.launchBlock !== null &&
    v1?.snipeBlocks !== null &&
    blockNumber !== null
      ? blockNumber <= (v1.launchBlock as bigint) + (v1.snipeBlocks as bigint)
      : null;

  return (
    <>
      <div className="deploy-card">
        <div className="deploy-preview-tag" role="status">{classificationLabel(classification)}</div>
        <h3>{data.name ?? "Unknown token"} · {data.symbol ?? "—"}</h3>
        <p className="deploy-muted">
          This label reflects on-chain provenance evidence — not BscScan source verification.
        </p>
        <dl className="deploy-review">
          <OverviewRow label="Contract" value={<code className="mono">{token}</code>} />
          <OverviewRow label="Decimals" value={decimals ?? "—"} />
          <OverviewRow label="Total supply" value={fmtAmount(data.totalSupply, decimals)} />
          <OverviewRow label="Owner" value={owner ?? "—"} />
          <OverviewRow
            label="Connected wallet"
            value={
              account ??
              "Not connected — read-only. Holder and owner actions need a wallet; owner actions need the owner."
            }
          />
          {v1 && (
            <>
              <OverviewRow label="Lifetime minted" value={fmtAmount(v1.totalMinted, decimals)} />
              <OverviewRow
                label="Maximum lifetime supply"
                value={
                  v1.maxSupply === 0n
                    ? "Unlimited (explicit deployment choice)"
                    : fmtAmount(v1.maxSupply, decimals)
                }
              />
              {capacity?.kind === "capped" && (
                <OverviewRow label="Remaining mint capacity" value={fmtAmount(capacity.remaining, decimals)} />
              )}
              <OverviewRow label="Paused" value={v1.paused === null ? "—" : v1.paused ? "Yes" : "No"} />
              <OverviewRow label="Trading enabled" value={v1.tradingEnabled === null ? "—" : v1.tradingEnabled ? "Yes" : "No"} />
              <OverviewRow label="Buy / sell tax" value={`${v1.buyTaxBps === null ? "—" : `${Number(v1.buyTaxBps) / 100}%`} / ${v1.sellTaxBps === null ? "—" : `${Number(v1.sellTaxBps) / 100}%`}`} />
              <OverviewRow label="Marketing wallet" value={v1.marketingWallet ?? "—"} />
              <OverviewRow label="SwapBack" value={v1.swapBackEnabled === null ? "—" : v1.swapBackEnabled ? "Enabled" : "Disabled"} />
              <OverviewRow
                label="Anti-bot"
                value={
                  !caps.antiBotEnabled
                    ? "Not enabled"
                    : v1.tradingEnabled
                      ? `Launched at block ${v1.launchBlock?.toString(10) ?? "—"} · window ${v1.snipeBlocks?.toString(10) ?? "—"} blocks · ${
                          antibotActive === null ? "status unknown" : antibotActive ? "window active" : "window expired"
                        }`
                      : "Not launched — owner action pending"
                }
              />
              <OverviewRow
                label="Max transaction / wallet"
                value={`${v1.maxTxAmount === 0n ? "off" : fmtAmount(v1.maxTxAmount, decimals)} / ${v1.maxWalletAmount === 0n ? "off" : fmtAmount(v1.maxWalletAmount, decimals)}`}
              />
              <OverviewRow label="Your balance" value={fmtAmount(v1.userBalance, decimals)} />
            </>
          )}
        </dl>
      </div>

      {classification.kind !== "own-v1" && (
        <div className="deploy-card" role="note">
          <h3>{classification.kind === "external" ? "External token — inspection only" : "Unsupported token"}</h3>
          <p className="deploy-muted">
            {classification.kind === "external"
              ? "Only safely detected read capabilities are shown. Write controls stay unavailable in V1: selector existence never proves semantics, and unknown custom mutators are never exposed."
              : "This address cannot be managed: it holds no contract code or no readable token surface."}
          </p>
          {classification.kind === "external" && classification.detected.length > 0 && (
            <p className="deploy-muted">Detected reads: {classification.detected.join(", ")}.</p>
          )}
        </div>
      )}

      {classification.kind === "own-v1" && v1 && (
        <>
          {!data.isOwner && (
            <div className="deploy-card" role="note">
              <h3>Read-only for this wallet</h3>
              <p className="deploy-muted">
                The connected wallet is not the on-chain owner, so owner-only actions are
                disabled. Holder actions (burning your own tokens) remain available.
              </p>
            </div>
          )}

          <section className="form-box" aria-label="Supply management">
            <div className="form-sec-h"><span className="idx">S1</span><h2>Supply</h2></div>
            {has("mint") ? (
              <MintSection token={token} chainId={chainId} v1={v1} decimals={decimals} disabledReason={reason("mint")} action="mint" onDone={onDone} />
            ) : (
              <TxAction action="mint" title="Mint" expectedChainId={chainId} submitLabel="Mint" disabledReason={reason("mint")} confirmText="" buildCall={() => null} onDone={onDone} />
            )}
            <BurnSection token={token} chainId={chainId} decimals={decimals} canBurn={canBurnOwn(ownerView)} canBurnFrom={canBurnFrom(ownerView)} balance={v1.userBalance} onDone={onDone} />
          </section>

          <section className="form-box" aria-label="Pause controls">
            <div className="form-sec-h"><span className="idx">S2</span><h2>Pause</h2></div>
            <p className="deploy-muted">
              Current state: <b>{v1.paused ? "Paused" : "Unpaused"}</b>. Pausing affects
              transfers, mints and burns per the frozen contract behavior.
            </p>
            {caps.pausable ? (
              <>
                <TxAction action="pause" title="Pause" expectedChainId={chainId} submitLabel="Pause" disabledReason={reason("pause")} confirmText="Transfers, mints and burns will revert until unpaused." buildCall={() => pauseCall(token)} onDone={onDone} />
                <TxAction action="unpause" title="Unpause" expectedChainId={chainId} submitLabel="Unpause" disabledReason={reason("unpause")} confirmText="Transfers, mints and burns resume." buildCall={() => unpauseCall(token)} onDone={onDone} />
              </>
            ) : (
              <TxAction action="pause" title="Pause" expectedChainId={chainId} submitLabel="Pause" disabledReason={reason("pause")} confirmText="" buildCall={() => null} onDone={onDone} />
            )}
          </section>

          <section className="form-box" aria-label="List management">
            <div className="form-sec-h"><span className="idx">S3</span><h2>Blacklist / Whitelist</h2></div>
            <ListSection token={token} chainId={chainId} caps={caps} reason={reason} onDone={onDone} />
          </section>

          <section className="form-box" aria-label="Trading management">
            <div className="form-sec-h"><span className="idx">S4</span><h2>Trading</h2></div>
            <p className="deploy-muted">Tax rates were fixed at deployment.</p>
            <MarketingChangeSection token={token} chainId={chainId} reason={reason} onDone={onDone} />
            <ExemptionSection token={token} chainId={chainId} reason={reason} onDone={onDone} />
          </section>

          <section className="form-box" aria-label="AMM pairs">
            <div className="form-sec-h"><span className="idx">S5</span><h2>Liquidity pairs</h2></div>
            <p className="deploy-muted">
              Pair configuration affects buy/sell detection. Only register addresses you
              verified as real liquidity pairs — an arbitrary address is never a safe pair.
            </p>
            <PairInspector token={token} chainId={chainId} />
            <PairManageSection token={token} chainId={chainId} reason={reason} onDone={onDone} />
          </section>

          <section className="form-box" aria-label="Launch and liquidity">
            <div className="form-sec-h"><span className="idx">S6</span><h2>Launch &amp; liquidity</h2></div>
            {caps.antiBotEnabled && !v1.tradingEnabled ? (
              <TxAction action="enableTrading" title="Enable trading" expectedChainId={chainId} submitLabel="Enable trading" disabledReason={reason("enableTrading")} confirmText="One-way action: the launch block is set now, the anti-bot window starts, and it can never be restarted or extended." buildCall={() => enableTradingCall(token)} onDone={onDone} />
            ) : caps.antiBotEnabled ? (
              <p className="deploy-muted">Trading is enabled — the launch action is permanently gone.</p>
            ) : null}
            {caps.autoLiquidityEnabled ? (
              <>
                <p className="deploy-muted">
                  LP created by auto-liquidity is permanently sent to the burn address. The
                  platform cannot recover LP, and disabling swapBack creates no platform custody.
                </p>
                <SwapBackSection token={token} chainId={chainId} enabled={v1.swapBackEnabled} disabledReason={reason("swapBackToggle")} onDone={onDone} />
              </>
            ) : null}
          </section>

          <section className="form-box" aria-label="Ownership">
            <div className="form-sec-h"><span className="idx">S7</span><h2>Ownership</h2></div>
            <OwnershipSection token={token} chainId={chainId} reason={reason} onDone={onDone} />
            <RenounceSection token={token} symbol={data.symbol} chainId={chainId} disabledReason={reason("renounceOwnership")} action="renounceOwnership" onDone={onDone} />
          </section>
        </>
      )}
    </>
  );
}

function MintSection({
  token, chainId, v1, decimals, disabledReason, action, onDone,
}: {
  token: `0x${string}`;
  chainId: number;
  v1: V1TokenState;
  decimals: number | null;
  disabledReason: string | null;
  action: ManagerActionId;
  onDone: () => void;
}) {
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const cap =
    v1.maxSupply !== null && v1.totalMinted !== null
      ? mintCapacity({ maxSupply: v1.maxSupply, totalMinted: v1.totalMinted })
      : null;
  const parsed = decimals === null ? null : parseHumanToBaseUnits(amount, decimals);
  const overCap =
    cap?.kind === "capped" && parsed !== null
      ? parsed > cap.remaining
      : false;
  const buildError =
    !isAddressString(to)
      ? "Enter a valid recipient address."
      : parsed === null
        ? "Enter a valid amount."
        : overCap
          ? `Exceeds remaining lifetime capacity (${fmtAmount(cap?.kind === "capped" ? cap.remaining : null, decimals)}).`
          : null;
  return (
    <div>
      {cap?.kind === "capped" && (
        <p className="deploy-muted">
          Remaining lifetime mint capacity: <b>{fmtAmount(cap.remaining, decimals)}</b>
          {cap.exhausted ? " (exhausted)" : ""}. Burning never restores capacity.
        </p>
      )}
      {cap?.kind === "unlimited" && (
        <p className="deploy-muted">
          Unlimited lifetime issuance (explicit deployment choice).
        </p>
      )}
      <TxAction
        action={action}
        title="Mint"
        description="Owner-only. Mints new tokens to the recipient."
        expectedChainId={chainId}
        submitLabel="Mint"
        disabledReason={disabledReason}
        confirmText={`Mint ${amount || "—"} to ${to || "—"}?`}
        buildCall={() => (parsed === null || overCap ? null : mintCall(token, to, parsed))}
        buildError={buildError}
        onDone={onDone}
      >
        <AddressInput id="mgr-mint-to" label="Recipient" value={to} onChange={setTo} />
        <AmountInput id="mgr-mint-amount" label="Amount" value={amount} onChange={setAmount} />
      </TxAction>
    </div>
  );
}

function BurnSection({
  token, chainId, decimals, canBurn, canBurnFrom: canFrom, balance, onDone,
}: {
  token: `0x${string}`;
  chainId: number;
  decimals: number | null;
  canBurn: boolean;
  canBurnFrom: boolean;
  balance: bigint | null;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [from, setFrom] = useState("");
  const [fromAmount, setFromAmount] = useState("");
  const parsed = decimals === null ? null : parseHumanToBaseUnits(amount, decimals);
  const parsedFrom = decimals === null ? null : parseHumanToBaseUnits(fromAmount, decimals);
  return (
    <div>
      <p className="deploy-muted">
        Your balance: <b>{fmtAmount(balance, decimals)}</b>. Burning never restores mint capacity.
      </p>
      {canBurn ? (
        <TxAction
          action="burn"
          title="Burn my tokens"
          description="Holder action: destroys your own tokens."
          expectedChainId={chainId}
          submitLabel="Burn"
          disabledReason={null}
          confirmText={`Burn ${amount || "—"} of your tokens?`}
          buildCall={() => (parsed === null ? null : burnCall(token, parsed))}
          buildError={parsed === null ? "Enter a valid amount." : null}
          onDone={onDone}
        >
          <AmountInput id="mgr-burn-amount" label="Amount" value={amount} onChange={setAmount} />
        </TxAction>
      ) : null}
      {canFrom ? (
        <TxAction
          action="burnFrom"
          title="Burn from (allowance)"
          description="Burns another holder's tokens using your allowance. They must approve this wallet first — there are no shortcuts."
          expectedChainId={chainId}
          submitLabel="Burn from"
          disabledReason={null}
          confirmText={`Burn ${fromAmount || "—"} from ${from || "—"} using your allowance?`}
          buildCall={() =>
            !isAddressString(from) || parsedFrom === null ? null : burnFromCall(token, from, parsedFrom)
          }
          buildError={
            !isAddressString(from)
              ? "Enter the holder address."
              : parsedFrom === null
                ? "Enter a valid amount."
                : null
          }
          onDone={onDone}
        >
          <AddressInput id="mgr-burnfrom-from" label="Holder" value={from} onChange={setFrom} />
          <AmountInput id="mgr-burnfrom-amount" label="Amount" value={fromAmount} onChange={setFromAmount} />
        </TxAction>
      ) : null}
    </div>
  );
}

function ListSection({
  token, chainId, caps, reason, onDone,
}: {
  token: `0x${string}`;
  chainId: number;
  caps: TokenCapabilities;
  reason: (id: ManagerActionId) => string | null;
  onDone: () => void;
}) {
  const [addr, setAddr] = useState("");
  const valid = isAddressString(addr);
  return (
    <div>
      {caps.blacklistEnabled ? (
        <>
          <TxAction action="blacklistAdd" title="Blacklist address" expectedChainId={chainId} submitLabel="Block address" disabledReason={reason("blacklistAdd")} confirmText={`Block ${addr || "—"}? A registered liquidity pair can never be blacklisted — the contract rejects it.`} buildCall={() => (valid ? setBlacklistedCall(token, addr, true) : null)} buildError={valid ? null : "Enter a valid address."} onDone={onDone}>
            <AddressInput id="mgr-blacklist" label="Address" value={addr} onChange={setAddr} />
          </TxAction>
          <TxAction action="blacklistRemove" title="Unblock address" expectedChainId={chainId} submitLabel="Unblock" disabledReason={reason("blacklistRemove")} confirmText={`Unblock ${addr || "—"}?`} buildCall={() => (valid ? setBlacklistedCall(token, addr, false) : null)} buildError={valid ? null : "Enter a valid address."} onDone={onDone} />
        </>
      ) : null}
      {caps.whitelistEnabled ? (
        <>
          <TxAction action="whitelistAdd" title="Whitelist address" expectedChainId={chainId} submitLabel="Approve address" disabledReason={reason("whitelistAdd")} confirmText={`Approve ${addr || "—"}?`} buildCall={() => (valid ? setWhitelistedCall(token, addr, true) : null)} buildError={valid ? null : "Enter a valid address."} onDone={onDone} />
          <TxAction action="whitelistRemove" title="Remove from whitelist" expectedChainId={chainId} submitLabel="Remove" disabledReason={reason("whitelistRemove")} confirmText={`Remove ${addr || "—"}?`} buildCall={() => (valid ? setWhitelistedCall(token, addr, false) : null)} buildError={valid ? null : "Enter a valid address."} onDone={onDone} />
        </>
      ) : null}
      {!caps.blacklistEnabled && !caps.whitelistEnabled && (
        <p className="deploy-muted">Neither list capability was enabled at deployment.</p>
      )}
      {caps.whitelistEnabled && <WhitelistEnforceSection token={token} chainId={chainId} reason={reason} onDone={onDone} />}
    </div>
  );
}

function WhitelistEnforceSection({
  token, chainId, reason, onDone,
}: {
  token: `0x${string}`;
  chainId: number;
  reason: (id: ManagerActionId) => string | null;
  onDone: () => void;
}) {
  const [enforced, setEnforced] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const client = managerPublicClient(chainId);
        if (!client) {
          if (!cancelled) setEnforced(null);
          return;
        }
        const v = (await client.readContract({
          address: token,
          abi: tokenAbi as never,
          functionName: "whitelistEnforced",
        } as never)) as unknown;
        if (!cancelled) setEnforced(typeof v === "boolean" ? v : null);
      } catch {
        if (!cancelled) setEnforced(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, chainId, revision]);
  return (
    <TxAction
      action="whitelistEnforce"
      title="Whitelist enforcement"
      description={`Currently: ${loading ? "reading…" : enforced === null ? "unknown" : enforced ? "enforced" : "open"}. Toggling changes who may transfer.`}
      expectedChainId={chainId}
      submitLabel={enforced ? "Disable enforcement" : "Enable enforcement"}
      disabledReason={reason("whitelistEnforce")}
      confirmText={`Set whitelist enforcement to ${enforced ? "off" : "on"}?`}
      buildCall={() => (enforced === null ? null : setWhitelistEnforcedCall(token, !enforced))}
      buildError={enforced === null ? "Current state is unreadable." : null}
      onDone={() => {
        onDone();
        setRevision((n) => n + 1);
      }}
    />
  );
}

function MarketingChangeSection({
  token, chainId, reason, onDone,
}: {
  token: `0x${string}`;
  chainId: number;
  reason: (id: ManagerActionId) => string | null;
  onDone: () => void;
}) {
  const [wallet, setWallet] = useState("");
  const valid = isAddressString(wallet);
  return (
    <TxAction
      action="marketingChange"
      title="Change marketing wallet"
      description="The marketing share of future swaps goes to the new wallet. Never a platform wallet."
      expectedChainId={chainId}
      submitLabel="Change wallet"
      disabledReason={reason("marketingChange")}
      confirmText={`Set the marketing wallet to ${wallet || "—"}?`}
      buildCall={() => (valid ? setMarketingWalletCall(token, wallet) : null)}
      buildError={valid ? null : "Enter a valid wallet address."}
      onDone={onDone}
    >
      <AddressInput id="mgr-mktwallet" label="New marketing wallet" value={wallet} onChange={setWallet} />
    </TxAction>
  );
}

function ExemptionSection({
  token, chainId, reason, onDone,
}: {
  token: `0x${string}`;
  chainId: number;
  reason: (id: ManagerActionId) => string | null;
  onDone: () => void;
}) {
  const [addr, setAddr] = useState("");
  const valid = isAddressString(addr);
  return (
    <div>
      <TxAction action="feeExemptAdd" title="Add fee exemption" expectedChainId={chainId} submitLabel="Exempt address" disabledReason={reason("feeExemptAdd")} confirmText={`Exempt ${addr || "—"} from buy/sell tax? Liquidity pairs stay taxable by design.`} buildCall={() => (valid ? setFeeExemptCall(token, addr, true) : null)} buildError={valid ? null : "Enter a valid address."} onDone={onDone}>
        <AddressInput id="mgr-exempt" label="Address" value={addr} onChange={setAddr} />
      </TxAction>
      <TxAction action="feeExemptRemove" title="Remove fee exemption" expectedChainId={chainId} submitLabel="Remove exemption" disabledReason={reason("feeExemptRemove")} confirmText={`Remove the exemption for ${addr || "—"}?`} buildCall={() => (valid ? setFeeExemptCall(token, addr, false) : null)} buildError={valid ? null : "Enter a valid address."} onDone={onDone} />
    </div>
  );
}

function PairManageSection({
  token, chainId, reason, onDone,
}: {
  token: `0x${string}`;
  chainId: number;
  reason: (id: ManagerActionId) => string | null;
  onDone: () => void;
}) {
  const [pair, setPair] = useState("");
  const valid = isAddressString(pair);
  return (
    <div>
      <TxAction action="pairAdd" title="Register pair" expectedChainId={chainId} submitLabel="Register" disabledReason={reason("pairAdd")} confirmText={`Register ${pair || "—"} as a liquidity pair? Only register addresses you verified as real pairs.`} buildCall={() => (valid ? setAMMPairCall(token, pair, true) : null)} buildError={valid ? null : "Enter a valid pair address."} onDone={onDone}>
        <AddressInput id="mgr-pair-add" label="Pair address" value={pair} onChange={setPair} />
      </TxAction>
      <TxAction action="pairRemove" title="Unregister pair" expectedChainId={chainId} submitLabel="Unregister" disabledReason={reason("pairRemove")} confirmText={`Unregister ${pair || "—"}? Buy/sell detection stops covering it.`} buildCall={() => (valid ? setAMMPairCall(token, pair, false) : null)} buildError={valid ? null : "Enter a valid pair address."} onDone={onDone} />
    </div>
  );
}

function SwapBackSection({
  token, chainId, enabled, disabledReason, onDone,
}: {
  token: `0x${string}`;
  chainId: number;
  enabled: boolean | null;
  disabledReason: string | null;
  onDone: () => void;
}) {
  if (enabled === null) return null;
  return (
    <TxAction
      action="swapBackToggle"
      title={enabled ? "Disable swapBack" : "Enable swapBack"}
      description="Recovery breaker for the swap loop only — transfers always process either way."
      expectedChainId={chainId}
      submitLabel={enabled ? "Disable" : "Enable"}
      disabledReason={disabledReason}
      confirmText={`Set swapBack ${enabled ? "off" : "on"}?`}
      buildCall={() => setSwapBackEnabledCall(token, !enabled)}
      onDone={onDone}
    />
  );
}

function OwnershipSection({
  token, chainId, reason, onDone,
}: {
  token: `0x${string}`;
  chainId: number;
  reason: (id: ManagerActionId) => string | null;
  onDone: () => void;
}) {
  const [next, setNext] = useState("");
  const valid = isAddressString(next);
  return (
    <TxAction
      action="transferOwnership"
      title="Transfer ownership"
      description="The new owner receives every owner-only management authority. Double-check the address — a wrong address locks you out with no recovery."
      expectedChainId={chainId}
      submitLabel="Transfer ownership"
      disabledReason={reason("transferOwnership")}
      confirmText={`Transfer ownership to ${next || "—"}?`}
      buildCall={() => (valid ? transferOwnershipCall(token, next) : null)}
      buildError={valid ? null : "Enter a valid new-owner address."}
      onDone={onDone}
    >
      <AddressInput id="mgr-new-owner" label="New owner" value={next} onChange={setNext} />
    </TxAction>
  );
}

export type { TokenClassification };
