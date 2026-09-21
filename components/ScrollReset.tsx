"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

let lastPopstateAt = -Infinity;

export function ScrollReset() {
  const pathname = usePathname();
  const prevPathname = useRef(pathname);

  useEffect(() => {
    const onPopstate = () => {
      lastPopstateAt = Date.now();
    };
    window.addEventListener("popstate", onPopstate);
    return () => window.removeEventListener("popstate", onPopstate);
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