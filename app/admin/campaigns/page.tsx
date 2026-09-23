/**
 * Phase 7C admin campaigns page (server-rendered, authenticated only).
 *
 * Lists honest discount campaigns with server-derived status
 * (Scheduled / Active / Ended / Disabled). Admins can create campaigns,
 * enable/disable them, and edit FUTURE campaigns; started campaigns keep
 * frozen economic terms (only the enabled kill-switch may change).
 */

import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ADMIN_SESSION_COOKIE } from "../../../lib/admin/session";
import { getAdminStores } from "../../../lib/admin/stores";
import { resolveAdminAccess } from "../../../lib/admin/dashboard/access";
import { formatUtc } from "../../../lib/admin/dashboard/format";
import {
  basisPointsToPercentLabel,
  toCampaignDto,
  type CampaignDto,
} from "../../../lib/admin/pricing-api";
import { getPricingStores } from "../../../lib/pricing/server/store";
import { AdminShell } from "../_components/admin-shell";
import { CampaignActions, CreateCampaignForm } from "./campaign-forms";
import styles from "../admin.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Campaigns — BNB Token Maker",
  robots: { index: false, follow: false },
};

function StatusBadge({ status }: { status: CampaignDto["status"] }) {
  if (status === "active") {
    return (
      <span className={`${styles.badge} ${styles.badgeOn}`}>Active</span>
    );
  }
  if (status === "scheduled") {
    return (
      <span className={`${styles.badge} ${styles.badgeTestnet}`}>
        Scheduled
      </span>
    );
  }
  if (status === "ended") {
    return <span className={styles.badge}>Ended</span>;
  }
  return <span className={styles.badge}>Disabled</span>;
}

export default async function AdminCampaignsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value ?? null;
  const access = await resolveAdminAccess(token, getAdminStores());
  if (!access.ok) {
    if (access.reason === "unavailable") {
      return <CampaignsErrorState />;
    }
    redirect("/admin/login");
  }

  let campaigns: CampaignDto[] | null = null;
  try {
    const rows = await getPricingStores().pricing.listCampaigns();
    const now = new Date();
    campaigns = rows.map((row) => toCampaignDto(row, now));
  } catch {
    return (
      <AdminShell identifier={access.identifier} active="campaigns">
        <CampaignsErrorState />
      </AdminShell>
    );
  }

  return (
    <AdminShell identifier={access.identifier} active="campaigns">
      <header className={styles.pageHead}>
        <div className={styles.kicker}>
          <span className={styles.dot}></span>Site administration
        </div>
        <h1>Campaigns</h1>
        <p>
          Real percentage discounts with real start and end times. Status is
          derived from the schedule and the enabled switch — never edited
          directly. Started campaigns keep frozen economic terms; disable one
          to end it early.
        </p>
      </header>

      <div className={styles.card}>
        <h2>Create campaign</h2>
        <p className={`${styles.muted} ${styles.small}`} style={{ marginBottom: "1rem" }}>
          Whole-quote discount, maximum 90%. New campaigns are always
          automatic (codeless) and apply to every quote while active.
          Maximum lifetime 366 days. Legacy coded rows remain listed below
          and can be disabled to retire them.
        </p>
        <CreateCampaignForm />
      </div>

      <div className={styles.sectionTitle}>
        <h2>All campaigns</h2>
      </div>
      {campaigns.length === 0 ? (
        <div className={styles.card}>
          <div className={styles.empty}>
            <h2>No campaigns yet</h2>
            <p>Create the first honest discount above. Public pricing shows no discount UI until one is active.</p>
          </div>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption>Discount campaigns (newest start first)</caption>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Discount</th>
                <th scope="col">Window (UTC)</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr key={campaign.id}>
                  <td>
                    <span className={styles.cellMain}>{campaign.name}</span>
                    <br />
                    <span className={`${styles.cellSub} ${styles.mono}`}>
                      {campaign.code ? `code ${campaign.code}` : "automatic"}
                    </span>
                  </td>
                  <td className={styles.mono}>
                    {basisPointsToPercentLabel(campaign.discountBasisPoints)}%
                  </td>
                  <td className={styles.cellSub}>
                    {formatUtc(new Date(campaign.startsAt))}
                    <br />→ {formatUtc(new Date(campaign.endsAt))}
                  </td>
                  <td>
                    <StatusBadge status={campaign.status} />
                  </td>
                  <td>
                    <CampaignActions campaign={campaign} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}

function CampaignsErrorState() {
  return (
    <div className={styles.admin}>
      <div className={`${styles.container} ${styles.main}`}>
        <div className={`${styles.notice} ${styles.noticeError}`} role="alert">
          <h2>Campaign service unavailable</h2>
          <p className={styles.muted}>
            The campaign database could not be reached. Please try again in a
            moment.
          </p>
          <p>
            <a className={styles.link} href="/admin/campaigns">
              Retry
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
