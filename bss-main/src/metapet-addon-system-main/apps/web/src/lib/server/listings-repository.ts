import { getAddonTemplate, listAddonTemplates, type AddonTemplate } from "@bluesnake-studios/addon-core";

import { isFeaturedShowcaseListing } from "@/lib/addon-showcase/catalog";
import { getAppDatabaseAdapter } from "@/lib/server/app-database-adapter";
import type { ListingStatus, ListingVisibility, StorefrontListing, StorefrontOrder } from "@/lib/storefront/types";

export interface StorefrontOrderQuery {
  limit?: number;
  listingId?: string;
  ownerPublicKey?: string;
  search?: string;
}

const defaultPriceByRarity: Record<string, number> = {
  common: 900,
  uncommon: 1400,
  rare: 2200,
  epic: 3400,
  legendary: 5500,
  mythic: 8200
};

function toEditionText(template: AddonTemplate): string {
  if (template.editionLimit.policy === "open") {
    return "Open edition";
  }

  return `${template.editionLimit.maxEditions ?? 0} max editions`;
}

function createSeedListing(template: AddonTemplate): StorefrontListing {
  const seedBadge = isFeaturedShowcaseListing({ id: template.id, templateId: template.id }) ? "Featured" : template.rarity;

  return {
    id: template.id,
    templateId: template.id,
    slug: template.slug,
    name: template.name,
    category: template.category,
    rarity: template.rarity,
    previewText: template.previewText,
    editionText: toEditionText(template),
    fieldSummary: template.metadataModel.fields.map((field) => field.label).join(", "),
    priceCents: defaultPriceByRarity[template.rarity] ?? 1200,
    currency: "USD",
    status: "active",
    visibility: "public",
    badge: seedBadge,
    soldCount: 0,
    maxEditions: template.editionLimit.maxEditions,
    defaultMetadata: {
      title: template.name,
      description: template.previewText,
      traits: {
        category: template.category,
        rarity: template.rarity,
        collection: template.collection
      }
    }
  };
}

function isGeneratedBadge(listing: StorefrontListing): boolean {
  return listing.badge === listing.rarity || listing.badge === "Featured";
}

function shouldRefreshSeedListing(existing: StorefrontListing, seeded: StorefrontListing): boolean {
  return (
    existing.slug !== seeded.slug ||
    existing.name !== seeded.name ||
    existing.category !== seeded.category ||
    existing.rarity !== seeded.rarity ||
    existing.previewText !== seeded.previewText ||
    existing.editionText !== seeded.editionText ||
    existing.fieldSummary !== seeded.fieldSummary ||
    existing.currency !== seeded.currency ||
    existing.maxEditions !== seeded.maxEditions ||
    existing.defaultMetadata.title !== seeded.defaultMetadata.title ||
    existing.defaultMetadata.description !== seeded.defaultMetadata.description ||
    JSON.stringify(existing.defaultMetadata.traits) !== JSON.stringify(seeded.defaultMetadata.traits) ||
    (isGeneratedBadge(existing) && existing.badge !== seeded.badge)
  );
}

async function ensureSeedListings() {
  const adapter = getAppDatabaseAdapter();
  const listings = new Map((await adapter.listStorefrontListings({ includeHidden: true })).map((listing) => [listing.id, listing]));

  for (const template of listAddonTemplates()) {
    if (!listings.has(template.id)) {
      const listing = createSeedListing(template);
      await adapter.upsertStorefrontListing(listing);
      listings.set(template.id, listing);
      continue;
    }

    const existing = listings.get(template.id);

    if (!existing) {
      continue;
    }

    const seeded = createSeedListing(template);
    const nextListing: StorefrontListing = {
      ...existing,
      slug: seeded.slug,
      name: seeded.name,
      category: seeded.category,
      rarity: seeded.rarity,
      previewText: seeded.previewText,
      editionText: seeded.editionText,
      fieldSummary: seeded.fieldSummary,
      currency: seeded.currency,
      maxEditions: seeded.maxEditions,
      defaultMetadata: seeded.defaultMetadata,
      badge: isGeneratedBadge(existing) ? seeded.badge : existing.badge
    };

    if (shouldRefreshSeedListing(existing, nextListing)) {
      await adapter.upsertStorefrontListing(nextListing);
      listings.set(template.id, nextListing);
    }
  }

  return listings;
}

function sortListings(left: StorefrontListing, right: StorefrontListing) {
  if (left.status !== right.status) {
    return left.status === "active" ? -1 : 1;
  }

  return left.name.localeCompare(right.name);
}

export async function listStorefrontListings(options: { includeHidden?: boolean } = {}): Promise<StorefrontListing[]> {
  const listings = await ensureSeedListings();

  return Array.from(listings.values())
    .filter((listing) => options.includeHidden || listing.visibility === "public")
    .sort(sortListings);
}

export async function getStorefrontListing(listingId: string): Promise<StorefrontListing | undefined> {
  const listings = await ensureSeedListings();
  return listings.get(listingId);
}

export async function updateStorefrontListing(
  listingId: string,
  updates: Partial<Pick<StorefrontListing, "badge" | "priceCents" | "status" | "visibility">>
): Promise<StorefrontListing | undefined> {
  const existing = await getStorefrontListing(listingId);

  if (!existing) {
    return undefined;
  }

  const nextListing: StorefrontListing = {
    ...existing,
    ...updates
  };

  await getAppDatabaseAdapter().upsertStorefrontListing(nextListing);
  return nextListing;
}

export async function recordStorefrontOrder(order: StorefrontOrder): Promise<void> {
  await getAppDatabaseAdapter().insertStorefrontOrder(order);
}

export async function listStorefrontOrders(query: StorefrontOrderQuery = {}): Promise<StorefrontOrder[]> {
  return getAppDatabaseAdapter().queryStorefrontOrders(query);
}

export async function recordListingSale(listingId: string): Promise<StorefrontListing | undefined> {
  const listing = await getStorefrontListing(listingId);

  if (!listing) {
    return undefined;
  }

  const soldCount = listing.soldCount + 1;
  const status: ListingStatus = listing.maxEditions && soldCount >= listing.maxEditions ? "sold_out" : listing.status;

  const nextListing: StorefrontListing = {
    ...listing,
    soldCount,
    status
  };

  await getAppDatabaseAdapter().upsertStorefrontListing(nextListing);
  return nextListing;
}

export async function getNextListingEdition(listingId: string): Promise<number | undefined> {
  const listing = await getStorefrontListing(listingId);

  if (!listing) {
    return undefined;
  }

  return listing.soldCount + 1;
}

export async function getCatalogTemplateForListing(listingId: string) {
  const listing = await getStorefrontListing(listingId);

  if (!listing) {
    return undefined;
  }

  return getAddonTemplate(listing.templateId);
}

export const listingEnums = {
  statuses: ["draft", "active", "sold_out"] satisfies ListingStatus[],
  visibility: ["public", "hidden"] satisfies ListingVisibility[]
};
