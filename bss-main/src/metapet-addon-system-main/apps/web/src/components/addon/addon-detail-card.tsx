import { InfoGrid, Surface } from "@bluesnake-studios/ui";

import { formatAddonCategory, formatAddonRarity } from "@/lib/addon-display";
import { formatPriceCents, type StorefrontListing } from "@/lib/storefront/types";

export function AddonDetailCard({ listing }: { listing: StorefrontListing }) {
  return (
    <Surface className="stacked-card">
      <h2>{listing.name}</h2>
      <p>{listing.previewText}</p>
      <InfoGrid
        items={[
          { label: "Category", value: formatAddonCategory(listing.category) },
          { label: "Rarity", value: formatAddonRarity(listing.rarity) },
          { label: "Edition policy", value: listing.editionText },
          { label: "Fields", value: listing.fieldSummary },
          { label: "Price", value: formatPriceCents(listing.priceCents, listing.currency) },
          { label: "Availability", value: listing.status.replaceAll("_", " ") }
        ]}
      />
    </Surface>
  );
}
