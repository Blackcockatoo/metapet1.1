import { NextResponse } from "next/server";

import { apiError, normalizeApiError } from "@/lib/server/api-errors";
import { getCatalogListing, listCatalogListings } from "@/lib/server/catalog";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const listingId = url.searchParams.get("id");

    if (listingId) {
      const listing = await getCatalogListing(listingId);

      if (!listing) {
        const failure = apiError(404, "not_found", "Listing not found.");
        return NextResponse.json(failure.body, { status: failure.status });
      }

      return NextResponse.json({ listing });
    }

    return NextResponse.json({ listings: await listCatalogListings() });
  } catch (error) {
    const failure = normalizeApiError(error);
    return NextResponse.json(failure.body, { status: failure.status });
  }
}
