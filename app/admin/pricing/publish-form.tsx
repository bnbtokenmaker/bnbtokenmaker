"use client";

/**
 * Phase 7C pricing publish form (client component).
 *
 * Human-readable BNB inputs. The OLD → NEW review table is computed locally
 * with exact bigint math for DISPLAY ONLY — the server re-parses and
 * re-validates every field on publish and remains authoritative.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";

import { parseBnbToWei } from "../../../lib/pricing/money";
import {
  MAX_QUOTE_SUBTOTAL_BNB,
  MAX_SINGLE_FEE_BNB,
} from "../../../lib/pricing/server/campaign-policy";
import styles from "../admin.module.css";

const FIELDS = [
  { key: "base", label: "Base BEP-20 token" },
  { key: "burn", label: "Burnable" },
  { key: "mint", label: "Mintable" },
  { key: "pause", label: "Pausable" },
  { key: "maxTx", label: "Max transaction" },
  { key: "maxWallet", label: "Max wallet" },
  { key: "blacklist", label: "Blacklist" },
  { key: "whitelist", label: "Whitelist" },
] as const;

type FeeKey = (typeof FIELDS)[number]["key"];

export function PublishForm({
  current,
}: {
  current: Record<FeeKey, string> | null;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<FeeKey, string>>(() => ({
    base: current?.base ?? "0.050",
    burn: current?.burn ?? "0.005",
    mint: current?.mint ?? "0.010",
    pause: current?.pause ?? "0.005",
    maxTx: current?.maxTx ?? "0.010",
    maxWallet: current?.maxWallet ?? "0.010",
    blacklist: current?.blacklist ?? "0.010",
    whitelist: current?.whitelist ?? "0.010",
  }));
  const [reviewing, setReviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function set(key: FeeKey, value: string): void {
    setValues((prev) => ({ ...prev, [key]: value }));
    setReviewing(false);
    setSuccess(null);
  }

  function validateAll(): { ok: true; wei: Record<FeeKey, bigint> } | { ok: false; message: string } {
    const wei = {} as Record<FeeKey, bigint>;
    const maxSingle = parseBnbToWei(MAX_SINGLE_FEE_BNB);
    for (const { key, label } of FIELDS) {
      const raw = values[key].trim();
      if (raw.length === 0) {
        return { ok: false, message: `"${label}" is required.` };
      }
      let parsed: bigint;
      try {
        parsed = parseBnbToWei(raw);
      } catch {
        return {
          ok: false,
          message: `"${label}" is not a valid BNB amount (up to 18 decimals, no sign, no exponents).`,
        };
      }
      if (parsed > maxSingle) {
        return {
          ok: false,
          message: `"${label}" exceeds the maximum of ${MAX_SINGLE_FEE_BNB} BNB.`,
        };
      }
      wei[key] = parsed;
    }
    const total = (Object.values(wei) as bigint[]).reduce((a, b) => a + b, 0n);
    if (total > parseBnbToWei(MAX_QUOTE_SUBTOTAL_BNB)) {
      return {
        ok: false,
        message: `Combined price exceeds the maximum of ${MAX_QUOTE_SUBTOTAL_BNB} BNB.`,
      };
    }
    return { ok: true, wei };
  }

  const validation = validateAll();

  async function publish(): Promise<void> {
    if (!validation.ok || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/pricing/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      if (response.status === 201) {
        const payload = (await response.json()) as {
          version?: { version?: string };
        };
        setSuccess(
          `Published pricing version ${payload.version?.version ?? ""}. New quotes use it immediately.`
        );
        setReviewing(false);
        router.refresh();
        return;
      }
      if (response.status === 400) {
        setError("The server rejected the submission. Check each amount and try again.");
      } else if (response.status === 401) {
        setError("Your session expired. Sign in again, then retry.");
      } else if (response.status === 429) {
        setError("Too many attempts. Wait a few minutes and try again.");
      } else {
        setError("Publishing is temporarily unavailable. Try again in a moment.");
      }
    } catch {
      setError("Publishing is temporarily unavailable. Try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className={styles.filters} role="group" aria-label="New pricing amounts in BNB">
        {FIELDS.map(({ key, label }) => (
          <div className={styles.field} key={key}>
            <label htmlFor={`pricing-${key}`}>{label} (BNB)</label>
            <input
              id={`pricing-${key}`}
              className={styles.input}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={values[key]}
              onChange={(event) => set(key, event.target.value)}
              aria-describedby={current ? `pricing-old-${key}` : undefined}
            />
            {current ? (
              <span className={`${styles.small} ${styles.muted}`} id={`pricing-old-${key}`}>
                Current: {current[key]} BNB
              </span>
            ) : null}
          </div>
        ))}
      </div>

      {!validation.ok ? (
        <p className={styles.alert} role="alert">{validation.message}</p>
      ) : null}

      {error ? (
        <p className={styles.alert} role="alert">{error}</p>
      ) : null}
      {success ? (
        <div className={styles.notice} role="status" style={{ marginBottom: "1rem" }}>
          <p>{success}</p>
        </div>
      ) : null}

      {reviewing && validation.ok ? (
        <div className={styles.tableWrap} style={{ marginBottom: "1rem" }}>
          <table className={styles.table}>
            <caption>Review: old → new (new quotes only)</caption>
            <thead>
              <tr>
                <th scope="col">Fee</th>
                <th scope="col">Old</th>
                <th scope="col">New</th>
              </tr>
            </thead>
            <tbody>
              {FIELDS.map(({ key, label }) => (
                <tr key={key}>
                  <td>{label}</td>
                  <td className={styles.mono}>{current ? `${current[key]} BNB` : "—"}</td>
                  <td className={styles.mono}>{values[key].trim()} BNB</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap" }}>
        {!reviewing ? (
          <button
            type="button"
            className={`${styles.btn} ${styles.btnGhost}`}
            disabled={!validation.ok}
            onClick={() => {
              setError(null);
              setReviewing(true);
            }}
          >
            Review new pricing
          </button>
        ) : (
          <>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              disabled={submitting || !validation.ok}
              onClick={() => void publish()}
            >
              {submitting ? "Publishing…" : "Publish new version"}
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnGhost}`}
              disabled={submitting}
              onClick={() => setReviewing(false)}
            >
              Back to editing
            </button>
          </>
        )}
      </div>
    </div>
  );
}
