"use client";

import { useState } from "react";
import { Surface } from "@bluesnake-studios/ui";

import { formatDebugError } from "@/lib/client/api-error";
import { updateListing } from "@/lib/client/web-api";
import { getAddonShowcaseMeta, isFeaturedShowcaseListing } from "@/lib/addon-showcase/catalog";
import { formatPriceCents, type StorefrontListing } from "@/lib/storefront/types";

export function ListingManagementConsole({ initialListings }: { initialListings: StorefrontListing[] }) {
  const [adminToken, setAdminToken] = useState("");
  const [adminActor, setAdminActor] = useState("catalog-admin");
  const [listings, setListings] = useState(initialListings);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleSave(listingId: string) {
    const listing = listings.find((item) => item.id === listingId);

    if (!listing) {
      return;
    }

    setPendingId(listingId);
    setMessage(null);

    try {
      const payload = await updateListing(
        {
          listingId: listing.id,
          priceCents: listing.priceCents,
          status: listing.status,
          visibility: listing.visibility,
          badge: listing.badge
        },
        { adminToken, adminActor }
      );

      setListings((current) => current.map((item) => (item.id === payload.listing?.id ? payload.listing : item)));
      setMessage(`Saved ${payload.listing.name}.`);
    } catch (error) {
      setMessage(formatDebugError(error));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section className="template-showcase">
      <Surface className="stacked-card">
        <h2>Storefront listing controls</h2>
        <div className="form-grid">
          <label className="showcase-field">
            <span>Admin token</span>
            <input className="showcase-input" onChange={(event) => setAdminToken(event.target.value)} type="password" value={adminToken} />
          </label>
          <label className="showcase-field">
            <span>Actor id</span>
            <input className="showcase-input" onChange={(event) => setAdminActor(event.target.value)} value={adminActor} />
          </label>
        </div>
        <p className="muted-copy">Listings are now their own model with pricing, visibility, status, and sales tracking separate from the template registry.</p>
        <p className="muted-copy">Showcase-enabled listings can be marketed as live Auralia previews, and featured entries mark the intake launch set.</p>
        {message ? <p className="status-banner">{message}</p> : null}
      </Surface>

      <div className="card-grid">
        {listings.map((listing) => (
          <Surface className="stacked-card" key={listing.id}>
            <div className="listing-card__header">
              <div>
                <h2>{listing.name}</h2>
                <p>{listing.previewText}</p>
                {getAddonShowcaseMeta(listing) ? (
                  <p className="muted-copy">
                    {isFeaturedShowcaseListing(listing) ? "Featured Auralia preview listing." : "Auralia preview supported."}
                  </p>
                ) : null}
              </div>
              <div className="pill-row">
                {isFeaturedShowcaseListing(listing) ? <span className="ui-stat-pill ui-stat-pill--accent">featured</span> : null}
                <span className="ui-stat-pill ui-stat-pill--accent">{formatPriceCents(listing.priceCents, listing.currency)}</span>
                <span className="ui-stat-pill">{listing.soldCount} sold</span>
              </div>
            </div>
            <div className="form-grid">
              <label className="showcase-field">
                <span>Price cents</span>
                <input
                  className="showcase-input"
                  min={0}
                  onChange={(event) =>
                    setListings((current) =>
                      current.map((item) =>
                        item.id === listing.id ? { ...item, priceCents: Number(event.target.value) } : item
                      )
                    )
                  }
                  type="number"
                  value={listing.priceCents}
                />
              </label>
              <label className="showcase-field">
                <span>Status</span>
                <select
                  className="showcase-select"
                  onChange={(event) =>
                    setListings((current) =>
                      current.map((item) => (item.id === listing.id ? { ...item, status: event.target.value as StorefrontListing["status"] } : item))
                    )
                  }
                  value={listing.status}
                >
                  <option value="draft">draft</option>
                  <option value="active">active</option>
                  <option value="sold_out">sold_out</option>
                </select>
              </label>
              <label className="showcase-field">
                <span>Visibility</span>
                <select
                  className="showcase-select"
                  onChange={(event) =>
                    setListings((current) =>
                      current.map((item) =>
                        item.id === listing.id ? { ...item, visibility: event.target.value as StorefrontListing["visibility"] } : item
                      )
                    )
                  }
                  value={listing.visibility}
                >
                  <option value="public">public</option>
                  <option value="hidden">hidden</option>
                </select>
              </label>
              <label className="showcase-field">
                <span>Badge</span>
                <input
                  className="showcase-input"
                  onChange={(event) =>
                    setListings((current) =>
                      current.map((item) => (item.id === listing.id ? { ...item, badge: event.target.value } : item))
                    )
                  }
                  value={listing.badge}
                />
              </label>
            </div>
            <button className="action-button" disabled={pendingId === listing.id || adminToken.trim().length === 0} onClick={() => void handleSave(listing.id)} type="button">
              {pendingId === listing.id ? "Saving..." : "Save listing"}
            </button>
          </Surface>
        ))}
      </div>
    </section>
  );
}
