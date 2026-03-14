import { listAddonTemplates } from "@bluesnake-studios/addon-core";
import { InfoGrid, PageHeader, StatPill, Surface } from "@bluesnake-studios/ui";

import { AdminActivityConsole } from "@/components/admin/admin-activity-console";
import { AdminOperationsConsole } from "@/components/admin/admin-operations-console";
import { SiteFrame } from "@/components/layout/site-frame";
import { listAuditEvents } from "@/lib/server/audit-log";
import { listStorefrontListings, listStorefrontOrders } from "@/lib/server/listings-repository";
import { listReplayNonceRecords } from "@/lib/server/replay-repository";
import { isReceiverConsentRequired } from "@/lib/server/transfer-policy";

export default async function AdminPage() {
  const templates = listAddonTemplates().map((template) => ({ id: template.id, name: template.name }));
  const receiverConsentRequired = isReceiverConsentRequired();
  const [listings, auditEvents, orders, replayNonces] = await Promise.all([
    listStorefrontListings({ includeHidden: true }),
    listAuditEvents({ limit: 5 }),
    listStorefrontOrders({ limit: 5 }),
    listReplayNonceRecords({ limit: 5 })
  ]);

  return (
    <SiteFrame>
      <PageHeader
        eyebrow="Admin"
        title="Control panel"
        description="Mint add-ons, authorize transfers, manage listing visibility and pricing, and review the full audit trail for all operations."
      />

      <div className="pill-row">
        <StatPill label={`Receiver consent: ${receiverConsentRequired ? "required" : "optional"}`} tone={receiverConsentRequired ? "accent" : "neutral"} />
        <StatPill label="Transfer route: admin-only" tone="neutral" />
      </div>

      <section className="card-grid">
        <Surface className="stacked-card">
          <h2>Custody modes</h2>
          <InfoGrid
            items={[
              { label: "env", value: "ADDON_ISSUER_PRIVATE_KEY + ADDON_ISSUER_PUBLIC_KEY" },
              { label: "managed", value: "ADDON_MANAGED_ISSUER_PRIVATE_KEY + ADDON_MANAGED_ISSUER_PUBLIC_KEY" }
            ]}
          />
        </Surface>
        <Surface className="stacked-card">
          <h2>Auth boundary</h2>
          <p>All mint and transfer operations require the `x-admin-token` header and can include `x-admin-actor` for attribution.</p>
        </Surface>
        <Surface className="stacked-card">
          <h2>Audit trail</h2>
          <p>Mint + transfer outcomes are persisted in the SQLite-backed `.data/app.db` store and can be queried through `/api/admin/activity` for operational review.</p>
        </Surface>
        <Surface className="stacked-card">
          <h2>Storefront state</h2>
          <InfoGrid
            items={[
              { label: "Listings", value: String(listings.length) },
              { label: "Active", value: String(listings.filter((listing) => listing.status === "active").length) },
              { label: "Hidden", value: String(listings.filter((listing) => listing.visibility === "hidden").length) }
            ]}
          />
        </Surface>
      </section>

      <AdminActivityConsole initialAuditEvents={auditEvents} initialOrders={orders} initialReplayNonces={replayNonces} />

      <AdminOperationsConsole receiverConsentRequired={receiverConsentRequired} templateOptions={templates} />
    </SiteFrame>
  );
}
