import { getAddonTemplate } from "@bluesnake-studios/addon-core";
import { z } from "zod";

import { runAppDatabaseTransaction } from "@/lib/server/app-database-adapter";
import { apiError } from "@/lib/server/api-errors";

import { appendOwnedAddon } from "@/lib/server/inventory-repository";
import { getStorefrontListing } from "@/lib/server/listings-repository";
import { issueMintedAddon } from "@/lib/server/mint-service";
import type { ListingStatus } from "@/lib/storefront/types";

const purchaseRequestSchema = z.object({
  listingId: z.string().min(1),
  ownerPublicKey: z.string().min(1)
});

export async function purchaseListingFromRequest(body: unknown) {
  const payload = purchaseRequestSchema.parse(body);
  const listing = await getStorefrontListing(payload.listingId);

  if (!listing || listing.visibility !== "public") {
    return apiError(404, "not_found", "Listing not found.");
  }

  if (listing.status !== "active") {
    return apiError(409, "integrity_failed", "Listing is not available for checkout.");
  }

  if (listing.maxEditions && listing.soldCount >= listing.maxEditions) {
    return apiError(409, "integrity_failed", "Listing has sold out.");
  }

  const template = getAddonTemplate(listing.templateId);

  if (!template) {
    return apiError(404, "not_found", "Template not found for listing.");
  }

  const edition = listing.soldCount + 1;

  const addonId = `${listing.id}-${edition}-${crypto.randomUUID().slice(0, 8)}`;
  const minted = await issueMintedAddon({
    templateId: template.id,
    addonId,
    edition,
    ownerPublicKey: payload.ownerPublicKey,
    metadata: {
      title: `${listing.defaultMetadata.title} #${edition}`,
      description: listing.defaultMetadata.description,
      traits: listing.defaultMetadata.traits
    }
  });

  if (!("addon" in minted.body) || !("custodyMode" in minted.body)) {
    return minted;
  }

  const addon = minted.body.addon;
  const custodyMode = minted.body.custodyMode;
  const signerKeyId = addon?.proof?.keyId;

  if (!addon || !custodyMode) {
    throw new Error("Minted purchase response missing addon or custody mode.");
  }

  const order = {
    id: `order-${crypto.randomUUID()}`,
    listingId: listing.id,
    addonId: addon.id,
    ownerPublicKey: payload.ownerPublicKey,
    edition,
    amountCents: listing.priceCents,
    currency: listing.currency,
    status: "accepted" as const,
    custodyMode,
    signerKeyId,
    createdAt: new Date().toISOString()
  };

  const committed = await runAppDatabaseTransaction(async (transaction) => {
    const currentListing = await transaction.getStorefrontListing(listing.id);

    if (!currentListing || currentListing.visibility !== "public") {
      return apiError(404, "not_found", "Listing not found.");
    }

    if (currentListing.status !== "active") {
      return apiError(409, "integrity_failed", "Listing is not available for checkout.");
    }

    if (currentListing.maxEditions && currentListing.soldCount >= currentListing.maxEditions) {
      return apiError(409, "integrity_failed", "Listing has sold out.");
    }

    if (currentListing.soldCount + 1 !== edition) {
      return apiError(409, "integrity_failed", "Listing edition changed before checkout could be committed. Retry the purchase.");
    }

    await appendOwnedAddon(payload.ownerPublicKey, addon, transaction);

    const soldCount = currentListing.soldCount + 1;
    const status: ListingStatus = currentListing.maxEditions && soldCount >= currentListing.maxEditions ? "sold_out" : currentListing.status;
    const nextListing = {
      ...currentListing,
      soldCount,
      status
    };

    await transaction.upsertStorefrontListing(nextListing);
    await transaction.insertStorefrontOrder(order);

    return {
      status: 200,
      body: {
        ok: true,
        order,
        addon,
        listing: nextListing
      }
    };
  });

  return committed;
}
