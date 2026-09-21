"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

let lastPopstateAt = -Infinity;

export function ScrollReset() {
  const pathname = usePathname();
  const prevPathname = useRef(pathname);

  useEffect(() => {
    const root = document.documentElement;
    let restoreTimer: number | undefined;
    const onPopstate = () => {
      lastPopstateAt = Date.now();
      // Native history scroll restoration respects `scroll-behavior: smooth`,
      // which animates back/forward jumps. Disable it just for the restore.
      root.style.scrollBehavior = "auto";
      window.clearTimeout(restoreTimer);
      restoreTimer = window.setTimeout(() => {
        root.style.scrollBehavior = "";
      }, 350);
    };
    window.addEventListener("popstate", onPopstate);
    return () => {
      window.removeEventListener("popstate", onPopstate);
      window.clearTimeout(restoreTimer);
    };
  }, []);

  useEffect(() => {
    if (prevPathname.current === pathname) {
      return;
    }
    prevPathname.current = pathname;

    const url = new URL(window.location.href);
    if (url.hash) {
      return;
    }
    if (Date.now() - lastPopstateAt < 400) {
      return;
    }

    const root = document.documentElement;
    const previous = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
    root.style.scrollBehavior = previous;
  }, [pathname]);

  return null;
}