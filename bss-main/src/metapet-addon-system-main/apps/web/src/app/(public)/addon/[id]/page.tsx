import { PageHeader } from "@bluesnake-studios/ui";

import { AddonDetailCard } from "@/components/addon/addon-detail-card";
import { AuraliaShowcasePreview } from "@/components/addon/auralia-showcase-preview";
import { SiteFrame } from "@/components/layout/site-frame";
import { Moss60SharePreview } from "@/components/moss60/share-preview";
import { PurchasePanel } from "@/components/shop/purchase-panel";
import { getAddonShowcaseMeta } from "@/lib/addon-showcase/catalog";
import { getCatalogListing } from "@/lib/server/catalog";

export default async function AddonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await getCatalogListing(id);
  const showcaseMeta = listing ? getAddonShowcaseMeta(listing) : undefined;

  if (!listing) {
    return (
      <SiteFrame>
        <PageHeader
          eyebrow="Listing Detail"
          title="Listing not found"
          description="The requested add-on listing is not published in the storefront catalog."
        />
      </SiteFrame>
    );
  }

  return (
    <SiteFrame>
      <PageHeader eyebrow="Listing Detail" title={listing.name} description={listing.previewText} />
      {showcaseMeta ? <AuraliaShowcasePreview listing={listing} meta={showcaseMeta} /> : null}
      <div className="detail-grid">
        <AddonDetailCard listing={listing} />
        <PurchasePanel listing={listing} />
        <Moss60SharePreview templateId={listing.templateId} templateName={listing.name} />
      </div>
    </SiteFrame>
  );
}
