"use client";

/**
 * Phase 7B copy-to-clipboard button (client).
 *
 * Receives the FULL canonical value as a prop for copying; the abbreviated
 * display text is rendered separately by the server. Uses the async
 * clipboard API with a non-clipboard fallback; never navigates.
 */

import { useState } from "react";

import styles from "../admin.module.css";

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Fallback for contexts without async clipboard access.
      const area = document.createElement("textarea");
      area.value = value;
      document.body.appendChild(area);
      area.select();
      try {
        document.execCommand("copy");
      } catch {
        // Best-effort only; the full value stays visible in the title.
      }
      document.body.removeChild(area);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      className={styles.copyBtn}
      onClick={() => void onCopy()}
      aria-label={`Copy ${label}`}
      title={value}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
