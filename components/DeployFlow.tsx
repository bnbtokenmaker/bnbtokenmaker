"use client";

/**
 * Phase 6C deployment flow: REVIEW → VALIDATE → WALLET → BROADCAST → RECEIPT.
 *
 * Security posture (mirrors Phase 6A/6B, no new wallet logic):
 * - No automatic network switching: no wallet_switchEthereumChain /
 *   wallet_addEthereumChain calls anywhere in this file.
 * - Immediately before the transaction, the session-pinned provider is
 *   re-verified (same object, expected account, fresh eth_chainId) and the
 *   live chain must be exactly 97. Cached wagmi/UI state never authorizes.
 * - Mainnet (or any non-97 chain) renders preview-only: no transaction path.
 * - The testnet factory is non-payable: every deployment sends zero value.
 * - Money comes only from the server quote endpoint; gas is estimated via
 *   the real factory call and always displayed separately.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useConnection } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { createPublicClient, http } from "viem";
import { bscTestnet } from "viem/chains";

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
import { formatWeiBnbDisplay } from "../lib/pricing";
import { selectedFeatureIds, type FeatureSelection } from "../lib/pricing/presets";
import {
  TokenConfigError,
  flagsFromSelection,
  toContractArgs,
  validateTokenConfig,
  type ValidatedTokenConfig,
} from "../lib/token/config";
import { factoryAbi } from "../lib/token/factory";
import {
  PHASE6B_CHAIN_ID,
  Phase6bDeploymentError,
  assertPhase6bChain,
  assertPhase6bPreTransaction,
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
  isReceiptSuccess,
  isTxHash,
  loadPendingDeployment,
  prepareDeploymentTx,
  savePendingDeployment,
  shortenTxHash,
  type PendingDeployment,
  type PreparedDeployment,
} from "../lib/deploy/tx";

const RECEIPT_TIMEOUT_MS = 120_000;

const testnetPublicClient = createPublicClient({
  chain: bscTestnet,
  transport: http(),
});

export type DeployFlowProps = {
  tokenName: string;
  tokenSymbol: string;
  decimals: string;
  supply: string;
  feats: FeatureSelection;
  maxTxPercent: string;
  maxWalletPercent: string;
};

type GasSnapshot = {
  gas: bigint;
  gasPriceWei: bigint;
  costWei: bigint;
  balanceWei: bigint;
};

function safeFormatWei(raw: string): string {
  try {
    return formatWeiBnbDisplay(BigInt(raw));
  } catch {
    return "—";
  }
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
  };
  return <>{labels[id] ?? id}</>;
}

export function DeployFlow({
  tokenName,
  tokenSymbol,
  decimals,
  supply,
  feats,
  maxTxPercent,
  maxWalletPercent,
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

  const featureIds = useMemo(() => selectedFeatureIds(feats), [feats]);
  const onTestnet = isConnected && network.status === "testnet";
  const onMainnet = isConnected && network.status === "mainnet";

  const fingerprint = useMemo(
    () =>
      JSON.stringify({
        tokenName: tokenName.trim(),
        tokenSymbol: tokenSymbol.trim(),
        decimals: decimals.trim(),
        supply: supply.replace(/\D/g, ""),
        feats: featureIds,
        maxTxPercent: feats.maxTx ? maxTxPercent.trim() : null,
        maxWalletPercent: feats.maxWallet ? maxWalletPercent.trim() : null,
        account: address?.toLowerCase() ?? null,
      }),
    [
      tokenName,
      tokenSymbol,
      decimals,
      supply,
      feats.maxTx,
      feats.maxWallet,
      featureIds,
      maxTxPercent,
      maxWalletPercent,
      address,
    ]
  );

  const dispatch = useCallback((event: DeployEvent) => {
    try {
      send(event);
    } catch (error) {
      // UI guards make illegal transitions unreachable; fail closed here so
      // a stray dispatch can never corrupt attempt state.
      if (!(error instanceof DeployTransitionError)) throw error;
    }
  }, []);

  // Any form/account change invalidates the current review (locked attempts
  // and finished/error states are intentionally left untouched by the
  // machine so an in-flight hash is never lost).
  useEffect(() => {
    dispatch({ type: "FORM_CHANGED" });
  }, [fingerprint, dispatch]);

  // Fresh authoritative quote for REVIEW (never client-calculated), served
  // by React Query: no fetch-in-effect, cached per feature selection.
  const quoteQuery = useQuery({
    queryKey: ["deploy-quote", ...featureIds],
    queryFn: () => fetchAuthoritativeQuote(featureIds),
    enabled: onTestnet || onMainnet,
    retry: 1,
  });
  const refreshQuote = useCallback(() => {
    void quoteQuery.refetch();
  }, [quoteQuery]);
  // Quotes are only meaningful while connected to a known chain; stale data
  // from a previous connection is never rendered or used for gating.
  const quoteActive = onTestnet || onMainnet;
  const visibleQuote: AuthoritativeQuote | null = quoteActive
    ? (quoteQuery.data ?? null)
    : null;
  const quoteLoading = quoteActive && quoteQuery.isPending;
  const quoteFailed = quoteActive && quoteQuery.isError;

  // Lightweight review-validity used to enable the gas preview query. Full
  // validation (with the live deployer as owner) runs pre-transaction.
  const reviewValid = useMemo(() => {
    try {
      validateTokenConfig({
        name: tokenName,
        symbol: tokenSymbol,
        decimals,
        supplyHuman: supply,
        owner: (address ?? "0x0000000000000000000000000000000000000001") as `0x${string}`,
        features: flagsFromSelection(featureIds),
        maxTxPercent: feats.maxTx ? maxTxPercent : undefined,
        maxWalletPercent: feats.maxWallet ? maxWalletPercent : undefined,
      });
      return !(feats.blacklist && feats.whitelist);
    } catch {
      return false;
    }
  }, [
    tokenName,
    tokenSymbol,
    decimals,
    supply,
    address,
    featureIds,
    feats.maxTx,
    feats.maxWallet,
    feats.blacklist,
    feats.whitelist,
    maxTxPercent,
    maxWalletPercent,
  ]);

  // Gas preview for REVIEW: simulate + estimate the real factory call. A
  // reverted simulation or a failed estimate blocks deployment (fail closed).
  const gasQuery = useQuery({
    queryKey: [
      "deploy-gas",
      fingerprint,
      visibleQuote?.pricingVersion ?? null,
      address?.toLowerCase() ?? null,
    ],
    queryFn: async (): Promise<GasSnapshot> => {
      if (!address) throw new DeployFlowError("wallet-disconnected");
      const validated = validateTokenConfig({
        name: tokenName,
        symbol: tokenSymbol,
        decimals,
        supplyHuman: supply,
        owner: address as `0x${string}`,
        features: flagsFromSelection(featureIds),
        maxTxPercent: feats.maxTx ? maxTxPercent : undefined,
        maxWalletPercent: feats.maxWallet ? maxWalletPercent : undefined,
      });
      if (validated.features.blacklist && validated.features.whitelist) {
        throw new DeployFlowError("invalid-config", "lists-exclusive");
      }
      const prepared = prepareDeploymentTx(PHASE6B_CHAIN_ID, validated);
      const account = address as `0x${string}`;
      const tokenArgs = toContractArgs(validated);
      try {
        await testnetPublicClient.simulateContract({
          account,
          address: prepared.factory,
          abi: factoryAbi as never,
          functionName: "createToken",
          args: [{ token: tokenArgs }],
          value: 0n,
        } as never);
      } catch (error) {
        if (error instanceof DeployFlowError) throw error;
        throw new DeployFlowError("simulation-reverted");
      }
      try {
        const [estimate, gasPrice, balance] = await Promise.all([
          testnetPublicClient.estimateContractGas({
            account,
            address: prepared.factory,
            abi: factoryAbi as never,
            functionName: "createToken",
            args: [{ token: tokenArgs }],
            value: 0n,
          } as never),
          testnetPublicClient.getGasPrice(),
          testnetPublicClient.getBalance({ address: account }),
        ]);
        return {
          gas: estimate,
          gasPriceWei: gasPrice,
          costWei: estimate * gasPrice,
          balanceWei: balance,
        };
      } catch {
        throw new DeployFlowError("gas-estimate-failed");
      }
    },
    enabled: onTestnet && !!address && !!visibleQuote && reviewValid,
    retry: 1,
  });
  const refreshGas = useCallback(() => {
    void gasQuery.refetch();
  }, [gasQuery]);
  const gasPreview: GasSnapshot | null =
    onTestnet && reviewValid ? (gasQuery.data ?? null) : null;
  const gasLoading = onTestnet && reviewValid && gasQuery.isPending;
  const gasFailed = onTestnet && reviewValid && gasQuery.isError;
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
    async (txHash: `0x${string}`): Promise<`0x${string}`> => {
      const receipt = await testnetPublicClient.waitForTransactionReceipt({
        hash: txHash,
        timeout: RECEIPT_TIMEOUT_MS,
      });
      if (!isReceiptSuccess(receipt.status)) {
        throw new DeployFlowError("tx-reverted");
      }
      const token = findDeployedTokenAddress(
        receipt.logs as { topics: [`0x${string}`, ...`0x${string}`[]]; data: `0x${string}` }[]
      );
      if (!token) {
        throw new DeployFlowError("event-missing");
      }
      return token;
    },
    []
  );

  /** Full pre-transaction gate. Throws DeployFlowError / Phase6b faults only. */
  const runPreTransactionGates = useCallback(async (): Promise<{
    prepared: PreparedDeployment;
    deployer: `0x${string}`;
    provider: { request: (args: { method: string; params?: unknown }) => Promise<unknown> };
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
      assertPhase6bChain(liveChainId, network.chainId);
    } catch (error) {
      if (error instanceof Phase6bDeploymentError) {
        if (error.reason === "chain-not-allowed" || error.reason === "stale-chain") {
          throw new DeployFlowError("wrong-network");
        }
        throw new DeployFlowError("rpc-unavailable");
      }
      throw error;
    }
    const deployer = address.toLowerCase() as `0x${string}`;

    let validated: ValidatedTokenConfig;
    try {
      validated = validateTokenConfig({
        name: tokenName,
        symbol: tokenSymbol,
        decimals,
        supplyHuman: supply,
        owner: deployer,
        features: flagsFromSelection(featureIds),
        maxTxPercent: feats.maxTx ? maxTxPercent : undefined,
        maxWalletPercent: feats.maxWallet ? maxWalletPercent : undefined,
      });
    } catch (error) {
      if (error instanceof TokenConfigError) {
        throw new DeployFlowError("invalid-config", error.code);
      }
      throw error;
    }
    // Public-UI rule: blacklist and whitelist are mutually exclusive.
    if (validated.features.blacklist && validated.features.whitelist) {
      throw new DeployFlowError("invalid-config", "lists-exclusive");
    }
    // Owner is always the connected deployer (factory enforces owner == sender).
    if (validated.owner.toLowerCase() !== deployer) {
      throw new DeployFlowError("account-changed");
    }

    // Fresh authoritative server quote; the echoed selection must match.
    // (Quotes are deterministic per selection, so the REVIEW display of the
    // same selection shows the same price.)
    let freshQuote: AuthoritativeQuote;
    try {
      freshQuote = await fetchAuthoritativeQuote(featureIds);
    } catch (error) {
      if (error instanceof DeployFlowError) throw error;
      throw new DeployFlowError("quote-stale");
    }
    const echoed = new Set(freshQuote.selectedFeatures);
    if (
      echoed.size !== featureIds.length ||
      featureIds.some((id) => !echoed.has(id))
    ) {
      throw new DeployFlowError("quote-stale", "selection-mismatch");
    }

    const prepared = prepareDeploymentTx(liveChainId, validated);

    // Final fail-closed gate: session, account, live chain 97, args, zero fee.
    assertPhase6bPreTransaction({
      isConnected: true,
      expectedAddress: deployer,
      liveAccounts: verified.accounts,
      liveChainId,
      cachedChainId: network.chainId,
      argsValid: true,
      txValueWei: 0n,
    });

    // Simulation + gas on the exact payload about to be sent.
    let estimate: bigint;
    let gasPrice: bigint;
    let balance: bigint;
    const calldataArgs = { token: toContractArgs(validated) };
    try {
      await testnetPublicClient.simulateContract({
        account: deployer,
        address: prepared.factory,
        abi: factoryAbi as never,
        functionName: "createToken",
        args: [calldataArgs],
        value: 0n,
      } as never);
    } catch (error) {
      if (error instanceof DeployFlowError) throw error;
      throw new DeployFlowError("simulation-reverted");
    }
    try {
      [estimate, gasPrice, balance] = await Promise.all([
        testnetPublicClient.estimateContractGas({
          account: deployer,
          address: prepared.factory,
          abi: factoryAbi as never,
          functionName: "createToken",
          args: [calldataArgs],
          value: 0n,
        } as never),
        testnetPublicClient.getGasPrice(),
        testnetPublicClient.getBalance({ address: deployer }),
      ]);
    } catch {
      throw new DeployFlowError("gas-estimate-failed");
    }
    if (balance < estimate * gasPrice) {
      throw new DeployFlowError("insufficient-gas-funds");
    }
    return { prepared, deployer, provider: verified.provider };
  }, [
    isConnected,
    address,
    connector,
    network.chainId,
    tokenName,
    tokenSymbol,
    decimals,
    supply,
    featureIds,
    feats.maxTx,
    feats.maxWallet,
    maxTxPercent,
    maxWalletPercent,
  ]);

  const trackReceipt = useCallback(
    async (txHash: `0x${string}`, announce: boolean) => {
      // Fresh submissions move broadcasting → confirming; re-checks and
      // resumed sessions are already confirming and only re-read the receipt.
      if (announce) dispatch({ type: "RECEIPT_WAIT" });
      try {
        const token = await waitForReceipt(txHash);
        setDeployedToken(token);
        clearPendingDeployment();
        setRecovered(null);
        dispatch({ type: "RECEIPT_OK" });
      } catch (error) {
        dispatch({
          type: "RECEIPT_FAIL",
          code: error instanceof DeployFlowError ? error.code : classifyReceiptFailure(error),
        });
      }
    },
    [dispatch, waitForReceipt]
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
      try {
        txHash = await gates.provider.request({
          method: "eth_sendTransaction",
          params: [
            {
              from: gates.deployer,
              to: gates.prepared.factory,
              data: gates.prepared.data,
              value: "0x0",
            },
          ],
        });
      } catch (error) {
        const code = classifyDeployFailure(error, "tx-submit-failed");
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
        chainId: PHASE6B_CHAIN_ID,
        name: tokenName.trim(),
        symbol: tokenSymbol.trim().toUpperCase(),
        savedAt: Date.now(),
      });
      setRecovered(null);
      dispatch({ type: "TX_SENT", txHash });
      await trackReceipt(txHash, true);
    } finally {
      attemptLock.current = false;
    }
  }, [machine, dispatch, runPreTransactionGates, trackReceipt, tokenName, tokenSymbol]);

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
    dispatch({ type: "NEW_DEPLOYMENT" });
  }, [dispatch]);

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
    confirming: "Confirming on BNB Smart Chain Testnet",
    success: "Token deployed successfully",
    error: errorInfo?.title ?? "Deployment could not be completed",
  };

  return (
    <section className="deploy" id="deploy" aria-label="Review and deploy">
      <div className="form-sec-h">
        <span className="idx">04</span>
        <h2>Review &amp; Deploy</h2>
        <span className="small-note">Check everything once — limits can&apos;t change later.</span>
      </div>

      {/* Session recovery banner: never lost, never auto-resubmitted. */}
      {recovered && machine.phase === "idle" && (
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
            and deploy to BNB Smart Chain Testnet.
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
              ? `Your wallet is connected to ${networkLabel(network.chainId)}. Please switch your wallet to BNB Smart Chain Testnet and try again.`
              : "Your wallet connection could not be verified. Reconnect and try again."}
          </p>
          <button type="button" className="btn btn-ghost" onClick={() => void network.refresh()}>
            <i className="fa-solid fa-arrows-rotate" aria-hidden="true"></i>Re-check network
          </button>
        </div>
      ) : onMainnet ? (
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
              <dt>Platform price (server quote)</dt>
              <dd>
                {quoteLoading
                  ? "Fetching…"
                  : visibleQuote
                    ? `${visibleQuote.totalBnb} BNB`
                    : "Unavailable — try again"}
              </dd>
            </div>
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
        <div className="deploy-card">
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

          <div className="deploy-grid">
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
            <div>
              <h3 className="deploy-h">Network</h3>
              <dl className="deploy-review">
                <div>
                  <dt>Network</dt>
                  <dd>BNB Smart Chain Testnet</dd>
                </div>
                <div>
                  <dt>Chain ID</dt>
                  <dd>97</dd>
                </div>
              </dl>
            </div>
            <div>
              <h3 className="deploy-h">Pricing</h3>
              <dl className="deploy-review">
                <div>
                  <dt>Platform price (server quote)</dt>
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
                <div>
                  <dt>Testnet platform fee</dt>
                  <dd>0 BNB</dd>
                </div>
                <div>
                  <dt>Estimated network gas</dt>
                  <dd>
                    {gasLoading ? (
                      "Estimating…"
                    ) : gasPreview ? (
                      <>~{safeFormatWei(gasPreview.costWei.toString())} BNB</>
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
                Testnet deployments are fee-free: you pay 0 BNB platform fee. Network gas is
                charged separately by BNB Smart Chain and never mixed into the platform price.
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

          {machine.phase === "success" && deployedToken ? (
            <div className="deploy-success" role="status">
              <h3>
                <i className="fa-solid fa-circle-check" aria-hidden="true"></i>Token deployed
                successfully
              </h3>
              <dl className="deploy-review">
                <div>
                  <dt>Token</dt>
                  <dd>
                    {tokenNameView} · {tokenSymbolView}
                  </dd>
                </div>
                <div>
                  <dt>Network</dt>
                  <dd>BNB Smart Chain Testnet (97)</dd>
                </div>
                <div>
                  <dt>Contract address</dt>
                  <dd>
                    <code className="mono">{deployedToken}</code>{" "}
                    <button
                      type="button"
                      className="linklike"
                      aria-label="Copy contract address"
                      onClick={() => void copyText("token", deployedToken)}
                    >
                      {copied === "token" ? "Copied" : "Copy"}
                    </button>
                  </dd>
                </div>
              </dl>
              <div className="deploy-actions">
                {explorerTokenPageUrl(deployedToken) && (
                  <a
                    className="btn btn-dark"
                    href={explorerTokenPageUrl(deployedToken) ?? ""}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View contract on explorer
                  </a>
                )}
                {machine.txHash && explorerTxUrl(machine.txHash) && (
                  <a
                    className="btn btn-ghost"
                    href={explorerTxUrl(machine.txHash) ?? ""}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View transaction
                  </a>
                )}
                <button type="button" className="btn btn-ghost" onClick={startNewDeployment}>
                  Create another token
                </button>
              </div>
            </div>
          ) : (
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
              ) : (
                machine.phase !== "success" && (
                  <>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={locked || !reviewValid || !visibleQuote || gasFailed || !gasPreview}
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
                    <p className="deploy-muted" id="deployHint">
                      {!reviewValid
                        ? "Complete the token details above to enable deployment."
                        : !visibleQuote
                          ? "Waiting for the server price confirmation."
                          : !gasPreview
                            ? gasFailed
                              ? "The network fee could not be estimated — resolve it above before deploying."
                              : "Estimating the network fee."
                            : "Your wallet will ask you to confirm one transaction. Testnet fee: 0 BNB + gas."}
                    </p>
                  </>
                )
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
