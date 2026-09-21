"use client";

import { useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

export function RouteTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const mainRef = useRef<HTMLElement | null>(null);
  const firstRender = useRef(true);

  useLayoutEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const el = mainRef.current;
    if (!el) return;
    el.classList.remove("route-enter");
    void el.offsetWidth;
    el.classList.add("route-enter");
  }, [pathname]);

  return (
    <main id="main" ref={mainRef}>
      {children}
    </main>
  );
}