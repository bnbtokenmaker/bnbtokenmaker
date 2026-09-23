"use client";

/**
 * Phase 7C campaign client forms.
 *
 * Create / enable-disable / edit-future-campaign. Inputs are validated
 * locally for fast feedback, then re-validated authoritatively by the
 * server; percentage math here is exact string/integer based (no floats).
 */

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { CampaignDto } from "../../../lib/admin/pricing-api";
import styles from "../admin.module.css";

function errorMessageFor(status: number): string {
  if (status === 400) {
    return "The server rejected the submission. Check every field and try again.";
  }
  if (status === 401) {
    return "Your session expired. Sign in again, then retry.";
  }
  if (status === 404) {
    return "Campaign not found. Refresh the page and try again.";
  }
  if (status === 409) {
    return "Conflicting change (duplicate code, or terms of a started campaign). Refresh and review.";
  }
  if (status === 429) {
    return "Too many attempts. Wait a few minutes and try again.";
  }
  return "The campaign service is temporarily unavailable. Try again in a moment.";
}

/** Exact "12.5" percent string -> integer basis points (no floats). */
function percentToBasisPoints(raw: string): number | null {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(raw.trim());
  if (!match) return null;
  const basisPoints =
    Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  if (!Number.isSafeInteger(basisPoints)) return null;
  if (basisPoints < 1 || basisPoints > 9000) return null;
  return basisPoints;
}

function basisPointsToPercentInput(basisPoints: number): string {
  const whole = Math.floor(basisPoints / 100);
  const frac = basisPoints % 100;
  return frac === 0 ? String(whole) : `${whole}.${String(frac).padStart(2, "0").replace(/0$/, "")}`;
}

/** ISO string -> "YYYY-MM-DDTHH:mm" for datetime-local inputs. */
function toDatetimeLocal(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number): string => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/** datetime-local value -> ISO string, or null when unparseable. */
function fromDatetimeLocal(value: string): string | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

async function sendCampaign(
  url: string,
  method: "POST" | "PATCH",
  body: unknown
): Promise<{ ok: true } | { ok: false; message: string }> {
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, message: errorMessageFor(503) };
  }
  if (response.ok) return { ok: true };
  return { ok: false, message: errorMessageFor(response.status) };
}

export function CreateCampaignForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [percent, setPercent] = useState("10");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(): Promise<void> {
    const trimmedName = name.trim().replace(/\s+/g, " ");
    if (trimmedName.length < 3 || trimmedName.length > 80) {
      setError("Name must be 3..80 characters.");
      return;
    }
    const basisPoints = percentToBasisPoints(percent);
    if (basisPoints === null) {
      setError("Discount must be a percentage like 10 or 12.5 (0.01..90).");
      return;
    }
    const startIso = fromDatetimeLocal(startsAt);
    const endIso = fromDatetimeLocal(endsAt);
    if (!startIso || !endIso) {
      setError("Start and end must both be set.");
      return;
    }
    setBusy(true);
    setError(null);
    // Codeless-only: new campaigns are always automatic (code null). The
    // server rejects any non-null code explicitly (see API route).
    const outcome = await sendCampaign("/api/admin/campaigns", "POST", {
      name: trimmedName,
      code: null,
      discountBasisPoints: basisPoints,
      startsAt: startIso,
      endsAt: endIso,
    });
    setBusy(false);
    if (!outcome.ok) {
      setError(outcome.message);
      return;
    }
    setName("");
    setPercent("10");
    setStartsAt("");
    setEndsAt("");
    router.refresh();
  }

  return (
    <div>
      <div className={styles.filters} role="group" aria-label="New campaign fields">
        <div className={styles.field}>
          <label htmlFor="campaign-name">Name</label>
          <input
            id="campaign-name"
            className={`${styles.input} ${styles.searchInput}`}
            type="text"
            autoComplete="off"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Launch week"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="campaign-percent">Discount (%)</label>
          <input
            id="campaign-percent"
            className={styles.input}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={percent}
            onChange={(event) => setPercent(event.target.value)}
            placeholder="10"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="campaign-starts">Starts at</label>
          <input
            id="campaign-starts"
            className={styles.input}
            type="datetime-local"
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="campaign-ends">Ends at</label>
          <input
            id="campaign-ends"
            className={styles.input}
            type="datetime-local"
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
          />
        </div>
      </div>
      {error ? (
        <p className={styles.alert} role="alert">{error}</p>
      ) : null}
      <button
        type="button"
        className={`${styles.btn} ${styles.btnPrimary}`}
        disabled={busy}
        onClick={() => void submit()}
      >
        {busy ? "Creating…" : "Create campaign"}
      </button>
    </div>
  );
}

export function CampaignActions({ campaign }: { campaign: CampaignDto }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(campaign.name);
  const [percent, setPercent] = useState(
    basisPointsToPercentInput(campaign.discountBasisPoints)
  );
  const [startsAt, setStartsAt] = useState(toDatetimeLocal(campaign.startsAt));
  const [endsAt, setEndsAt] = useState(toDatetimeLocal(campaign.endsAt));

  const editable = campaign.status === "scheduled";

  async function toggle(): Promise<void> {
    setBusy(true);
    setError(null);
    const outcome = await sendCampaign(
      `/api/admin/campaigns/${campaign.id}`,
      "PATCH",
      { enabled: !campaign.enabled }
    );
    setBusy(false);
    if (!outcome.ok) {
      setError(outcome.message);
      return;
    }
    router.refresh();
  }

  async function save(): Promise<void> {
    const trimmedName = name.trim().replace(/\s+/g, " ");
    if (trimmedName.length < 3 || trimmedName.length > 80) {
      setError("Name must be 3..80 characters.");
      return;
    }
    const basisPoints = percentToBasisPoints(percent);
    if (basisPoints === null) {
      setError("Discount must be a percentage like 10 or 12.5 (0.01..90).");
      return;
    }
    const startIso = fromDatetimeLocal(startsAt);
    const endIso = fromDatetimeLocal(endsAt);
    if (!startIso || !endIso) {
      setError("Start and end must both be set.");
      return;
    }
    setBusy(true);
    setError(null);
    const outcome = await sendCampaign(
      `/api/admin/campaigns/${campaign.id}`,
      "PATCH",
      {
        name: trimmedName,
        discountBasisPoints: basisPoints,
        startsAt: startIso,
        endsAt: endIso,
      }
    );
    setBusy(false);
    if (!outcome.ok) {
      setError(outcome.message);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  return (
    <div style={{ display: "grid", gap: ".4rem", minWidth: "12rem" }}>
      <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap" }}>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}
          disabled={busy}
          onClick={() => void toggle()}
        >
          {campaign.enabled ? "Disable" : "Enable"}
        </button>
        {editable ? (
          <button
            type="button"
            className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}
            disabled={busy}
            onClick={() => setEditing((value) => !value)}
            aria-expanded={editing}
          >
            {editing ? "Cancel" : "Edit"}
          </button>
        ) : null}
      </div>
      {!editable && campaign.status === "active" ? (
        <span className={`${styles.small} ${styles.muted}`}>
          Terms frozen while active — disable to end early.
        </span>
      ) : null}
      {editing && editable ? (
        <div style={{ display: "grid", gap: ".4rem" }}>
          <label className={`${styles.small} ${styles.muted}`}>
            Name
            <input
              className={styles.input}
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className={`${styles.small} ${styles.muted}`}>
            Discount (%)
            <input
              className={styles.input}
              type="text"
              inputMode="decimal"
              value={percent}
              onChange={(event) => setPercent(event.target.value)}
            />
          </label>
          <label className={`${styles.small} ${styles.muted}`}>
            Starts at
            <input
              className={styles.input}
              type="datetime-local"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
            />
          </label>
          <label className={`${styles.small} ${styles.muted}`}>
            Ends at
            <input
              className={styles.input}
              type="datetime-local"
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
            />
          </label>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`}
            disabled={busy}
            onClick={() => void save()}
          >
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      ) : null}
      {error ? (
        <p className={styles.alert} role="alert">{error}</p>
      ) : null}
    </div>
  );
}
