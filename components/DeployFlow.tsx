"use client";

/**
 * Phase 7D-E2 deployment flow: REVIEW → AUTHORIZE → VALIDATE → WALLET →
 * BROADCAST → RECEIPT against the frozen V1 factory.
 *
 * Dual-chain: supports BSC Mainnet (56) and BSC Testnet (97).
 * The intended chain is set by the parent component (production = 56, testnet = 97).
 *
 * Security posture (mirrors Phase 6A/6B, no new wallet logic):
 * - No automatic network switching: no wallet_switchEthereumChain /
 *   wallet_addEthereumChain calls anywhere in this file.
 * - Immediately before the transaction, the session-pinned provider is
 *   re-verified (same object, expected account, fresh eth_chainId) and the
 *   live chain must match the intended chain. Cached wagmi/UI state never authorizes.
 * - The V1 factory address is resolved from explicit configuration for the
 *   intended chain; when unset, deployment is unavailable (fail-closed) —
 *   the legacy Phase 6B factory is NEVER silently substituted for V1 calls.
 * - Money comes only from the signed EIP-712 authorization (exact
 *   msg.value = feeWei); gas is estimated via the real factory call and
 *   always displayed separately.
 * - The signed TokenConfig is never reconstructed or mutated after
 *   authorization: calldata is built from the package, and ANY form change
 *   invalidates the package.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { useConnection } from "wagmi";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { createPublicClient, http } from "viem";
import { bsc, bscTestnet } from "viem/chains";

import { useWalletNetwork } from "./wallet/useWalletNetwork";
import { useWalletUI } from "./wallet/WalletUI";
import { networkLabel } from "../lib/wallet/chains";
import { shortenAddress } from "../lib/wallet/format";
import {
  ProviderAccountMismatchError,
  ProviderSessionMismatchError,
  ProviderSessionMissingError,
  getProviderSession,
  verifyProviderSession,
  type SessionConnectorLike,
} from "../lib/wallet/session";
import {
  ProviderChainReadError,
  WalletProviderUnavailableError,
} from "../lib/wallet/switch";
import { formatWeiBnbCompact, formatWeiBnbDisplay } from "../lib/pricing";
import { clearDeployDraft } from "../lib/deploy/draft-transfer";
import { selectedFeatureIds, type FeatureSelection } from "../lib/pricing/presets";
import { factoryAddress, v1FactoryAddress } from "../lib/token/factory";
import {
  authorizationFingerprint,
  isGasEstimateReady,
  isPackageOwnerMatch,
  isPackageUsable,
  packageToCalldata,
  parseDeploymentPackage,
  validateV1Form,
  type ParsedDeploymentPackage,
  type V1FormState,
} from "../lib/deploy/v1-config";
import type { AuthorizeTokenInput } from "../lib/deploy/authorize";
import { trackCreateEvent } from "../lib/deploy/analytics";
import {
  clearDeployResult,
  fetchAndVerifyDeployResult,
  loadDeployResult,
  saveDeployResult,
  storedResultMatchesDraft,
  type DeployResultV1,
  type VerifiedDeployment,
} from "../lib/deploy/result";
import {
  PHASE6B_CHAIN_ID,
  Phase6bDeploymentError,
  assertPhase6bChain,
} from "../lib/deploy/phase6b";
import {
  INITIAL_DEPLOY_STATE,
  DeployTransitionError,
  hasSubmittedTx,
  isDeployLocked,
  transition,
  type DeployEvent,
} from "../lib/deploy/machine";
import {
  DeployFlowError,
  classifyDeployFailure,
  classifyReceiptFailure,
  deployErrorMessage,
  devQueryErrorCode,
  type DeployErrorCode,
} from "../lib/deploy/errors";
import {
  fetchAuthoritativeQuote,
  type AuthoritativeQuote,
} from "../lib/deploy/quote-client";
import {
  clearPendingDeployment,
  explorerTokenPageUrl,
  explorerTxUrl,
  findDeployedTokenAddress,
  findDeploymentPaid,
  isReceiptSuccess,
  isTxHash,
  loadPendingDeployment,
  savePendingDeployment,
  shortenTxHash,
  type PendingDeployment,
} from "../lib/deploy/tx";
import { requestDeploymentRecord } from "../lib/deploy/record-client";
import { BSC_MAINNET_CHAIN_ID, BSC_TESTNET_CHAIN_ID, isSupportedV1ChainId } from "../lib/deploy/chains";

const RECEIPT_TIMEOUT_MS = 120_000;

const mainnetPublicClient = createPublicClient({
  chain: bsc,
  transport: http(),
});

const testnetPublicClient = createPublicClient({
  chain: bscTestnet,
  transport: http(),
});

function publicClientForChain(chainId: number) {
  if (chainId === BSC_MAINNET_CHAIN_ID) return mainnetPublicClient;
  if (chainId === BSC_TESTNET_CHAIN_ID) return testnetPublicClient;
  return null;
}

export type DeployFlowProps = {
  tokenName: string;
  tokenSymbol: string;
  decimals: string;
  supply: string;
  feats: FeatureSelection;
  maxTxPercent: string;
  maxWalletPercent: string;
  /** Intended deployment chain (56 for mainnet, 97 for testnet). */
  intendedChainId: number;
  /** V1 additions (optional for backward compat with pre-V1 drafts). */
  mintMode?: "capped" | "unlimited";
  maxSupplyHuman?: string;
  buyTaxBps?: string;
  sellTaxBps?: string;
  marketingWallet?: string;
  snipeBlocks?: string;
};

type GasSnapshot = {
  gas: bigint;
  gasPriceWei: bigint;
  costWei: bigint;
  balanceWei: bigint;
};

/** Server-quote reference price label (shared by preview + review so the
 * wording stays accurate regardless of selected features). */
export const PRODUCT_PRICE_LABEL = "Product price (server quote)";

/**
 * Success-announcement guard for the scroll/focus safety net: true only the
 * first time a confirmed success with a given hash is observed — never
 * before receipt, never twice for the same transaction.
 */
export function shouldScrollToSuccess(
  phase: string,
  txHash: string | null,
  seenTxHash: string | null
): boolean {
  return phase === "success" && txHash !== null && seenTxHash !== txHash;
}

type SuccessPanelProps = {
  name: string;
  symbol: string;
  token: `0x${string}`;
  txHash: `0x${string}` | null;
  copied: string | null;
  onCopy: (label: string, value: string) => void;
  onCreateAnother: () => void;
  /** Live path passes the scroll-target ref; restored path passes null. */
  panelRef: RefObject<HTMLDivElement | null> | null;
  /** Exact platform fee paid (wei), when known from the V1 package. */
  feePaidWei?: string | null;
  /** Priced capability ids deployed with, for the success summary. */
  features?: readonly string[] | null;
};

/**
 * Shared success presentation for live and refresh-restored success.
 * Rendered ONLY from a confirmed receipt + decoded factory event — never
 * from storage alone (the restored path verifies first; see result.ts).
 */
function SuccessPanel({
  name,
  symbol,
  token,
  txHash,
  copied,
  onCopy,
  onCreateAnother,
  panelRef,
  feePaidWei = null,
  features = null,
}: SuccessPanelProps) {
  return (
    <div
      className="deploy-success"
      role="status"
      ref={panelRef}
      tabIndex={-1}
      aria-label="Token deployed successfully"
    >
      <h3>
        <i className="fa-solid fa-circle-check" aria-hidden="true"></i>Token deployed
        successfully
      </h3>
      <p className="deploy-success-token">
        {name} · {symbol}
      </p>
      <dl className="deploy-review">
        <div>
          <dt>Contract</dt>
          <dd>
            <code className="mono">{token}</code>{" "}
            <button
              type="button"
              className="linklike"
              aria-label="Copy contract address"
              onClick={() => onCopy("token", token)}
            >
              {copied === "token" ? "Copied" : "Copy"}
            </button>
          </dd>
        </div>
        <div>
          <dt>Transaction</dt>
          <dd>
            <code className="mono">{shortenTxHash(txHash ?? "")}</code>{" "}
            <button
              type="button"
              className="linklike"
              aria-label="Copy transaction hash"
              onClick={() => onCopy("tx", txHash ?? "")}
            >
              {copied === "tx" ? "Copied" : "Copy"}
            </button>
          </dd>
        </div>
        <div>
          <dt>Network</dt>
          <dd>BNB Smart Chain Testnet (97)</dd>
        </div>
        {feePaidWei !== null && (
          <div>
            <dt>Platform fee paid</dt>
            <dd>{formatWeiBnbDisplay(BigInt(feePaidWei))} BNB</dd>
          </div>
        )}
        {features !== null && features.length > 0 && (
          <div>
            <dt>Features</dt>
            <dd>{features.map((id) => <FeatureSummaryLabel key={id} id={id} />).reduce<ReactNode[]>(
              (acc, node, index) => (index === 0 ? [node] : [...acc, ", ", node]),
              []
            )}</dd>
          </div>
        )}
      </dl>
      <div className="deploy-actions deploy-success-actions">
        {explorerTokenPageUrl(token) && (
          <a
            className="btn btn-dark btn-deploy"
            href={explorerTokenPageUrl(token) ?? ""}
            target="_blank"
            rel="noopener noreferrer"
          >
            View contract on explorer
          </a>
        )}
        <span className="deploy-actions-row">
          {txHash && explorerTxUrl(txHash) && (
            <a
              className="btn btn-ghost"
              href={explorerTxUrl(txHash) ?? ""}
              target="_blank"
              rel="noopener noreferrer"
            >
              View transaction
            </a>
          )}
          <Link
            className="btn btn-ghost"
            href={`/manage/97/${token}`}
          >
            Manage Token
          </Link>
          <button type="button" className="btn btn-ghost" onClick={onCreateAnother}>
            Create another token
          </button>
        </span>
      </div>
    </div>
  );
}

function FeatureSummaryLabel({ id }: { id: string }) {
  const labels: Record<string, string> = {
    burn: "Burnable",
    mint: "Mintable",
    pause: "Pausable",
    maxTx: "Max Transaction",
    maxWallet: "Max Wallet",
    blacklist: "Blacklist",
    whitelist: "Whitelist",
    trading: "Trading fees",
    antiBot: "Anti-bot",
    autoLiquidity: "Auto-liquidity",
  };
  return <>{labels[id] ?? id}</>;
}

/** Plain-object authorize input for the API body (module scope: pure). */
function authorizeInputToJson(input: AuthorizeTokenInput): Record<string, unknown> {
  return {
    name: input.name,
    symbol: input.symbol,
    decimals: input.decimals,
    initialSupplyBase: input.initialSupplyBase,
    owner: input.owner,
    burnable: input.burnable,
    mintable: input.mintable,
    pausable: input.pausable,
    maxTxAmountBase: input.maxTxAmountBase,
    maxWalletAmountBase: input.maxWalletAmountBase,
    blacklistEnabled: input.blacklistEnabled,
    whitelistEnabled: input.whitelistEnabled,
    buyTaxBps: input.buyTaxBps,
    sellTaxBps: input.sellTaxBps,
    marketingWallet: input.marketingWallet,
    marketingShareBps: input.marketingShareBps,
    liquidityShareBps: input.liquidityShareBps,
    autoLiquidityEnabled: input.autoLiquidityEnabled,
    swapThresholdBase: input.swapThresholdBase,
    antiBotEnabled: input.antiBotEnabled,
    snipeBlocks: input.snipeBlocks,
    maxSupplyBase: input.maxSupplyBase,
  };
}

export function DeployFlow({
  tokenName,
  tokenSymbol,
  decimals,
  supply,
  feats,
  maxTxPercent,
  maxWalletPercent,
  intendedChainId,
  mintMode = "capped",
  maxSupplyHuman = "",
  buyTaxBps = "4",
  sellTaxBps = "6",
  marketingWallet = "",
  snipeBlocks = "5",
}: DeployFlowProps) {
  const { isConnected, address, connector } = useConnection();
  const network = useWalletNetwork();
  const { open: openWallet } = useWalletUI();

  const [machine, send] = useReducer(transition, INITIAL_DEPLOY_STATE);
  const [deployedToken, setDeployedToken] = useState<`0x${string}` | null>(null);
  // Session-scoped recovery, read lazily once (storage-guarded, SSR-safe):
  // a stored hash can be re-checked, never resubmitted.
  const [recovered, setRecovered] = useState<PendingDeployment | null>(
    () => loadPendingDeployment()
  );
  const [copied, setCopied] = useState<string | null>(null);
  const attemptLock = useRef(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successRef = useRef<HTMLDivElement | null>(null);
  const announcedRef = useRef<string | null>(null);
  // Phase 7A server persistence: best-effort, once per transaction, never
  // blocking and never surfaced — blockchain success is established before
  // this is ever called, so a recording outage must not alter success UI.
  const recordedRef = useRef<Set<string>>(new Set());
  const recordServerSide = useCallback((txHash: `0x${string}`) => {
    if (recordedRef.current.has(txHash)) return;
    recordedRef.current.add(txHash);
    void requestDeploymentRecord(intendedChainId, txHash);
  }, [intendedChainId]);
  // V1 authorization lifecycle: a package is valid only for the exact
  // fingerprint it was issued for; ANY form/account change discards it.
  const [authPkg, setAuthPkg] = useState<ParsedDeploymentPackage | null>(null);
  const [authFingerprint, setAuthFingerprint] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<{ fingerprint: string; code: string } | null>(null);
  const [paidInfo, setPaidInfo] = useState<{
    feeWei: string;
    pricingVersion: `0x${string}`;
    nonce: `0x${string}`;
  } | null>(null);
  // Coarse wall-clock for package-expiry gating (external sync, no render math).
  const [nowTick, setNowTick] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const timer = setInterval(() => setNowTick(Math.floor(Date.now() / 1000)), 15000);
    return () => clearInterval(timer);
  }, []);

  const featureIds = useMemo(() => selectedFeatureIds(feats), [feats]);
  const onTestnet = isConnected && network.status === "testnet";
  const onMainnet = isConnected && network.status === "mainnet";
  const intendedChainSupported = isSupportedV1ChainId(intendedChainId);
  const onIntendedChain = isConnected && network.chainId === intendedChainId;
  // V1 factory boundary: resolved for the intended chain only.
  // No cross-chain fallback. Unsupported chains return null (fail closed).
  const v1Factory = v1FactoryAddress(intendedChainId);

  // V1 form assembly from draft-carried props (review + authorize input).
  const v1Form: V1FormState = {
    name: tokenName,
    symbol: tokenSymbol,
    decimals,
    supplyHuman: supply,
    burnable: feats.burn,
    mintable: feats.mint,
    mintMode,
    maxSupplyHuman,
    pausable: feats.pause,
    maxTxOn: feats.maxTx,
    maxTxPercent,
    maxWalletOn: feats.maxWallet,
    maxWalletPercent,
    blacklist: feats.blacklist,
    whitelist: feats.whitelist,
    trading: feats.trading,
    buyTaxBps,
    sellTaxBps,
    marketingWallet,
    antiBot: feats.antiBot,
    snipeBlocks,
    autoLiquidity: feats.autoLiquidity,
  };
  const reviewOwner = (address ?? "0x0000000000000000000000000000000000000001") as `0x${string}`;
  const v1Review = useMemo(
    () => validateV1Form(v1Form, reviewOwner),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tokenName, tokenSymbol, decimals, supply, feats, mintMode, maxSupplyHuman, maxTxPercent, maxWalletPercent, buyTaxBps, sellTaxBps, marketingWallet, snipeBlocks, reviewOwner]
  );
  const reviewInput: AuthorizeTokenInput | null = v1Review.ok ? v1Review.input : null;
  const reviewValid =
    v1Review.ok && !(feats.blacklist && feats.whitelist) && onIntendedChain;

  const fingerprint = useMemo(() => {
    if (!reviewInput) return null;
    return authorizationFingerprint({
      token: reviewInput,
      chainId: intendedChainId,
      account: address ?? null,
    });
  }, [reviewInput, address, intendedChainId]);

  const dispatch = useCallback((event: DeployEvent) => {
    try {
      send(event);
    } catch (error) {
      // UI guards make illegal transitions unreachable; fail closed here so
      // a stray dispatch can never corrupt attempt state.
      if (!(error instanceof DeployTransitionError)) throw error;
    }
  }, []);

  // Any form/account change invalidates the current review. Authorization
  // staleness needs no effect: packages carry their issuance fingerprint
  // and only match the CURRENT fingerprint (locked attempts and
  // finished/error states are intentionally left untouched by the machine
  // so an in-flight hash is never lost).
  useEffect(() => {
    dispatch({ type: "FORM_CHANGED" });
  }, [fingerprint, dispatch]);

  // Fresh informational price for REVIEW (never client-calculated), served
  // by React Query: no fetch-in-effect, cached per feature selection. The
  // AUTHORITATIVE fee arrives with the signed package (see below).
  const quoteQuery = useQuery({
    queryKey: ["deploy-quote", intendedChainId, ...featureIds],
    queryFn: () => fetchAuthoritativeQuote(featureIds),
    enabled: onIntendedChain,
    retry: 1,
  });
  const refreshQuote = useCallback(() => {
    void quoteQuery.refetch();
  }, [quoteQuery]);
  // Quotes are only meaningful while connected to a known chain; stale data
  // from a previous connection is never rendered or used for gating.
  const quoteActive = onIntendedChain;
  const visibleQuote: AuthoritativeQuote | null = quoteActive
    ? (quoteQuery.data ?? null)
    : null;
  const quoteLoading = quoteActive && quoteQuery.isPending;
  const quoteFailed = quoteActive && quoteQuery.isError;

  // V1 authorization: exactly one package per fingerprint, requested
  // explicitly AFTER review. Never reconstructed, never mutated. A package
  // is usable only while its issuance fingerprint matches the CURRENT form
  // (any edit invalidates it without effects) and its expiry is in the
  // future (checked against a coarse ticking clock, never render math).
  const usablePkg =
    authPkg !== null &&
    authFingerprint !== null &&
    authFingerprint === fingerprint &&
    isPackageUsable(authPkg, nowTick)
      ? authPkg
      : null;
  const visibleAuthError =
    authError !== null && authError.fingerprint === fingerprint ? authError.code : null;

  const requestAuthorization = useCallback(async () => {
    if (authLoading) return;
    if (!isConnected || !address || !reviewInput || !fingerprint) return;
    if (!v1Factory) return;
    setAuthLoading(true);
    setAuthError(null);
    trackCreateEvent(
      { name: "authorization_requested", features: featureIds },
      typeof window !== "undefined" ? window.gtag : undefined
    );
    try {
      const response = await fetch("/api/deployments/authorize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: authorizeInputToJson(reviewInput), chainId: intendedChainId }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: { code?: string };
        } | null;
        throw new DeployFlowError(
          response.status === 503 ? "authorization-failed" : "invalid-config",
          typeof body?.error?.code === "string" ? body.error.code : undefined
        );
      }
      const body = (await response.json().catch(() => null)) as {
        package?: unknown;
      } | null;
      const pkg = parseDeploymentPackage(body?.package);
      if (pkg.factory.toLowerCase() !== v1Factory.toLowerCase() || pkg.chainId !== intendedChainId) {
        throw new DeployFlowError("authorization-failed", "factory-mismatch");
      }
      if (!isPackageOwnerMatch(pkg.token.owner, address)) {
        throw new DeployFlowError("authorization-failed", "account-changed");
      }
      setAuthPkg(pkg);
      setAuthFingerprint(fingerprint);
      trackCreateEvent({ name: "authorization_received", chainId: intendedChainId }, window.gtag);
    } catch (error) {
      if (error instanceof DeployFlowError) {
        setAuthError({ fingerprint, code: error.code });
      } else {
        setAuthError({ fingerprint, code: "authorization-failed" });
      }
      setAuthPkg(null);
      setAuthFingerprint(null);
    } finally {
      setAuthLoading(false);
    }
  }, [authLoading, isConnected, address, reviewInput, fingerprint, v1Factory, featureIds, intendedChainId]);

  // Gas preview for REVIEW: eth_call simulation + estimate on the EXACT
  // authorized payload (calldata + fee value). A reverted simulation or a
  // failed estimate blocks deployment (fail closed). Requires a usable
  // package — estimates are never shown for unsigned configurations.
  const gasQuery = useQuery({
    queryKey: [
      "deploy-gas",
      intendedChainId,
      fingerprint,
      usablePkg?.configHash ?? null,
      address?.toLowerCase() ?? null,
    ],
    queryFn: async (): Promise<GasSnapshot> => {
      if (!address) throw new DeployFlowError("wallet-disconnected");
      if (!usablePkg || !v1Factory) throw new DeployFlowError("authorization-failed");
      const client = publicClientForChain(intendedChainId);
      if (!client) throw new DeployFlowError("wrong-network");
      const account = address as `0x${string}`;
      const { data, valueHex } = packageToCalldata({
        token: usablePkg.token,
        quote: {
          configHash: usablePkg.quote.configHash,
          feeWei: usablePkg.quote.feeWei,
          chainId: usablePkg.quote.chainId,
          factory: usablePkg.quote.factory,
          nonce: usablePkg.quote.nonce,
          expiry: usablePkg.quote.expiry,
          pricingVersion: usablePkg.quote.pricingVersion,
        },
        signature: usablePkg.signature,
      });
      const value = BigInt(valueHex);
      try {
        await client.call({
          account,
          to: v1Factory,
          data,
          value,
        });
      } catch (error) {
        if (error instanceof DeployFlowError) throw error;
        throw new DeployFlowError("simulation-reverted");
      }
      try {
        const [estimate, gasPrice, balance] = await Promise.all([
          client.estimateGas({ account, to: v1Factory, data, value }),
          client.getGasPrice(),
          client.getBalance({ address: account }),
        ]);
        if (balance < value + estimate * gasPrice) {
          throw new DeployFlowError("insufficient-gas-funds");
        }
        return {
          gas: estimate,
          gasPriceWei: gasPrice,
          costWei: estimate * gasPrice,
          balanceWei: balance,
        };
      } catch (error) {
        if (error instanceof DeployFlowError) throw error;
        throw new DeployFlowError("gas-estimate-failed");
      }
    },
    enabled: isGasEstimateReady({
      onTestnet: onIntendedChain,
      address: address ?? null,
      hasQuote: !!visibleQuote,
      reviewValid,
      hasPackage: !!usablePkg,
    }),
    retry: 1,
  });
  const refreshGas = useCallback(() => {
    void gasQuery.refetch();
  }, [gasQuery]);
  // Before authorization there is simply no signed payload to estimate yet:
  // report neutral (—), not a failure. Real estimate failures after a usable
  // package exists still surface via gasFailed.
  const gasPreview: GasSnapshot | null =
    onIntendedChain && reviewValid ? (gasQuery.data ?? null) : null;
  const gasLoading = onIntendedChain && reviewValid && !!usablePkg && gasQuery.isPending;
  const gasFailed = onIntendedChain && reviewValid && !!usablePkg && gasQuery.isError;
  // Development-only diagnostics: sanitized error codes behind failed
  // quote/gas fetches. Null in production, so production UI is unchanged.
  const devQuoteCode = quoteFailed
    ? devQueryErrorCode(quoteQuery.error, "quote-stale")
    : null;
  const devGasCode = gasFailed
    ? devQueryErrorCode(gasQuery.error, "gas-estimate-failed")
    : null;

  const copyText = useCallback(async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      return;
    }
    setCopied(label);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(null), 2000);
  }, []);

  const waitForReceipt = useCallback(
    async (
      txHash: `0x${string}`,
      expected?: { feeWei: bigint; payer: `0x${string}` }
    ): Promise<{
      token: `0x${string}`;
      paid: { feeWei: string; pricingVersion: `0x${string}`; nonce: `0x${string}` } | null;
    }> => {
      const client = publicClientForChain(intendedChainId);
      if (!client) throw new DeployFlowError("wrong-network");
      const receipt = await client.waitForTransactionReceipt({
        hash: txHash,
        timeout: RECEIPT_TIMEOUT_MS,
      });
      if (!isReceiptSuccess(receipt.status)) {
        throw new DeployFlowError("tx-reverted");
      }
      const logs = receipt.logs as { topics: [`0x${string}`, ...`0x${string}`[]]; data: `0x${string}` }[];
      const token = findDeployedTokenAddress(logs);
      if (!token) {
        throw new DeployFlowError("event-missing");
      }
      const paid = findDeploymentPaid(logs);
      if (paid) {
        if (
          paid.token.toLowerCase() !== token.toLowerCase() ||
          (expected && paid.payer.toLowerCase() !== expected.payer.toLowerCase()) ||
          (expected && paid.feeWei !== expected.feeWei)
        ) {
          throw new DeployFlowError("fee-mismatch");
        }
        return {
          token,
          paid: {
            feeWei: paid.feeWei.toString(10),
            pricingVersion: paid.pricingVersion,
            nonce: paid.nonce,
          },
        };
      }
      return { token, paid: null };
    },
    [intendedChainId]
  );

  /** Full pre-transaction gate (V1). Throws DeployFlowError / Phase6b faults only. */
  const runPreTransactionGates = useCallback(async (): Promise<{
    factory: `0x${string}`;
    deployer: `0x${string}`;
    provider: { request: (args: { method: string; params?: unknown }) => Promise<unknown> };
    data: `0x${string}`;
    valueHex: `0x${string}`;
    feeWei: bigint;
    pkg: ParsedDeploymentPackage;
  }> => {
    if (!isConnected || !address || !connector) {
      throw new DeployFlowError("wallet-disconnected");
    }
    const session = getProviderSession();
    if (!session) {
      throw new DeployFlowError("provider-unavailable");
    }
    let verified: { provider: { request: (args: { method: string; params?: unknown }) => Promise<unknown> }; accounts: string[]; chainId: number };
    try {
      verified = await verifyProviderSession(
        connector as unknown as SessionConnectorLike,
        { expectedAddress: address }
      );
    } catch (error) {
      if (error instanceof ProviderAccountMismatchError) {
        throw new DeployFlowError("account-changed");
      }
      if (
        error instanceof ProviderSessionMissingError ||
        error instanceof ProviderSessionMismatchError ||
        error instanceof WalletProviderUnavailableError
      ) {
        throw new DeployFlowError("provider-unavailable");
      }
      if (error instanceof ProviderChainReadError) {
        throw new DeployFlowError("rpc-unavailable");
      }
      throw error;
    }
    // Authoritative live chain from the SELECTED provider (never cached UI).
    let liveChainId: number;
    try {
      liveChainId = verified.chainId;
      if (!isSupportedV1ChainId(liveChainId)) {
        throw new DeployFlowError("wrong-network");
      }
    } catch (error) {
      if (error instanceof DeployFlowError) throw error;
      if (error instanceof Phase6bDeploymentError) {
        if (error.reason === "chain-not-allowed" || error.reason === "stale-chain") {
          throw new DeployFlowError("wrong-network");
        }
        throw new DeployFlowError("rpc-unavailable");
      }
      throw error;
    }
    if (liveChainId !== intendedChainId) {
      throw new DeployFlowError("wrong-network");
    }
    const deployer = address.toLowerCase() as `0x${string}`;

    // A usable package for the CURRENT fingerprint is mandatory: the exact
    // signed config/fee/factory/chain, unexpired. Anything else fails closed.
    const nowSeconds = Math.floor(Date.now() / 1000);
    const pkg =
      authPkg !== null &&
      authFingerprint !== null &&
      authFingerprint === fingerprint &&
      isPackageUsable(authPkg, nowSeconds)
        ? authPkg
        : null;
    if (!pkg || !fingerprint) {
      if (authPkg !== null && !isPackageUsable(authPkg, nowSeconds)) {
        trackCreateEvent({ name: "authorization_expired" }, window.gtag);
      }
      throw new DeployFlowError("authorization-failed");
    }
    if (!v1Factory || pkg.factory.toLowerCase() !== v1Factory.toLowerCase()) {
      throw new DeployFlowError("factory-unavailable");
    }
    // Owner is always the connected deployer (factory enforces owner == sender).
    // Case-insensitive binding (see isPackageOwnerMatch): the signed package
    // echoes the checksummed wallet address verbatim.
    if (!isPackageOwnerMatch(pkg.token.owner, deployer)) {
      throw new DeployFlowError("account-changed");
    }
    const { data, valueHex } = packageToCalldata({
      token: pkg.token,
      quote: {
        configHash: pkg.quote.configHash,
        feeWei: pkg.quote.feeWei,
        chainId: pkg.quote.chainId,
        factory: pkg.quote.factory,
        nonce: pkg.quote.nonce,
        expiry: pkg.quote.expiry,
        pricingVersion: pkg.quote.pricingVersion,
      },
      signature: pkg.signature,
    });
    const feeWei = BigInt(valueHex);
      const client = publicClientForChain(intendedChainId);
      if (!client) throw new DeployFlowError("wrong-network");
    // Simulation + gas on the exact payload about to be sent.
    let estimate: bigint;
    let gasPrice: bigint;
    let balance: bigint;
    try {
      await client.call({
        account: deployer,
        to: v1Factory,
        data,
        value: feeWei,
      });
    } catch (error) {
      if (error instanceof DeployFlowError) throw error;
      throw new DeployFlowError("simulation-reverted");
    }
    try {
      [estimate, gasPrice, balance] = await Promise.all([
        client.estimateGas({ account: deployer, to: v1Factory, data, value: feeWei }),
        client.getGasPrice(),
        client.getBalance({ address: deployer }),
      ]);
    } catch {
      throw new DeployFlowError("gas-estimate-failed");
    }
    if (balance < feeWei + estimate * gasPrice) {
      throw new DeployFlowError("insufficient-gas-funds");
    }
    return { factory: v1Factory, deployer, provider: verified.provider, data, valueHex, feeWei, pkg };
  }, [
    isConnected,
    address,
    connector,
    network.chainId,
    intendedChainId,
    authPkg,
    authFingerprint,
    fingerprint,
    v1Factory,
  ]);

  const trackReceipt = useCallback(
    async (
      txHash: `0x${string}`,
      announce: boolean,
      expected?: { feeWei: bigint; payer: `0x${string}` }
    ) => {
      // Fresh submissions move broadcasting → confirming; re-checks and
      // resumed sessions are already confirming and only re-read the receipt.
      if (announce) dispatch({ type: "RECEIPT_WAIT" });
      try {
        const { token, paid } = await waitForReceipt(txHash, expected);
        setDeployedToken(token);
        if (paid) setPaidInfo(paid);
        clearPendingDeployment();
        // Persist a minimal recovery hint for same-tab refresh. It proves
        // nothing by itself: refresh recovery re-verifies the receipt and
        // event before any success UI may return.
        saveDeployResult({
          txHash,
          contractAddress: token,
          tokenName: tokenName.trim(),
          tokenSymbol: tokenSymbol.trim().toUpperCase(),
        });
        setRecovered(null);
        dispatch({ type: "RECEIPT_OK" });
        trackCreateEvent({ name: "deployment_confirmed", chainId: intendedChainId }, window.gtag);
        // Best-effort server record AFTER confirmed success. Fire-and-forget:
        // recording failure never converts this success into a failure.
        recordServerSide(txHash);
      } catch (error) {
        const code = error instanceof DeployFlowError ? error.code : classifyReceiptFailure(error);
        trackCreateEvent({ name: "deployment_failed", code }, window.gtag);
        dispatch({
          type: "RECEIPT_FAIL",
          code,
        });
      }
    },
    [dispatch, waitForReceipt, tokenName, tokenSymbol, recordServerSide, intendedChainId]
  );

  const startDeployment = useCallback(async () => {
    // Duplicate-submission guard: locked phases + re-entrancy ref.
    if (isDeployLocked(machine) || attemptLock.current) return;
    if (machine.phase !== "review" && machine.phase !== "idle" && machine.phase !== "error") {
      return;
    }
    if (hasSubmittedTx(machine)) return;
    attemptLock.current = true;
    try {
      if (machine.phase === "idle") dispatch({ type: "START_REVIEW" });
      if (machine.phase === "error" && !hasSubmittedTx(machine)) {
        dispatch({ type: "START_REVIEW" });
      }
      dispatch({ type: "BEGIN_VALIDATE" });
      let gates: Awaited<ReturnType<typeof runPreTransactionGates>>;
      try {
        gates = await runPreTransactionGates();
      } catch (error) {
        const code =
          error instanceof DeployFlowError
            ? error.code
            : error instanceof Phase6bDeploymentError
              ? error.reason === "chain-not-allowed" || error.reason === "stale-chain"
                ? ("wrong-network" as DeployErrorCode)
                : ("rpc-unavailable" as DeployErrorCode)
              : classifyDeployFailure(error, "invalid-config");
        dispatch({ type: "VALID_FAIL", code });
        return;
      }
      dispatch({ type: "VALID_OK" });
      let txHash: unknown;
      trackCreateEvent({ name: "deployment_submitted", chainId: intendedChainId }, window.gtag);
      try {
        txHash = await gates.provider.request({
          method: "eth_sendTransaction",
          params: [
            {
              from: gates.deployer,
              to: gates.factory,
              data: gates.data,
              value: gates.valueHex,
            },
          ],
        });
      } catch (error) {
        const code = classifyDeployFailure(error, "tx-submit-failed");
        trackCreateEvent(
          { name: "deployment_failed", code },
          window.gtag
        );
        dispatch({
          type: code === "user-rejected" ? "WALLET_REJECTED" : "SUBMIT_FAIL",
          code,
        });
        return;
      }
      if (!isTxHash(txHash)) {
        dispatch({ type: "SUBMIT_FAIL", code: "tx-submit-failed" });
        return;
      }
      savePendingDeployment({
        txHash,
        chainId: intendedChainId,
        name: tokenName.trim(),
        symbol: tokenSymbol.trim().toUpperCase(),
        savedAt: Date.now(),
      });
      setRecovered(null);
      dispatch({ type: "TX_SENT", txHash });
      await trackReceipt(txHash, true, { feeWei: gates.feeWei, payer: gates.deployer });
    } finally {
      attemptLock.current = false;
    }
  }, [machine, dispatch, runPreTransactionGates, trackReceipt, tokenName, tokenSymbol, intendedChainId]);

  const recheckSubmitted = useCallback(async () => {
    if (machine.phase !== "error" || !machine.txHash) return;
    if (attemptLock.current) return;
    attemptLock.current = true;
    try {
      dispatch({ type: "RETRY" });
      await trackReceipt(machine.txHash, false);
    } finally {
      attemptLock.current = false;
    }
  }, [machine.phase, machine.txHash, dispatch, trackReceipt]);

  const resumeRecovered = useCallback(async () => {
    if (!recovered || attemptLock.current) return;
    if (machine.phase !== "idle") return;
    attemptLock.current = true;
    try {
      dispatch({ type: "RESUME", txHash: recovered.txHash });
      await trackReceipt(recovered.txHash, false);
    } finally {
      attemptLock.current = false;
    }
  }, [recovered, machine.phase, dispatch, trackReceipt]);

  const dismissRecovered = useCallback(() => {
    clearPendingDeployment();
    setRecovered(null);
  }, []);

  const startNewDeployment = useCallback(() => {
    setDeployedToken(null);
    setPaidInfo(null);
    setAuthPkg(null);
    setAuthFingerprint(null);
    setAuthError(null);
    dispatch({ type: "NEW_DEPLOYMENT" });
  }, [dispatch]);

  const router = useRouter();

  // Success-state exit: drop the just-deployed draft (so /create starts
  // clean), the success recovery record, and any pending-tx record, then
  // return to /create same-tab. No old success state can reappear.
  const createAnotherToken = useCallback(() => {
    clearDeployDraft();
    clearDeployResult();
    clearPendingDeployment();
    setRecovered(null);
    setDeployedToken(null);
    router.push("/create");
  }, [router]);

  // Refresh recovery for CONFIRMED success (read-only).
  // Precedence: verified result > pending hash > review. The stored record
  // is a hint only: success UI returns solely from a freshly verified
  // receipt + factory event. No wallet, no send path anywhere in this flow.
  // V1 factory is tried first, then the legacy factory (older deployments).
  const [storedResult] = useState<DeployResultV1 | null>(() => loadDeployResult());
  const verifyFactory = v1FactoryAddress(intendedChainId);
  const verifyQuery = useQuery({
    queryKey: ["deploy-result-verify", intendedChainId, storedResult?.txHash ?? null],
    queryFn: async (): Promise<VerifiedDeployment> => {
      if (!storedResult || !verifyFactory) {
        throw new DeployFlowError("factory-unavailable");
      }
      const client = publicClientForChain(intendedChainId);
      if (!client) throw new DeployFlowError("wrong-network");
      try {
        return await fetchAndVerifyDeployResult(
          (hash) => client.getTransactionReceipt({ hash }),
          storedResult,
          verifyFactory
        );
      } catch (error) {
        if (error instanceof DeployFlowError) {
          if (error.code !== "rpc-unavailable" && error.code !== "factory-unavailable") {
            clearDeployResult();
          }
          throw error;
        }
        throw new DeployFlowError("rpc-unavailable");
      }
    },
    enabled: !!storedResult && !!verifyFactory && machine.phase === "idle",
    retry: false,
    staleTime: Infinity,
  });
  const verifyingResult =
    !!storedResult && machine.phase === "idle" && verifyQuery.isPending && !!verifyFactory;
  const resultUnverifiable =
    !!storedResult && machine.phase === "idle" && verifyQuery.isError && !!verifyFactory;
  // Display binding: the restored success panel (and its notices) appears
  // only while the current draft still describes the hinted token. A new
  // draft suppresses the stale hint instead of rendering it next to fresh
  // review state. Verification + idempotent record retry above still run.
  const displayedResult = storedResultMatchesDraft(storedResult, {
    tokenName,
    tokenSymbol,
  })
    ? storedResult
    : null;
  const restoredToken: `0x${string}` | null =
    displayedResult && machine.phase === "idle" && verifyQuery.data && !!verifyFactory
      ? verifyQuery.data.token
      : null;
  const devVerifyCode = resultUnverifiable
    ? devQueryErrorCode(verifyQuery.error, "receipt-timeout")
    : null;

  // Phase 7A: a refresh-restored verified success retries the idempotent
  // server record exactly once. Read-only recovery otherwise unchanged.
  useEffect(() => {
    if (storedResult && verifyQuery.data) {
      recordServerSide(storedResult.txHash);
    }
  }, [storedResult, verifyQuery.data, recordServerSide]);

  // Safety net only: after a CONFIRMED receipt, bring a possibly
  // below-the-fold success panel into view once per transaction. Layout
  // compactness (CSS) is the primary mechanism; this never fires before
  // success and never repeats for the same hash. DOM-only, no setState.
  useEffect(() => {
    if (!shouldScrollToSuccess(machine.phase, machine.txHash, announcedRef.current)) {
      return;
    }
    announcedRef.current = machine.txHash;
    const node = successRef.current;
    if (!node || typeof window === "undefined") return;
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    try {
      node.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "nearest" });
      node.focus({ preventScroll: true });
    } catch {
      /* older browsers: layout already shows the panel */
    }
  }, [machine.phase, machine.txHash]);

  const locked = isDeployLocked(machine);
  const submitted = hasSubmittedTx(machine);
  const errorInfo =
    machine.phase === "error" && machine.errorCode
      ? deployErrorMessage(machine.errorCode)
      : null;

  const tokenNameView = tokenName.trim() || "Untitled";
  const tokenSymbolView = tokenSymbol.trim().toUpperCase() || "SYM";
  const supplyDigits = supply.replace(/\D/g, "");
  const supplyView = supplyDigits
    ? Number(supplyDigits).toLocaleString("en-US")
    : "0";
  const decimalsView = decimals === "" ? "—" : decimals;
  const immutableLimits = feats.maxTx || feats.maxWallet;

  const phaseLabel: Record<string, string> = {
    idle: "Review your token",
    review: "Review your token",
    validating: "Validating deployment",
    awaiting_wallet: "Waiting for wallet confirmation",
    broadcasting: "Transaction submitted",
    confirming: intendedChainId === BSC_MAINNET_CHAIN_ID ? "Confirming on BNB Smart Chain" : "Confirming on BNB Smart Chain Testnet",
    success: "Token deployed successfully",
    error: errorInfo?.title ?? "Deployment could not be completed",
  };

  return (
    <div className="deploy-flow">
      {/* Session recovery banner: never lost, never auto-resubmitted. */}
      {recovered &&
        machine.phase === "idle" &&
        (!displayedResult || resultUnverifiable) && (
        <div className="deploy-banner" role="status">
          <span className="deploy-banner-ic" aria-hidden="true">
            <i className="fa-solid fa-clock-rotate-left"></i>
          </span>
          <span className="deploy-banner-txt">
            <b>Unconfirmed transaction found</b>
            <span>
              {recovered.name} ({recovered.symbol}) · {shortenTxHash(recovered.txHash)} — it may
              still confirm. Checking again will not send a new transaction.
            </span>
          </span>
          <span className="deploy-banner-actions">
            <button type="button" className="btn btn-dark" onClick={() => void resumeRecovered()}>
              Check status
            </button>
            <button type="button" className="btn btn-ghost" onClick={dismissRecovered}>
              Dismiss
            </button>
          </span>
        </div>
      )}

      {!isConnected ? (
        <div className="deploy-card">
          <h3>Connect your wallet to review</h3>
          <p className="deploy-muted">
            Your token setup is saved in this form. Connect a wallet to review the final details
            and deploy to {intendedChainId === BSC_MAINNET_CHAIN_ID ? "BNB Smart Chain" : "BNB Smart Chain Testnet"}.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => openWallet("connect")}>
            <i className="fa-solid fa-wallet" aria-hidden="true"></i>Connect Wallet
          </button>
        </div>
      ) : network.status === "wrong" || network.status === "disconnected" ? (
        <div className="deploy-card">
          <h3>Wrong network</h3>
          <p className="deploy-muted">
            {network.status === "wrong"
              ? `Your wallet is connected to ${networkLabel(network.chainId)}. Please switch your wallet to ${intendedChainId === BSC_MAINNET_CHAIN_ID ? "BNB Smart Chain" : "BNB Smart Chain Testnet"} and try again.`
              : "Your wallet connection could not be verified. Reconnect and try again."}
          </p>
          <button type="button" className="btn btn-ghost" onClick={() => void network.refresh()}>
            <i className="fa-solid fa-arrows-rotate" aria-hidden="true"></i>Re-check network
          </button>
        </div>
      ) : onMainnet && intendedChainId === BSC_TESTNET_CHAIN_ID ? (
        <div className="deploy-card">
          <div className="deploy-preview-tag" role="status">
            <i className="fa-solid fa-eye" aria-hidden="true"></i>Mainnet preview — deployment is
            not yet enabled
          </div>
          <h3>
            {tokenNameView} · {tokenSymbolView}
          </h3>
          <p className="deploy-muted">
            Deploying to BNB Smart Chain Mainnet is not available yet. This preview shows exactly
            what you configured, with the authoritative server price. Switch your wallet to BNB
            Smart Chain Testnet to deploy for real, free of charge.
          </p>
          <dl className="deploy-review">
            <div>
              <dt>Initial supply</dt>
              <dd>
                {supplyView} · {decimalsView} decimals
              </dd>
            </div>
            <div>
              <dt>Features</dt>
              <dd>
                {featureIds.length > 0 ? (
                  featureIds.map((id) => <FeatureSummaryLabel key={id} id={id} />).reduce<ReactNode[]>(
                    (acc, node, index) => (index === 0 ? [node] : [...acc, ", ", node]),
                    []
                  )
                ) : (
                  "Standard BEP-20"
                )}
              </dd>
            </div>
            <div>
              <dt>{PRODUCT_PRICE_LABEL}</dt>
              <dd>
                {quoteLoading
                  ? "Fetching…"
                  : visibleQuote
                    ? `${visibleQuote.totalBnb} BNB`
                    : "Unavailable — try again"}
              </dd>
            </div>
            {visibleQuote?.campaign && visibleQuote.discountWei !== "0" ? (
              <div>
                <dt>Campaign discount ({visibleQuote.campaign.name})</dt>
                <dd>
                  −{formatWeiBnbDisplay(BigInt(visibleQuote.discountWei))} BNB
                </dd>
              </div>
            ) : null}
          </dl>
          {devQuoteCode ? (
            <p className="deploy-devnote" data-dev-note="deploy-query">
              dev quote:{devQuoteCode}
            </p>
          ) : null}
          {quoteFailed && (
            <button type="button" className="btn btn-ghost" onClick={() => void refreshQuote()}>
              Refresh price
            </button>
          )}
        </div>
      ) : (
        <div className="deploy-panels">
          <div className="deploy-panel" aria-label="Review your token">
            <div>
              <h3 className="deploy-h">Token</h3>
              <dl className="deploy-review">
                <div>
                  <dt>Name</dt>
                  <dd>{tokenNameView}</dd>
                </div>
                <div>
                  <dt>Symbol</dt>
                  <dd>{tokenSymbolView}</dd>
                </div>
                <div>
                  <dt>Initial supply</dt>
                  <dd>{supplyView}</dd>
                </div>
                <div>
                  <dt>Decimals</dt>
                  <dd>{decimalsView}</dd>
                </div>
              </dl>
            </div>
            <div>
              <h3 className="deploy-h">Features</h3>
              <ul className="deploy-feats">
                <li>Standard BEP-20 · Ownership controls</li>
                {featureIds.map((id) => (
                  <li key={id}>
                    <FeatureSummaryLabel id={id} />
                    {id === "maxTx" && feats.maxTx && <> — {maxTxPercent}% per transfer</>}
                    {id === "maxWallet" && feats.maxWallet && <> — {maxWalletPercent}% per wallet</>}
                    {id === "mint" && feats.mint && (
                      <> — {mintMode === "unlimited" ? "unlimited lifetime issuance" : `capped at ${maxSupplyHuman || "—"}`}</>
                    )}
                    {id === "trading" && feats.trading && (
                      <> — buy {buyTaxBps} bps / sell {sellTaxBps} bps · marketing {shortenAddress(marketingWallet as `0x${string}`)}</>
                    )}
                    {id === "antiBot" && feats.antiBot && (
                      <> — snipe window {snipeBlocks} blocks</>
                    )}
                  </li>
                ))}
                {featureIds.length === 0 && <li className="deploy-muted">No add-ons selected</li>}
              </ul>
              <p className="deploy-muted">Owner: your connected wallet ({shortenAddress(address)})</p>
              {immutableLimits && (
                <p className="deploy-immutable">
                  <i className="fa-solid fa-lock" aria-hidden="true"></i>These limits are immutable
                  after deployment.
                </p>
              )}
            </div>
          </div>
          <div className="deploy-panel deploy-card" aria-label="Deployment">
            {restoredToken && displayedResult && machine.phase === "idle" ? (
              <SuccessPanel
                name={displayedResult.tokenName}
                symbol={displayedResult.tokenSymbol}
                token={restoredToken}
                txHash={displayedResult.txHash}
                copied={copied}
                onCopy={copyText}
                onCreateAnother={createAnotherToken}
                panelRef={null}
              />
            ) : machine.phase === "success" && deployedToken ? (
              <SuccessPanel
                name={tokenNameView}
                symbol={tokenSymbolView}
                token={deployedToken}
                txHash={machine.txHash}
                copied={copied}
                onCopy={copyText}
                onCreateAnother={createAnotherToken}
                panelRef={successRef}
                feePaidWei={paidInfo?.feeWei ?? (authPkg ? authPkg.feeWei.toString(10) : null)}
                features={featureIds}
              />
            ) : (
              <>
              {verifyingResult ? (
                <div className="deploy-status" role="status" aria-live="polite">
                  <span className="deploy-phase" data-deploy-phase="verifying">
                    Verifying deployment
                  </span>
                  <p className="deploy-muted">
                    Checking the confirmed transaction on {intendedChainId === BSC_MAINNET_CHAIN_ID ? "BNB Smart Chain" : "BNB Smart Chain Testnet"}. This
                    re-reads the public receipt only — no wallet confirmation and no new
                    transaction.
                  </p>
                  {displayedResult && explorerTxUrl(displayedResult.txHash) && (
                    <p className="deploy-muted">
                      <a
                        className="linklike"
                        href={explorerTxUrl(displayedResult.txHash) ?? ""}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View transaction
                      </a>
                    </p>
                  )}
                </div>
              ) : (
                <>
              {resultUnverifiable && displayedResult ? (
                <p className="deploy-muted">
                  Previous deployment result could not be verified. Review your configuration
                  below — nothing will be sent automatically.
                </p>
              ) : null}
              {devVerifyCode ? (
                <p className="deploy-devnote" data-dev-note="deploy-verify">
                  dev verify:{devVerifyCode}
                </p>
              ) : null}
            <div className="deploy-status" role="status" aria-live="polite">
              <span
                className={`deploy-phase deploy-phase-${machine.phase}`}
                data-deploy-phase={machine.phase}
              >
                {phaseLabel[machine.phase]}
              </span>
              {locked && machine.phase === "awaiting_wallet" && (
                <p className="deploy-muted">Confirm the transaction in your wallet.</p>
              )}
              {machine.phase === "confirming" && machine.txHash && (
                <p className="deploy-muted">
                  Transaction submitted — waiting for on-chain confirmation. You can safely leave
                  this page open; the transaction link below stays valid.
                </p>
              )}
            </div>
            <div>
              <h3 className="deploy-h">Network</h3>
              <dl className="deploy-review">
                <div>
                  <dt>Network</dt>
                  <dd>{intendedChainId === BSC_MAINNET_CHAIN_ID ? "BNB Smart Chain" : "BNB Smart Chain Testnet"}</dd>
                </div>
                <div>
                  <dt>Chain ID</dt>
                  <dd>{intendedChainId}</dd>
                </div>
                <div>
                  <dt>Wallet</dt>
                  <dd>{shortenAddress(address)}</dd>
                </div>
              </dl>
            </div>
            <div>
              <h3 className="deploy-h">Pricing</h3>
              <dl className="deploy-review">
                <div>
                  <dt>{PRODUCT_PRICE_LABEL}</dt>
                  <dd>
                    {quoteLoading ? (
                      "Fetching…"
                    ) : visibleQuote ? (
                      `${visibleQuote.totalBnb} BNB`
                    ) : (
                      <>Unavailable{quoteFailed && " — price check failed"}</>
                    )}
                  </dd>
                </div>
                {visibleQuote?.campaign && visibleQuote.discountWei !== "0" ? (
                  <div>
                    <dt>Campaign discount ({visibleQuote.campaign.name})</dt>
                    <dd>
                      −{formatWeiBnbDisplay(BigInt(visibleQuote.discountWei))} BNB
                    </dd>
                  </div>
                ) : null}
                {usablePkg ? (
                  <>
                    <div>
                      <dt>Authorized platform fee</dt>
                      <dd>{formatWeiBnbDisplay(BigInt(usablePkg.feeWei))} BNB</dd>
                    </div>
                    <div>
                      <dt>Authorization expires</dt>
                      <dd>{new Date(Number(usablePkg.expiry) * 1000).toUTCString()}</dd>
                    </div>
                  </>
                ) : (
                  <div>
                    <dt>{intendedChainId === BSC_MAINNET_CHAIN_ID ? "Mainnet platform fee" : "Testnet platform fee"}</dt>
                    <dd>{intendedChainId === BSC_MAINNET_CHAIN_ID ? "See authorized fee above" : "0 BNB"}</dd>
                  </div>
                )}
                <div>
                  <dt>Estimated network gas</dt>
                  <dd>
                    {gasLoading ? (
                      "Estimating…"
                    ) : gasPreview ? (
                      <>~{formatWeiBnbCompact(gasPreview.costWei)} BNB</>
                    ) : gasFailed ? (
                      "Could not be estimated"
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
              </dl>
              {devQuoteCode || devGasCode ? (
                <p className="deploy-devnote" data-dev-note="deploy-query">
                  dev{devQuoteCode ? ` quote:${devQuoteCode}` : ""}
                  {devGasCode ? ` gas:${devGasCode}` : ""}
                </p>
              ) : null}
              <p className="deploy-muted">
                {intendedChainId === BSC_MAINNET_CHAIN_ID
                  ? "Mainnet deployments include a platform fee. Network gas is charged separately by BNB Smart Chain and never mixed into the platform price."
                  : "Testnet deployments are fee-free: you pay 0 BNB platform fee. Network gas is charged separately by BNB Smart Chain and never mixed into the platform price."}
              </p>
              {(quoteFailed || gasFailed) && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    void refreshQuote();
                    void refreshGas();
                  }}
                >
                  <i className="fa-solid fa-arrows-rotate" aria-hidden="true"></i>Retry estimate
                </button>
              )}
            </div>

          {machine.txHash && (
            <div className="deploy-tx" role="status">
              <span className="deploy-tx-label">Transaction</span>
              <code className="mono">{shortenTxHash(machine.txHash)}</code>
              <button
                type="button"
                className="linklike"
                aria-label="Copy transaction hash"
                onClick={() => void copyText("tx", machine.txHash ?? "")}
              >
                {copied === "tx" ? "Copied" : "Copy"}
              </button>
              {explorerTxUrl(machine.txHash) && (
                <a
                  href={explorerTxUrl(machine.txHash) ?? ""}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on explorer
                </a>
              )}
            </div>
          )}

            <div className="deploy-actions">
              {machine.phase === "error" && errorInfo ? (
                <div className="deploy-error" role="alert">
                  <b>{errorInfo.title}</b>
                  <p>{errorInfo.body}</p>
                  {submitted && machine.txHash ? (
                    <p className="deploy-muted">
                      A transaction WAS submitted — checking again will only re-read its status,
                      never send a new one.
                    </p>
                  ) : (
                    <p className="deploy-muted">
                      No transaction was submitted. You can safely try again.
                    </p>
                  )}
                  <span className="deploy-actions-row">
                    {submitted && machine.txHash ? (
                      <button
                        type="button"
                        className="btn btn-dark"
                        onClick={() => void recheckSubmitted()}
                      >
                        Check again
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-dark"
                        disabled={!reviewValid || locked}
                        onClick={() => void startDeployment()}
                      >
                        Try again
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={startNewDeployment}
                    >
                      Start over
                    </button>
                  </span>
                </div>
              ) : !v1Factory ? (
                <div className="deploy-error" role="status">
                  <b>V1 factory not configured</b>
                  <p>
                    The final V1 deployment contract is not live on {intendedChainId === BSC_MAINNET_CHAIN_ID ? "BNB Smart Chain" : "BNB Smart Chain Testnet"} yet. Your
                    configuration above is preserved — nothing was submitted and no
                    transaction is possible from this screen until the factory is
                    deployed.
                  </p>
                </div>
              ) : (
                  <>
                    {!usablePkg && (
                      <button
                        type="button"
                        className="btn btn-primary btn-deploy"
                        disabled={locked || !reviewValid || authLoading || !v1Factory}
                        onClick={() => void requestAuthorization()}
                        aria-describedby="deployHint"
                      >
                        {authLoading
                          ? "Requesting authorization…"
                          : authPkg
                            ? "Authorization expired — request again"
                            : "Request authorization"}
                      </button>
                    )}
                    {usablePkg && (
                    <button
                      type="button"
                      className="btn btn-primary btn-deploy"
                      disabled={locked || !reviewValid || !gasPreview || gasFailed}
                      onClick={() => void startDeployment()}
                      aria-describedby="deployHint"
                    >
                      {machine.phase === "validating"
                        ? "Validating…"
                        : machine.phase === "awaiting_wallet"
                          ? "Waiting for wallet…"
                          : machine.phase === "broadcasting" || machine.phase === "confirming"
                            ? "Confirming…"
                            : "Deploy token"}
                    </button>
                    )}
                    {visibleAuthError && (
                      <p className="deploy-muted" role="alert">
                        Authorization failed ({visibleAuthError}). Check your configuration and request again — no transaction was submitted.
                      </p>
                    )}
                    <p className="deploy-muted" id="deployHint">
                      {!reviewValid
                        ? "Return to Create Token to complete the token details."
                        : !usablePkg
                          ? "Request a signed authorization first — it binds your exact configuration and fee, and expires shortly."
                          : !gasPreview
                            ? gasFailed
                              ? "The network fee could not be estimated — resolve it above before deploying."
                              : "Estimating the network fee."
                            : "Your wallet will ask you to confirm one transaction for the exact authorized fee plus gas. The gas figure above is an estimate — your wallet sets the final network fee."}
                    </p>
                  </>
              )}
            </div>
                </>
              )}
              </>
          )}
          </div>
        </div>
      )}
    </div>
  );
}
