import Link from "next/link";
import { PageHeader, Surface, StatPill } from "@bluesnake-studios/ui";

import { AuraliaShowcasePreview } from "@/components/addon/auralia-showcase-preview";
import { SiteFrame } from "@/components/layout/site-frame";
import { countFeaturedShowcaseListings, isFeaturedShowcaseListing, listSupportedShowcaseListings } from "@/lib/addon-showcase/catalog";
import { listCatalogListings } from "@/lib/server/catalog";
import { formatPriceCents } from "@/lib/storefront/types";
import { ROUTE_PATHS } from "@bluesnake-studios/config";

export default async function HomePage() {
  const listings = await listCatalogListings();
  const showcaseListings = listSupportedShowcaseListings(listings);
  const featuredPreview = showcaseListings.find((listing) => isFeaturedShowcaseListing(listing)) ?? showcaseListings[0];
  const featuredCount = countFeaturedShowcaseListings(listings);

  return (
    <SiteFrame>
      <PageHeader
        eyebrow="BlueSnake Studios"
        title="The MOSS60 Collection"
        description="Twenty-two ceremonial add-ons for Auralia — wings, auras, masks, hair, tattoos, jewelry, and field effects built for prestige drops, event rewards, and verified cryptographic ownership."
      />

      {/* ── Collection stats strip ───────────────────────────── */}
      <div className="hero-product-stats">
        <div className="hero-stat">
          <span className="hero-stat__value">{listings.length}</span>
          <span className="hero-stat__label">Add-ons</span>
        </div>
        <div className="hero-stat">
          <span className="hero-stat__value">{featuredCount}</span>
          <span className="hero-stat__label">Featured</span>
        </div>
        <div className="hero-stat">
          <span className="hero-stat__value">{showcaseListings.length}</span>
          <span className="hero-stat__label">Live previews</span>
        </div>
        <div className="hero-stat">
          <span className="hero-stat__value">60</span>
          <span className="hero-stat__label">Max editions</span>
        </div>
        <div className="hero-stat">
          <span className="hero-stat__value">P-256</span>
          <span className="hero-stat__label">Signed on mint</span>
        </div>
      </div>

      {/* ── Hero grid ────────────────────────────────────────── */}
      <section className="hero-grid">
        <Surface className="hero-card" tone="accent">
          <p className="eyebrow">Collection overview</p>
          <h2>Verified add-ons for the Meta-Pet ecosystem</h2>
          <p>
            Each piece is cryptographically signed at mint, owned by a single public key, and transferable through an audited chain-of-custody.
            Browse, preview on Auralia, and purchase directly from the catalog.
          </p>
          <div className="pill-row">
            <StatPill label="MOSS60" tone="accent" />
            <StatPill label="ECDSA signed" tone="accent" />
            <StatPill label="Chain-of-custody" tone="accent" />
          </div>
          <Link className="action-button" style={{ textAlign: "center" }} href={ROUTE_PATHS.shop}>
            Browse the full catalog →
          </Link>
        </Surface>

        <Surface className="hero-card">
          <p className="eyebrow">Collection catalog</p>
          <ul className="plain-list">
            {listings.slice(0, 10).map((listing) => (
              <li key={listing.id}>
                <Link className="text-link" href={`/addon/${listing.id}`}>{listing.name}</Link>
                <span className="muted-copy">{formatPriceCents(listing.priceCents, listing.currency)}</span>
              </li>
            ))}
            {listings.length > 10 ? (
              <li>
                <Link className="text-link" href={ROUTE_PATHS.shop}>+{listings.length - 10} more →</Link>
              </li>
            ) : null}
          </ul>
        </Surface>
      </section>

      {/* ── Divider ──────────────────────────────────────────── */}
      <div className="collection-divider">Live preview</div>

      {/* ── Featured Auralia preview ─────────────────────────── */}
      {featuredPreview ? <AuraliaShowcasePreview listing={featuredPreview} compact /> : null}
    </SiteFrame>
  );
}
