"use client";

import { useEffect, useState } from "react";

function icon(theme: "light" | "dark") {
  return theme === "dark" ? "fa-solid fa-moon" : "fa-solid fa-sun";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const current = document.documentElement.getAttribute("data-theme");
      setTheme(current === "dark" ? "dark" : "light");
    });
    return () => cancelAnimationFrame(id);
  }, []);

  function apply(theme: "light" | "dark") {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("btm-theme", theme);
    } catch {
      /* storage unavailable: theme still applies for the session */
    }
    const themeMeta = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]'
    );
    if (themeMeta) {
      themeMeta.setAttribute(
        "content",
        theme === "dark" ? "#0f0e0b" : "#f7f6f2"
      );
    }
    setTheme(theme);
  }

  return (
    <button
      className="theme-toggle"
      id="theme-toggle"
      type="button"
      aria-label="Switch theme"
      onClick={() => apply(theme === "dark" ? "light" : "dark")}
    >
      <i className={icon(theme)} aria-hidden="true"></i>
    </button>
  );
}