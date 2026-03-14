import { PageHeader, StatPill, Surface } from "@bluesnake-studios/ui";

import { ListingManagementConsole } from "@/components/admin/listing-management-console";
import { AuraliaShowcasePreview } from "@/components/addon/auralia-showcase-preview";
import { SiteFrame } from "@/components/layout/site-frame";
import { countFeaturedShowcaseListings, listSupportedShowcaseListings } from "@/lib/addon-showcase/catalog";
import { listStorefrontListings } from "@/lib/server/listings-repository";
import { listCatalogTemplateCards } from "@/lib/adapters/template-registry";

export default async function AdminAddonsPage() {
  const templates = listCatalogTemplateCards();
  const listings = await listStorefrontListings({ includeHidden: true });
  const showcaseListings = listSupportedShowcaseListings(listings);
  const featuredCount = countFeaturedShowcaseListings(listings);

  return (
    <SiteFrame>
      <PageHeader
        eyebrow="Admin / Listings"
        title="Registry review plus storefront controls"
        description="Templates still originate in addon-core, but storefront listings now layer price, visibility, and sale state on top of those approved definitions."
      />

      <div className="pill-row">
        <StatPill label={`${showcaseListings.length} showcase-enabled`} tone="accent" />
        <StatPill label={`${featuredCount} featured drop`} />
      </div>

      {showcaseListings[0] ? <AuraliaShowcasePreview listing={showcaseListings[0]} compact /> : null}

      <ListingManagementConsole initialListings={listings} />

      <section className="card-grid">
        {templates.map((template) => (
          <Surface className="stacked-card" key={template.id}>
            <h2>{template.name}</h2>
            <p>{template.previewText}</p>
            <p className="muted-copy">{template.editionText}</p>
          </Surface>
        ))}
      </section>
    </SiteFrame>
  );
}
