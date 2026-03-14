import Link from "next/link";
import { Surface } from "@bluesnake-studios/ui";

import { ROUTE_PATHS } from "@bluesnake-studios/config";

export function Moss60SharePreview({ templateId, templateName }: { templateId: string; templateName: string }) {
  void templateId;

  return (
    <Surface className="stacked-card">
      <h2>Share & verify ownership</h2>
      <p>
        After purchasing <strong>{templateName}</strong>, you can generate a verifiable share link directly from your inventory. The link encodes a cryptographic proof of ownership that anyone can verify — no blockchain required.
      </p>
      <ul className="plain-list" style={{ display: "grid", gap: "0.55rem" }}>
        <li style={{ display: "grid" }}>
          <span style={{ fontSize: "0.82rem", color: "var(--color-ink-300)" }}>1. Purchase &amp; mint</span>
          <span style={{ fontSize: "0.9rem" }}>Add-on is signed and stored in your inventory under your public key.</span>
        </li>
        <li style={{ display: "grid" }}>
          <span style={{ fontSize: "0.82rem", color: "var(--color-ink-300)" }}>2. Generate share URL</span>
          <span style={{ fontSize: "0.9rem" }}>Your inventory creates a tamper-evident payload via <code>/api/moss60/share</code>.</span>
        </li>
        <li style={{ display: "grid" }}>
          <span style={{ fontSize: "0.82rem", color: "var(--color-ink-300)" }}>3. Verify anywhere</span>
          <span style={{ fontSize: "0.9rem" }}>Recipients can confirm authenticity, edition number, and issuer signature without your private key.</span>
        </li>
      </ul>
      <Link className="action-button" style={{ textAlign: "center" }} href={ROUTE_PATHS.inventory}>
        Go to inventory →
      </Link>
    </Surface>
  );
}
