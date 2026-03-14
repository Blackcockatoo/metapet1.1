"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Surface } from "@bluesnake-studios/ui";

import { ROUTE_PATHS } from "@bluesnake-studios/config";
import { formatDebugError } from "@/lib/client/api-error";
import { purchaseListing } from "@/lib/client/web-api";
import { useAddonStoreContext } from "@/providers/app-providers";
import { formatPriceCents, type StorefrontListing } from "@/lib/storefront/types";
import type { PurchaseListingResponse } from "@/lib/client/web-api";

export function PurchasePanel({ listing }: { listing: StorefrontListing }) {
  const store = useAddonStoreContext();
  const [ownerPublicKey, setOwnerPublicKey] = useState(store.getState().ownerPublicKey);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchaseResult, setPurchaseResult] = useState<PurchaseListingResponse | null>(null);

  const checkoutReady = listing.status === "active" && listing.visibility === "public";

  async function handlePurchase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const payload = await purchaseListing({ listingId: listing.id, ownerPublicKey });

      if (ownerPublicKey === store.getState().ownerPublicKey) {
        await store.getState().hydrate();
      }

      setPurchaseResult(payload);
    } catch (err) {
      setError(formatDebugError(err));
    } finally {
      setPending(false);
    }
  }

  if (purchaseResult) {
    return (
      <Surface className="stacked-card">
        <p className="eyebrow">Purchase complete</p>
        <h2>{purchaseResult.addon.metadata.title}</h2>
        <div className="pill-row">
          <span className="ui-stat-pill ui-stat-pill--accent">{formatPriceCents(listing.priceCents, listing.currency)}</span>
          <span className="ui-stat-pill">{purchaseResult.addon.editionLabel}</span>
          <span className="ui-stat-pill">Edition #{purchaseResult.addon.edition} of {listing.maxEditions ?? "∞"}</span>
        </div>
        <p className="muted-copy">
          Minted to <code style={{ fontSize: "0.8em", wordBreak: "break-all" }}>{purchaseResult.addon.ownerPublicKey}</code>
        </p>
        <Link className="action-button" style={{ textAlign: "center" }} href={ROUTE_PATHS.inventory}>
          View in inventory →
        </Link>
        <button
          className="action-button action-button--secondary"
          onClick={() => setPurchaseResult(null)}
          type="button"
        >
          Buy another
        </button>
      </Surface>
    );
  }

  return (
    <Surface className="stacked-card">
      <h2>Checkout</h2>
      <p>
        Each purchase mints a uniquely signed edition directly to your owner key. Your piece is cryptographically bound to you and appears in your inventory immediately after checkout.
      </p>
      <div className="pill-row">
        <span className="ui-stat-pill ui-stat-pill--accent">{formatPriceCents(listing.priceCents, listing.currency)}</span>
        <span className="ui-stat-pill">{listing.status.replaceAll("_", " ")}</span>
        {listing.maxEditions ? <span className="ui-stat-pill">{listing.maxEditions - listing.soldCount} remaining</span> : null}
      </div>
      <form className="stacked-form" onSubmit={handlePurchase}>
        <label className="showcase-field">
          <span>Owner public key</span>
          <input className="showcase-input" onChange={(event) => setOwnerPublicKey(event.target.value)} value={ownerPublicKey} />
        </label>
        <button className="action-button" disabled={pending || !checkoutReady || ownerPublicKey.trim().length === 0} type="submit">
          {pending ? "Processing..." : "Buy listing"}
        </button>
      </form>
      {!checkoutReady ? <p className="muted-copy">This listing is not currently available for checkout.</p> : null}
      {error ? <p className="status-banner" style={{ background: "rgba(180, 54, 54, 0.14)", color: "rgba(255, 122, 122, 0.9)" }}>{error}</p> : null}
    </Surface>
  );
}
