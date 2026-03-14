"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { StatPill, Surface } from "@bluesnake-studios/ui";

import { AuraliaShowcasePreview } from "@/components/addon/auralia-showcase-preview";
import {
  countFeaturedShowcaseListings,
  getAddonShowcaseMeta,
  isFeaturedShowcaseListing,
  listSupportedShowcaseListings
} from "@/lib/addon-showcase/catalog";
import { formatAddonCategory, formatAddonRarity } from "@/lib/addon-display";
import { formatPriceCents, type StorefrontListing } from "@/lib/storefront/types";

const rarityRank: Record<string, number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  legendary: 5,
  mythic: 6,
};

export function ListingShowcase({ items }: { items: StorefrontListing[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("featured");
  const [selectedPreviewId, setSelectedPreviewId] = useState("");

  const categories = useMemo(
    () => [...new Set(items.map((item) => item.category))].sort((left, right) => left.localeCompare(right)),
    [items],
  );

  const rarities = useMemo(
    () => [...new Set(items.map((item) => item.rarity))].sort((left, right) => (rarityRank[right] ?? 0) - (rarityRank[left] ?? 0)),
    [items],
  );

  const filteredItems = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const candidates = items.filter((item) => {
      const searchMatches =
        normalizedSearch.length === 0 ||
        item.name.toLowerCase().includes(normalizedSearch) ||
        item.previewText.toLowerCase().includes(normalizedSearch) ||
        item.category.toLowerCase().includes(normalizedSearch);

      const categoryMatches = categoryFilter === "all" || item.category === categoryFilter;
      const rarityMatches = rarityFilter === "all" || item.rarity === rarityFilter;

      return searchMatches && categoryMatches && rarityMatches;
    });

    return candidates.sort((left, right) => {
      if (sortBy === "name") {
        return left.name.localeCompare(right.name);
      }

      if (sortBy === "rarity") {
        return (rarityRank[right.rarity] ?? 0) - (rarityRank[left.rarity] ?? 0);
      }

      // "featured": featured items first, then by rarity descending
      const leftFeatured = isFeaturedShowcaseListing(left) ? 1 : 0;
      const rightFeatured = isFeaturedShowcaseListing(right) ? 1 : 0;
      if (leftFeatured !== rightFeatured) return rightFeatured - leftFeatured;
      return (rarityRank[right.rarity] ?? 0) - (rarityRank[left.rarity] ?? 0);
    });
  }, [items, categoryFilter, rarityFilter, searchTerm, sortBy]);

  const supportedPreviewItems = useMemo(() => listSupportedShowcaseListings(filteredItems), [filteredItems]);
  const featuredPreviewCount = useMemo(() => countFeaturedShowcaseListings(filteredItems), [filteredItems]);

  const selectedPreviewItem = useMemo(() => {
    return supportedPreviewItems.find((item) => item.id === selectedPreviewId) ?? supportedPreviewItems[0] ?? null;
  }, [selectedPreviewId, supportedPreviewItems]);

  useEffect(() => {
    if (!selectedPreviewItem) {
      setSelectedPreviewId("");
      return;
    }

    if (selectedPreviewItem.id !== selectedPreviewId) {
      setSelectedPreviewId(selectedPreviewItem.id);
    }
  }, [selectedPreviewId, selectedPreviewItem]);

  return (
    <section className="template-showcase">
      {selectedPreviewItem ? <AuraliaShowcasePreview listing={selectedPreviewItem} compact /> : null}

      <Surface className="showcase-controls" tone="muted">
        <div className="showcase-controls__header">
          <h2>Browse listings</h2>
          <p>
            Search by name, then refine by category and rarity to find live storefront inventory with explicit pricing and availability. Showcase-enabled entries carry live Auralia previews, and featured pieces highlight the first intake wave.
          </p>
        </div>

        <div className="showcase-controls__grid">
          <label className="showcase-field">
            <span>Search</span>
             <input
               aria-label="Search listings"
               className="showcase-input"
               onChange={(event) => setSearchTerm(event.target.value)}
               placeholder="Try: aquatic, guardian, epic"
               value={searchTerm}
             />
          </label>

          <label className="showcase-field">
            <span>Category</span>
            <select className="showcase-select" onChange={(event) => setCategoryFilter(event.target.value)} value={categoryFilter}>
              <option value="all">All categories</option>
               {categories.map((category) => (
                 <option key={category} value={category}>
                   {formatAddonCategory(category)}
                 </option>
               ))}
            </select>
          </label>

          <label className="showcase-field">
            <span>Rarity</span>
            <select className="showcase-select" onChange={(event) => setRarityFilter(event.target.value)} value={rarityFilter}>
              <option value="all">All rarities</option>
               {rarities.map((rarity) => (
                 <option key={rarity} value={rarity}>
                   {formatAddonRarity(rarity)}
                 </option>
               ))}
            </select>
          </label>

          <label className="showcase-field">
            <span>Sort</span>
            <select className="showcase-select" onChange={(event) => setSortBy(event.target.value)} value={sortBy}>
              <option value="featured">Featured</option>
              <option value="name">Name (A-Z)</option>
              <option value="rarity">Rarity (high to low)</option>
            </select>
          </label>
        </div>

        <div className="showcase-meta">
          <StatPill label={`${filteredItems.length} shown`} tone="accent" />
          <StatPill label={`${items.length} total`} />
          <StatPill label={`${supportedPreviewItems.length} live previews`} />
          <StatPill label={`${featuredPreviewCount} featured`} />
        </div>
      </Surface>

      <div className="card-grid">
          {filteredItems.map((item) => (
            <Surface
              as="article"
              className="template-card"
              data-rarity={item.rarity}
              key={item.id}
              onMouseEnter={() => {
                if (getAddonShowcaseMeta(item)) {
                  setSelectedPreviewId(item.id);
                }
              }}
            >
              <div className="pill-row">
                {isFeaturedShowcaseListing(item) ? <StatPill label="Featured" tone="accent" /> : null}
                <StatPill label={formatAddonCategory(item.category)} />
                <StatPill label={formatAddonRarity(item.rarity)} tone="accent" />
                <StatPill label={formatPriceCents(item.priceCents, item.currency)} />
              </div>
              <h2>{item.name}</h2>
              <p>{item.previewText}</p>
              <p className="muted-copy">{item.editionText}</p>
              {getAddonShowcaseMeta(item) ? (
                <p className="muted-copy">
                  {isFeaturedShowcaseListing(item) ? "Featured · " : ""}Live Auralia preview included.
                </p>
              ) : null}
              <Link className="text-link" href={`/addon/${item.id}`}>
                View listing →
              </Link>
            </Surface>
          ))}
      </div>

      {filteredItems.length === 0 ? (
        <Surface className="showcase-empty" tone="muted">
          <h3>No listings match your filters</h3>
          <p>Try clearing one of your filters or broadening your search term.</p>
        </Surface>
      ) : null}
    </section>
  );
}
