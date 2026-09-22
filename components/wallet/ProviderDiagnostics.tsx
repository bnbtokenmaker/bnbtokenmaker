"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection, useConnectors } from "wagmi";

import {
  describeProviderRef,
  discoverInjectedProviders,
  isDiagnosticsEnabled,
  type DiagnosticsReport,
} from "../../lib/wallet/diagnostics";
import {
  clearDevLog,
  devLog,
  devRefId,
  getDevLog,
  subscribeDevLog,
} from "../../lib/wallet/devlog";
import { getProviderSession } from "../../lib/wallet/session";

/**
 * DEV-ONLY (localhost, non-production) provider identity panel.
 *
 * Answers: which announced provider is the visible MetaMask, which one the
 * selected connector holds, who receives the switch, and whether duplicate
 * announcements / overlapping wrappers exist. Rendered only on dev hosts;
 * returns null everywhere else (including all production builds).
 */
export function ProviderDiagnostics() {
  const [enabled, setEnabled] = useState(false);
  const [report, setReport] = useState<DiagnosticsReport | null>(null);
  const [collecting, setCollecting] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<string>("no session");
  const [connectorInfo, setConnectorInfo] = useState<string>("—");
  const [logTick, setLogTick] = useState(0);
  const connection = useConnection();
  const connectors = useConnectors();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- dev-only panel enables post-hydration to avoid an SSR mismatch (server has no window)
    setEnabled(isDiagnosticsEnabled());
  }, []);

  type FreshConnection = ReturnType<typeof useConnection>;

  // collect() takes the connection as an argument so async collection always
  // inspects call-time state, never a stale render closure.
  const collect = useCallback(async (fresh: FreshConnection) => {
    setCollecting(true);
    try {
      const next = await discoverInjectedProviders();
      setReport(next);
      const session = getProviderSession();
      if (!session) {
        setSessionInfo("no session");
      } else {
        let liveRef = "unavailable";
        try {
          const live = await (
            fresh.connector as unknown as {
              getProvider?: () => Promise<unknown>;
            }
          )?.getProvider?.();
          liveRef = describeProviderRef(live);
        } catch {
          liveRef = "getProvider() threw";
        }
        const sessionRef = describeProviderRef(session.providerRef);
        setSessionInfo(
          `uid=${session.connectorUid} id=${session.connectorId} rdns=${session.rdns ?? "—"} ` +
            `addr=${session.address} bound=${session.boundAt} ` +
            `sessionRef=${sessionRef} liveRef=${liveRef} ` +
            `match=${sessionRef === liveRef ? "YES" : "NO — STALE"}`,
        );
      }
      const active = fresh.connector;
      if (!active) {
        setConnectorInfo("disconnected");
      } else {
        let ref = "unavailable";
        try {
          ref = describeProviderRef(
            await (
              active as unknown as { getProvider: () => Promise<unknown> }
            ).getProvider(),
          );
        } catch {
          ref = "getProvider() threw";
        }
        setConnectorInfo(
          `id=${active.id} name=${active.name} uid=${active.uid} type=${active.type} providerRef=${ref}`,
        );
      }
    } finally {
      setCollecting(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- dev-only panel performs its one-shot collection after gating on the dev host
    if (enabled) void collect(connection);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    // Live event log (chainChanged / reverify / session transitions).
    const unsubscribe = subscribeDevLog(() => setLogTick((tick) => tick + 1));
    // Announcement watchdog: records every EIP-6963 (re-)announcement with
    // object identity, so a rotated provider object is visible with a
    // timestamp instead of silently replacing the session's object.
    const onAnnounce = (event: Event) => {
      const detail = (event as CustomEvent).detail as
        | { info?: { uuid?: string; name?: string; rdns?: string }; provider?: unknown }
        | undefined;
      if (!detail?.info || !detail.provider) return;
      const ref = devRefId(detail.provider);
      const session = getProviderSession();
      const sessionRef = session ? devRefId(session.providerRef) : "none";
      devLog(
        "announce",
        `rdns=${detail.info.rdns ?? "?"} uuid=${detail.info.uuid ?? "?"} ref=${ref} sessionRef=${sessionRef} same=${ref === sessionRef ? "YES" : "NO — ROTATED"}`
      );
    };
    window.addEventListener("eip6963:announceProvider", onAnnounce);
    return () => {
      unsubscribe();
      window.removeEventListener("eip6963:announceProvider", onAnnounce);
    };
  }, [enabled]);
  void logTick;

  if (!enabled) return null;

  return (
    <details
      style={{
        position: "fixed",
        right: 12,
        bottom: 12,
        zIndex: 9999,
        maxWidth: 460,
        maxHeight: "60vh",
        overflow: "auto",
        background: "#111",
        color: "#eee",
        fontSize: 11,
        fontFamily: "monospace",
        padding: "8px 10px",
        borderRadius: 8,
        border: "1px solid #f3ba2f",
      }}
    >
      <summary style={{ cursor: "pointer", fontWeight: 700 }}>
        DEV provider diagnostics {report ? `(${report.announcementCount} announcements)` : ""}
      </summary>
      <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
        <div>
          <b>Connectors:</b>{" "}
          {connectors.map((c) => `${c.name}[${c.id}]`).join(" | ") || "none"}
        </div>
        <div>
          <b>Active connector:</b> {connectorInfo}
        </div>
        <div>
          <b>Session:</b> {sessionInfo}
        </div>
        {report ? (
          <>
            <div>
              <b>Duplicate rdns:</b>{" "}
              {report.duplicateRdns.length > 0
                ? report.duplicateRdns.join(", ")
                : "none"}
            </div>
            <div>
              <b>Discovered providers:</b>
              <pre style={{ whiteSpace: "pre-wrap", margin: "4px 0" }}>
                {JSON.stringify(report.discovered, null, 1)}
              </pre>
            </div>
            <div>
              <b>window.ethereum:</b>
              <pre style={{ whiteSpace: "pre-wrap", margin: "4px 0" }}>
                {JSON.stringify(report.ethereum, null, 1)}
              </pre>
            </div>
          </>
        ) : (
          <div>Collecting…</div>
        )}
        <div>
          <b>Event log (chainChanged / reverify / session / announces):</b>
          <pre style={{ whiteSpace: "pre-wrap", margin: "4px 0" }}>
            {getDevLog()
              .slice(-30)
              .map((entry) => `${entry.t.slice(11, 19)} ${entry.type} ${entry.detail}`)
              .join("\n") || "—"}
          </pre>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            disabled={collecting}
            onClick={() => void collect(connection)}
            style={{ padding: "4px 10px", cursor: "pointer" }}
          >
            {collecting ? "Collecting…" : "Re-collect"}
          </button>
          <button
            type="button"
            onClick={() => {
              clearDevLog();
              setLogTick((tick) => tick + 1);
            }}
            style={{ padding: "4px 10px", cursor: "pointer" }}
          >
            Clear log
          </button>
          <button
            type="button"
            disabled={!report}
            onClick={() => {
              if (report) {
                void navigator.clipboard.writeText(
                  JSON.stringify(
                    {
                      report,
                      session: sessionInfo,
                      connector: connectorInfo,
                      log: getDevLog(),
                    },
                    null,
                    2,
                  ),
                );
              }
            }}
            style={{ padding: "4px 10px", cursor: "pointer" }}
          >
            Copy JSON
          </button>
        </div>
      </div>
    </details>
  );
}
