export type ListingStatus = "draft" | "active" | "sold_out";
export type ListingVisibility = "public" | "hidden";

export interface StorefrontListing {
  id: string;
  templateId: string;
  slug: string;
  name: string;
  category: string;
  rarity: string;
  previewText: string;
  editionText: string;
  fieldSummary: string;
  priceCents: number;
  currency: string;
  status: ListingStatus;
  visibility: ListingVisibility;
  badge: string;
  soldCount: number;
  maxEditions?: number;
  defaultMetadata: {
    title: string;
    description: string;
    traits: Record<string, boolean | number | string>;
  };
}

export interface StorefrontOrder {
  id: string;
  listingId: string;
  addonId: string;
  ownerPublicKey: string;
  edition: number;
  amountCents: number;
  currency: string;
  status: "accepted";
  custodyMode: "local-dev" | "managed";
  signerKeyId?: string;
  createdAt: string;
}

export function formatPriceCents(amountCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amountCents / 100);
}
