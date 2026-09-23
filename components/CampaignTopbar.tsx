"use client";

/**
 * Site-wide campaign topbar (client component).
 *
 * Fetches the public discovery endpoint once per page load and renders the
 * announcement banner ONLY when a real codeless campaign is active. Renders
 * nothing (no spacing, no placeholder) otherwise or while loading.
 *
 * Nothing is hard-coded: name, percent, and end time all come from the
 * server. The banner links to /create; the discount itself is applied and
 * validated server-side by the quote engine.
 */

import { useEffect, useState } from "react";

type DiscoveryCampaign = {
  name: string;
  discountBasisPoints: number;
  discountPercent: string;
  endsAt: string;
};

export function CampaignTopbar() {
  const [campaign, setCampaign] = useState<DiscoveryCampaign | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      try {
        const response = await fetch("/api/campaigns/active", {
          method: "GET",
          headers: { accept: "application/json" },
        });
        if (!response.ok) return;
        const payload = (await response.json()) as {
          campaign?: unknown;
        };
        const value = payload.campaign;
        if (cancelled || !value || typeof value !== "object") return;
        const record = value as Record<string, unknown>;
        if (
          typeof record.name !== "string" ||
          record.name.length === 0 ||
          typeof record.discountPercent !== "string" ||
          !/^\d+(\.\d{1,2})?$/.test(record.discountPercent)
        ) {
          return;
        }
        setCampaign({
          name: record.name,
          discountBasisPoints:
            typeof record.discountBasisPoints === "number"
              ? record.discountBasisPoints
              : 0,
          discountPercent: record.discountPercent,
          endsAt: typeof record.endsAt === "string" ? record.endsAt : "",
        });
      } catch {
        // Discovery is best-effort: no banner rather than a broken one.
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!campaign) return null;

  return (
    <div className="announce" role="region" aria-label="Current promotion">
      <a className="announce-link" href="/create">
        <span className="announce-season">{campaign.name}</span>
        <span className="announce-sep" aria-hidden="true">
          |
        </span>
        <span className="announce-offer">
          {campaign.discountPercent}% OFF all token deployments
        </span>
        <span className="announce-go">
          Create token <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
        </span>
      </a>
    </div>
  );
}
