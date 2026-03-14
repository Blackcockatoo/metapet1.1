import { PageHeader } from "@bluesnake-studios/ui";

import { SiteFrame } from "@/components/layout/site-frame";
import { ListingShowcase } from "@/components/shop/template-showcase";
import { listCatalogListings } from "@/lib/server/catalog";

export default async function ShopPage() {
  const listings = await listCatalogListings();

  return (
    <SiteFrame>
      <PageHeader
        eyebrow="Shop"
        title="Browse the MOSS60 collection"
        description="Search, filter, and preview every add-on before you buy. Hover any listing with a live preview badge to see it on Auralia in real time."
      />
      <ListingShowcase items={listings} />
    </SiteFrame>
  );
}
