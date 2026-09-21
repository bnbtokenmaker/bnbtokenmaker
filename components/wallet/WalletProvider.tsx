"use client";

import { useState, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { walletConfig } from "../../lib/wallet/config";
import { WalletModal } from "./WalletModal";
import { WalletUIProvider } from "./WalletUI";

export function WalletProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            refetchOnWindowFocus: false,
            staleTime: 30_000,
          },
        },
      })
  );

  return (
    <WagmiProvider config={walletConfig}>
      <QueryClientProvider client={queryClient}>
        <WalletUIProvider>
          {children}
          <WalletModal />
        </WalletUIProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
