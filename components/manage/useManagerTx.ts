"use client";

import { useCallback, useState } from "react";
import { useConnection } from "wagmi";
import { createPublicClient, http } from "viem";
import { bscTestnet } from "viem/chains";

import {
  ProviderAccountMismatchError,
  ProviderSessionMismatchError,
  ProviderSessionMissingError,
  getProviderSession,
  verifyProviderSession,
  type SessionConnectorLike,
} from "../../lib/wallet/session";
import { ProviderChainReadError, WalletProviderUnavailableError } from "../../lib/wallet/switch";
import {
  managerErrorMessage,
  type ManagerErrorCopy,
} from "../../lib/manage/errors";
import { trackManagerEvent } from "../../lib/manage/analytics";
import type { ManagerCall } from "../../lib/manage/calls";
import type { ManagerActionId } from "../../lib/manage/permissions";

const RECEIPT_TIMEOUT_MS = 120_000;

const readClient = createPublicClient({
  chain: bscTestnet,
  transport: http(),
});

export type ManagerTxStatus =
  | { stage: "idle" }
  | { stage: "confirming" }
  | { stage: "sending" }
  | { stage: "receipt" }
  | { stage: "success"; txHash: `0x${string}` }
  | { stage: "error"; copy: ManagerErrorCopy };

export type SubmitCall = {
  action: ManagerActionId;
  call: ManagerCall;
};

/**
 * Common safe transaction layer for every manager write:
 * session-pinned provider → live chain check → send → receipt wait →
 * status verification → refetch callback. Never shows success from a bare
 * tx hash. No window.ethereum fallback, no automatic chain switching.
 */
export function useManagerTx(options: {
  expectedChainId: number;
  action: ManagerActionId;
  onConfirmed: () => void;
}) {
  const { expectedChainId, action, onConfirmed } = options;
  const { isConnected, address, connector } = useConnection();
  const [status, setStatus] = useState<ManagerTxStatus>({ stage: "idle" });

  const submit = useCallback(
    async (call: ManagerCall): Promise<`0x${string}` | null> => {
      setStatus({ stage: "confirming" });
      trackManagerEvent(
        { name: "manager_action_started", action, kind: "own-v1" },
        typeof window !== "undefined" ? window.gtag : undefined
      );
      try {
        if (!isConnected || !address || !connector) {
          throw new Error("wallet-disconnected");
        }
        const session = getProviderSession();
        if (!session) throw new Error("provider-unavailable");
        let provider: {
          request: (args: { method: string; params?: unknown }) => Promise<unknown>;
        };
        let liveChainId: number;
        try {
          const verified = await verifyProviderSession(
            connector as unknown as SessionConnectorLike,
            { expectedAddress: address }
          );
          provider = verified.provider;
          liveChainId = verified.chainId;
        } catch (error) {
          if (error instanceof ProviderAccountMismatchError) throw new Error("account-changed");
          if (
            error instanceof ProviderSessionMissingError ||
            error instanceof ProviderSessionMismatchError ||
            error instanceof WalletProviderUnavailableError
          ) {
            throw new Error("provider-unavailable");
          }
          if (error instanceof ProviderChainReadError) throw new Error("rpc-unavailable");
          throw error;
        }
        if (liveChainId !== expectedChainId) {
          throw new Error(
            `wrong-network: live chain ${liveChainId}, expected ${expectedChainId}`
          );
        }
        const from = address.toLowerCase() as `0x${string}`;
        setStatus({ stage: "sending" });
        trackManagerEvent(
          { name: "manager_action_submitted", action, chainId: expectedChainId },
          window.gtag
        );
        const txHash = (await provider.request({
          method: "eth_sendTransaction",
          params: [{ from, to: call.to, data: call.data, value: "0x0" }],
        })) as unknown;
        if (typeof txHash !== "string" || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
          throw new Error("tx-submit-failed");
        }
        const hash = txHash as `0x${string}`;
        setStatus({ stage: "receipt" });
        const receipt = await readClient.waitForTransactionReceipt({
          hash,
          timeout: RECEIPT_TIMEOUT_MS,
        });
        if (receipt.status !== "success") {
          throw new Error("tx-reverted");
        }
        setStatus({ stage: "success", txHash: hash });
        trackManagerEvent(
          { name: "manager_action_confirmed", action, chainId: expectedChainId },
          window.gtag
        );
        onConfirmed();
        return hash;
      } catch (error) {
        const copy = managerErrorMessage(error);
        setStatus({ stage: "error", copy });
        trackManagerEvent(
          { name: "manager_action_failed", action, code: copy.title },
          typeof window !== "undefined" ? window.gtag : undefined
        );
        return null;
      }
    },
    [isConnected, address, connector, expectedChainId, action, onConfirmed]
  );

  const reset = useCallback(() => setStatus({ stage: "idle" }), []);

  return { status, submit, reset, readClient };
}
