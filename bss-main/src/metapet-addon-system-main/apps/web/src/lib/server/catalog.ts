import { getStorefrontListing, listStorefrontListings } from "@/lib/server/listings-repository";

export async function listCatalogListings() {
  return listStorefrontListings();
}

export async function getCatalogListing(listingId: string) {
  const listing = await getStorefrontListing(listingId);
  return listing?.visibility === "public" ? listing : undefined;
}
