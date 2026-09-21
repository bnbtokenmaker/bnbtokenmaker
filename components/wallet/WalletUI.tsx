"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type WalletView = "connect" | "account";

type WalletUIContextValue = {
  view: WalletView | null;
  isOpen: boolean;
  open: (view?: WalletView) => void;
  close: () => void;
  toggle: (view?: WalletView) => void;
};

const WalletUIContext = createContext<WalletUIContextValue | null>(null);

export function useWalletUI(): WalletUIContextValue {
  const context = useContext(WalletUIContext);
  if (!context) {
    throw new Error("useWalletUI must be used within <WalletProvider>");
  }
  return context;
}

export function WalletUIProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<WalletView | null>(null);

  const open = useCallback((next: WalletView = "connect") => {
    setView(next);
  }, []);

  const close = useCallback(() => {
    setView(null);
  }, []);

  const toggle = useCallback((next: WalletView = "connect") => {
    setView((current) => (current ? null : next));
  }, []);

  const value = useMemo(
    () => ({ view, isOpen: view !== null, open, close, toggle }),
    [view, open, close, toggle]
  );

  return (
    <WalletUIContext.Provider value={value}>
      {children}
    </WalletUIContext.Provider>
  );
}
