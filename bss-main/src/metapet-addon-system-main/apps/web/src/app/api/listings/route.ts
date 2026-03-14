import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminSession, resolveOptionalAdminSession } from "@/lib/server/admin-auth";
import { apiError, normalizeApiError } from "@/lib/server/api-errors";
import { getStorefrontListing, listStorefrontListings, listingEnums, updateStorefrontListing } from "@/lib/server/listings-repository";

const updateListingSchema = z.object({
  listingId: z.string().min(1),
  priceCents: z.number().int().nonnegative(),
  status: z.enum(listingEnums.statuses),
  visibility: z.enum(listingEnums.visibility),
  badge: z.string().min(1)
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const listingId = url.searchParams.get("id");
    const adminSession = resolveOptionalAdminSession(request);

    if (listingId) {
      const listing = await getStorefrontListing(listingId);

      if (!listing || (listing.visibility === "hidden" && !adminSession)) {
        const failure = apiError(404, "not_found", "Listing not found.");
        return NextResponse.json(failure.body, { status: failure.status });
      }

      return NextResponse.json({ listing });
    }

    return NextResponse.json({ listings: await listStorefrontListings({ includeHidden: adminSession?.isAdmin === true }) });
  } catch (error) {
    const failure = normalizeApiError(error);
    return NextResponse.json(failure.body, { status: failure.status });
  }
}

export async function POST(request: Request) {
  try {
    requireAdminSession(request);
    const payload = updateListingSchema.parse(await request.json());
    const listing = await updateStorefrontListing(payload.listingId, payload);

    if (!listing) {
      const failure = apiError(404, "not_found", "Listing not found.");
      return NextResponse.json(failure.body, { status: failure.status });
    }

    return NextResponse.json({ listing });
  } catch (error) {
    const failure = normalizeApiError(error);
    return NextResponse.json(failure.body, { status: failure.status });
  }
}
