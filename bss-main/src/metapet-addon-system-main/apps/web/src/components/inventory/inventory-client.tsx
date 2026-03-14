"use client";

import type { Addon } from "@bluesnake-studios/addon-core";
import type { AddonStoreState } from "@bluesnake-studios/addon-store";
import { exportPrivateKey, exportPublicKey, generateAddonKeypair, importPrivateKey, signCanonicalPayload } from "@bluesnake-studios/addon-crypto";
import { useEffect, useMemo, useState } from "react";
import { EmptyState, Surface } from "@bluesnake-studios/ui";
import { selectAddons, selectEquippedAddons } from "@bluesnake-studios/addon-store";

import { AuraliaShowcasePreview } from "@/components/addon/auralia-showcase-preview";
import { getAddonShowcaseMeta } from "@/lib/addon-showcase/catalog";
import { formatAddonCategory, formatAddonRarity } from "@/lib/addon-display";
import { formatDebugError } from "@/lib/client/api-error";
import { createSignedReceiverAttestation } from "@/lib/client/receiver-attestation";
import type {
  WalletSessionChallengeResponse,
  WalletSessionVerifyResponse,
  WalletTransferPrepareResponse,
  WalletTransferSubmitRequest
} from "@/lib/client/web-api";
import { issueWalletSessionChallenge, prepareWalletTransfer, submitWalletTransfer, transferAddon, verifyWalletSession } from "@/lib/client/web-api";
import { useAddonStore } from "@/hooks/use-addon-store";

export function InventoryClient({
  directWalletTransferEnabled,
  receiverConsentRequired
}: {
  directWalletTransferEnabled: boolean;
  receiverConsentRequired: boolean;
}) {
  const store = useAddonStore((state) => state);
  const hydrated = useAddonStore((state) => state.hydrated);
  const ownerPublicKey = useAddonStore((state) => state.ownerPublicKey);
  const addons = useAddonStore((state: AddonStoreState) => selectAddons(state));
  const equipped = useAddonStore((state: AddonStoreState) => selectEquippedAddons(state));
  const [transferTargets, setTransferTargets] = useState<Record<string, string>>({});
  const [adminToken, setAdminToken] = useState("");
  const [adminActor, setAdminActor] = useState("inventory-console");
  const [includeReceiverConsent, setIncludeReceiverConsent] = useState(receiverConsentRequired);
  const [receiverAttestationPrivateKey, setReceiverAttestationPrivateKey] = useState("");
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [walletPrivateKey, setWalletPrivateKey] = useState("");
  const [generatedWalletPublicKey, setGeneratedWalletPublicKey] = useState<string | null>(null);
  const [walletTransferAddonId, setWalletTransferAddonId] = useState("");
  const [walletTransferTarget, setWalletTransferTarget] = useState("");
  const [walletPendingStep, setWalletPendingStep] = useState<string | null>(null);
  const [walletMessage, setWalletMessage] = useState<string | null>(null);
  const [walletChallenge, setWalletChallenge] = useState<WalletSessionChallengeResponse | null>(null);
  const [walletSession, setWalletSession] = useState<WalletSessionVerifyResponse | null>(null);
  const [preparedWalletTransfer, setPreparedWalletTransfer] = useState<WalletTransferPrepareResponse | null>(null);
  const [signedWalletTransfer, setSignedWalletTransfer] = useState<WalletTransferSubmitRequest | null>(null);
  const [selectedPreviewAddonId, setSelectedPreviewAddonId] = useState("");

  useEffect(() => {
    if (addons.length === 0) {
      setWalletTransferAddonId("");
      return;
    }

    if (!walletTransferAddonId || !addons.some((addon) => addon.id === walletTransferAddonId)) {
      setWalletTransferAddonId(addons[0]?.id ?? "");
    }
  }, [addons, walletTransferAddonId]);

  const showcaseAddons = useMemo(() => addons.filter((addon) => Boolean(getAddonShowcaseMeta(addon))), [addons]);

  const selectedPreviewAddon = useMemo(() => {
    return showcaseAddons.find((addon) => addon.id === selectedPreviewAddonId) ?? showcaseAddons[0] ?? null;
  }, [selectedPreviewAddonId, showcaseAddons]);

  useEffect(() => {
    if (!selectedPreviewAddon) {
      setSelectedPreviewAddonId("");
      return;
    }

    if (selectedPreviewAddon.id !== selectedPreviewAddonId) {
      setSelectedPreviewAddonId(selectedPreviewAddon.id);
    }
  }, [selectedPreviewAddon, selectedPreviewAddonId]);

  function toPreviewListing(addon: Addon) {
    return {
      id: addon.id,
      templateId: addon.templateId,
      name: addon.metadata.title,
      rarity: addon.rarity
    };
  }

  function selectPreviewAddon(addon: Addon) {
    if (getAddonShowcaseMeta(addon)) {
      setSelectedPreviewAddonId(addon.id);
    }
  }

  function resetWalletFlow() {
    setWalletChallenge(null);
    setWalletSession(null);
    setPreparedWalletTransfer(null);
    setSignedWalletTransfer(null);
  }

  async function runAction(key: string, action: () => Promise<void>, successMessage: string) {
    setPendingKey(key);
    setMessage(null);

    try {
      await action();
      setMessage(successMessage);
    } catch (error) {
      setMessage(formatDebugError(error));
    } finally {
      setPendingKey(null);
    }
  }

  async function runWalletStep(key: string, action: () => Promise<void>, successMessage: string) {
    setWalletPendingStep(key);
    setWalletMessage(null);

    try {
      await action();
      setWalletMessage(successMessage);
    } catch (error) {
      setWalletMessage(formatDebugError(error));
    } finally {
      setWalletPendingStep(null);
    }
  }

  async function handleTransfer(addonId: string) {
    const nextOwnerPublicKey = transferTargets[addonId]?.trim();

    if (!nextOwnerPublicKey) {
      setMessage("Provide a destination owner public key before transferring.");
      return;
    }

    if (includeReceiverConsent && receiverAttestationPrivateKey.trim().length === 0) {
      setMessage("Paste the destination owner's private key to generate a signed receiver attestation.");
      return;
    }

    await runAction(
      `transfer:${addonId}`,
      async () => {
        const issuedAt = new Date().toISOString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
        const requestId = `inventory-transfer-${crypto.randomUUID()}`;

        await transferAddon(
          {
            addonId,
            fromOwnerPublicKey: ownerPublicKey,
            toOwnerPublicKey: nextOwnerPublicKey,
            receiverConsent: includeReceiverConsent
              ? await createSignedReceiverAttestation({
                  requestId,
                  addonId,
                  fromOwnerPublicKey: ownerPublicKey,
                  toOwnerPublicKey: nextOwnerPublicKey,
                  receiverPublicKey: nextOwnerPublicKey,
                  issuedAt,
                  expiresAt,
                  receiverPrivateKey: receiverAttestationPrivateKey
                })
              : undefined
          },
          {
            adminToken,
            adminActor
          }
        );

        await store.hydrate();
        setTransferTargets((current) => ({ ...current, [addonId]: "" }));
      },
      `Transferred ${addonId} to ${nextOwnerPublicKey}.`
    );
  }

  async function handleGenerateWalletKeypair() {
    await runWalletStep(
      "wallet:generate",
      async () => {
        const keypair = await generateAddonKeypair();
        setWalletPrivateKey(await exportPrivateKey(keypair.privateKey));
        setGeneratedWalletPublicKey(await exportPublicKey(keypair.publicKey));
        resetWalletFlow();
      },
      "Generated a demo P-256 wallet keypair. Mint inventory to the matching public key before using wallet transfer."
    );
  }

  async function handleIssueWalletChallenge() {
    if (!walletPrivateKey.trim()) {
      setWalletMessage("Paste a wallet private key before starting wallet auth.");
      return;
    }

    await runWalletStep(
      "wallet:challenge",
      async () => {
        const challenge = await issueWalletSessionChallenge({ ownerPublicKey });
        setWalletChallenge(challenge);
        setWalletSession(null);
        setPreparedWalletTransfer(null);
        setSignedWalletTransfer(null);
      },
      "Issued wallet auth challenge for the current inventory owner."
    );
  }

  async function handleVerifyWalletSession() {
    if (!walletChallenge) {
      setWalletMessage("Issue a challenge before verifying the wallet session.");
      return;
    }

    await runWalletStep(
      "wallet:verify",
      async () => {
        const privateKey = await importPrivateKey(walletPrivateKey.trim());
        const signature = await signCanonicalPayload(walletChallenge.challenge, privateKey);
        const session = await verifyWalletSession({
          challengeToken: walletChallenge.challengeToken,
          signature
        });

        setWalletSession(session);
        setPreparedWalletTransfer(null);
        setSignedWalletTransfer(null);
      },
      "Verified wallet session. You can now prepare a direct transfer."
    );
  }

  async function handlePrepareWalletTransfer() {
    const nextOwnerPublicKey = walletTransferTarget.trim();

    if (!walletSession) {
      setWalletMessage("Verify the wallet session before preparing a transfer.");
      return;
    }

    if (!walletTransferAddonId || !nextOwnerPublicKey) {
      setWalletMessage("Select an add-on and provide a destination owner public key before preparing a wallet transfer.");
      return;
    }

    await runWalletStep(
      "wallet:prepare",
      async () => {
        const prepared = await prepareWalletTransfer(
          {
            addonId: walletTransferAddonId,
            toOwnerPublicKey: nextOwnerPublicKey,
            receiverConsentRequested: includeReceiverConsent
          },
          { sessionToken: walletSession.sessionToken }
        );

        setPreparedWalletTransfer(prepared);
        setSignedWalletTransfer(null);
      },
      `Prepared wallet transfer for ${walletTransferAddonId}.`
    );
  }

  async function handleSignWalletTransfer() {
    if (!preparedWalletTransfer) {
      setWalletMessage("Prepare the wallet transfer before signing it.");
      return;
    }

    if (includeReceiverConsent && receiverAttestationPrivateKey.trim().length === 0) {
      setWalletMessage("Paste the destination owner's private key to generate a signed receiver attestation.");
      return;
    }

    if (includeReceiverConsent && !preparedWalletTransfer.receiverConsentChallenge) {
      setWalletMessage("Prepare the transfer with receiver attestation enabled before signing it.");
      return;
    }

    await runWalletStep(
      "wallet:sign",
      async () => {
        const privateKey = await importPrivateKey(walletPrivateKey.trim());
        const signature = await signCanonicalPayload(
          {
            addonId: preparedWalletTransfer.addonId,
            fromOwnerPublicKey: preparedWalletTransfer.fromOwnerPublicKey,
            toOwnerPublicKey: preparedWalletTransfer.toOwnerPublicKey,
            nonce: preparedWalletTransfer.nonce,
            timestampMs: preparedWalletTransfer.timestampMs,
            ttlMs: preparedWalletTransfer.ttlMs
          },
          privateKey
        );

        const receiverConsent =
          includeReceiverConsent && preparedWalletTransfer.receiverConsentChallenge
            ? await createSignedReceiverAttestation({
                requestId: preparedWalletTransfer.receiverConsentChallenge.requestId,
                addonId: preparedWalletTransfer.receiverConsentChallenge.addonId,
                fromOwnerPublicKey: preparedWalletTransfer.receiverConsentChallenge.fromOwnerPublicKey,
                toOwnerPublicKey: preparedWalletTransfer.receiverConsentChallenge.toOwnerPublicKey,
                receiverPublicKey: preparedWalletTransfer.receiverConsentChallenge.toOwnerPublicKey,
                issuedAt: preparedWalletTransfer.receiverConsentChallenge.issuedAt,
                expiresAt: preparedWalletTransfer.receiverConsentChallenge.expiresAt,
                receiverPrivateKey: receiverAttestationPrivateKey
              })
            : undefined;

        setSignedWalletTransfer({
          requestId: preparedWalletTransfer.requestId,
          addonId: preparedWalletTransfer.addonId,
          fromOwnerPublicKey: preparedWalletTransfer.fromOwnerPublicKey,
          toOwnerPublicKey: preparedWalletTransfer.toOwnerPublicKey,
          nonce: preparedWalletTransfer.nonce,
          timestampMs: preparedWalletTransfer.timestampMs,
          ttlMs: preparedWalletTransfer.ttlMs,
          receiverConsent,
          signature
        });
      },
      "Signed wallet transfer payload locally."
    );
  }

  async function handleSubmitWalletTransfer() {
    if (!walletSession || !signedWalletTransfer) {
      setWalletMessage("Sign the wallet transfer before submitting it.");
      return;
    }

    await runWalletStep(
      "wallet:submit",
      async () => {
        await submitWalletTransfer(signedWalletTransfer, { sessionToken: walletSession.sessionToken });
        await store.hydrate();
        setPreparedWalletTransfer(null);
        setSignedWalletTransfer(null);
        setWalletTransferTarget("");
      },
      `Transferred ${signedWalletTransfer.addonId} through the wallet route.`
    );
  }

  if (!hydrated) {
    return (
      <Surface className="stacked-card">
        <p>Hydrating API-backed inventory...</p>
      </Surface>
    );
  }

  if (addons.length === 0) {
    return (
      <Surface className="stacked-card">
        <EmptyState
          title="Your inventory is empty"
          message="Purchase an add-on from the shop to get started. Your collection will appear here once a piece is minted to your owner key."
        />
      </Surface>
    );
  }

  return (
    <div className="template-showcase">
      {selectedPreviewAddon ? <AuraliaShowcasePreview listing={toPreviewListing(selectedPreviewAddon)} compact /> : null}

      <div className="card-grid">
        <Surface className="stacked-card">
          <h2>Your add-ons</h2>
          {showcaseAddons.length > 0 ? (
            <p className="muted-copy">Select any previewed item to update the Auralia canvas above.</p>
          ) : null}
          <ul className="plain-list">
            {addons.map((addon) => (
              <li
                className="inventory-item"
                key={addon.id}
                onMouseEnter={() => selectPreviewAddon(addon)}
                onClick={() => selectPreviewAddon(addon)}
                style={{ cursor: getAddonShowcaseMeta(addon) ? "pointer" : undefined }}
              >
                <div>
                  <strong>{addon.metadata.title}</strong>
                  <p className="muted-copy">{formatAddonRarity(addon.rarity)} · {addon.editionLabel}</p>
                  {addon.equipped ? <p className="muted-copy" style={{ color: "var(--color-gold-300)" }}>Equipped · {formatAddonCategory(addon.category)}</p> : null}
                </div>
                <div className="inventory-item__actions">
                  <div className="action-row">
                    <button
                      className="action-button"
                      disabled={pendingKey === `equip:${addon.id}` || addon.equipped}
                      onClick={() => void runAction(`equip:${addon.id}`, () => store.equipAddon(addon.id), `Equipped ${addon.metadata.title}.`)}
                      type="button"
                    >
                      Equip
                    </button>
                    <button
                      className="action-button action-button--secondary"
                      disabled={pendingKey === `unequip:${addon.id}` || !addon.equipped}
                      onClick={() => void runAction(`unequip:${addon.id}`, () => store.unequipAddon(addon.category), `Unequipped ${addon.metadata.title}.`)}
                      type="button"
                    >
                      Unequip
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {message ? <p className="status-banner">{message}</p> : null}
        </Surface>

        <Surface className="stacked-card">
          <h2>Equipped loadout</h2>
          {equipped.length === 0 ? <p className="muted-copy">Nothing equipped yet. Select an add-on and click Equip.</p> : null}
          <ul className="plain-list">
            {equipped.map((addon) => (
              <li
                className="inventory-item"
                key={addon.id}
                onMouseEnter={() => selectPreviewAddon(addon)}
                onClick={() => selectPreviewAddon(addon)}
                style={{ cursor: getAddonShowcaseMeta(addon) ? "pointer" : undefined }}
              >
                <div>
                  <span style={{ color: "var(--color-gold-300)", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    {formatAddonCategory(addon.category)}
                  </span>
                  <p style={{ margin: "0.15rem 0 0" }}>{addon.metadata.title}</p>
                  <p className="muted-copy">{addon.editionLabel}</p>
                </div>
                <button
                  className="action-button action-button--secondary"
                  disabled={pendingKey === `unequip:${addon.id}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    void runAction(`unequip:${addon.id}`, () => store.unequipAddon(addon.category), `Unequipped ${addon.metadata.title}.`);
                  }}
                  type="button"
                >
                  Unequip
                </button>
              </li>
            ))}
          </ul>
        </Surface>
      </div>

      <details className="dev-tools-section">
        <summary className="dev-tools-summary">Transfer &amp; developer tools</summary>

        <div className="template-showcase" style={{ marginTop: "1rem" }}>
          <Surface className="stacked-card" tone="muted">
            <h2>Transfer add-ons</h2>
            <div className="form-grid">
              <label className="showcase-field">
                <span>Current owner public key</span>
                <input className="showcase-input" readOnly value={ownerPublicKey} />
              </label>
              <label className="showcase-field">
                <span>Admin token</span>
                <input className="showcase-input" onChange={(event) => setAdminToken(event.target.value)} type="password" value={adminToken} />
              </label>
              <label className="showcase-field">
                <span>Admin actor</span>
                <input className="showcase-input" onChange={(event) => setAdminActor(event.target.value)} value={adminActor} />
              </label>
              <label className="showcase-field">
                <span>Require receiver consent</span>
                <input
                  checked={includeReceiverConsent}
                  disabled={receiverConsentRequired}
                  onChange={(event) => setIncludeReceiverConsent(event.target.checked)}
                  type="checkbox"
                />
              </label>
              <label className="showcase-field showcase-field--full">
                <span>Destination owner private key (for receiver attestation)</span>
                <textarea
                  className="showcase-input"
                  onChange={(event) => setReceiverAttestationPrivateKey(event.target.value)}
                  placeholder="Paste the destination owner's private key when generating a signed receiver attestation"
                  rows={3}
                  value={receiverAttestationPrivateKey}
                />
              </label>
            </div>

            <ul className="plain-list" style={{ marginTop: "0.5rem" }}>
              {addons.map((addon) => (
                <li key={addon.id} style={{ alignItems: "center" }}>
                  <span>{addon.metadata.title}</span>
                  <div className="inline-form">
                    <input
                      className="showcase-input"
                      onChange={(event) => setTransferTargets((current) => ({ ...current, [addon.id]: event.target.value }))}
                      placeholder="Destination owner public key"
                      value={transferTargets[addon.id] ?? ""}
                    />
                    <button
                      className="action-button action-button--secondary"
                      disabled={pendingKey === `transfer:${addon.id}` || adminToken.trim().length === 0}
                      onClick={() => void handleTransfer(addon.id)}
                      type="button"
                    >
                      Transfer
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="action-row" style={{ marginTop: "0.5rem" }}>
              <button className="action-button action-button--secondary" onClick={() => void runAction("hydrate", () => store.hydrate(), "Inventory refreshed.")} type="button">
                Refresh inventory
              </button>
              <button className="action-button action-button--danger" onClick={() => void runAction("reset", () => store.reset(), "Inventory reset.")} type="button">
                Reset inventory
              </button>
            </div>

            <p className="muted-copy">
              Transfers call the authenticated <code>/api/transfer</code> route and require a valid admin token.
              {receiverConsentRequired ? " A signed receiver attestation is required by server policy." : ""}
            </p>
          </Surface>

          <Surface className="stacked-card" tone="muted">
            <h2>Direct wallet transfer</h2>
            <div className="form-grid">
              <label className="showcase-field">
                <span>Wallet transfer add-on</span>
                <select className="showcase-select" onChange={(event) => setWalletTransferAddonId(event.target.value)} value={walletTransferAddonId}>
                  <option value="">Select add-on</option>
                  {addons.map((addon) => (
                    <option key={addon.id} value={addon.id}>
                      {addon.metadata.title} ({addon.id})
                    </option>
                  ))}
                </select>
              </label>
              <label className="showcase-field">
                <span>Destination owner public key</span>
                <input className="showcase-input" onChange={(event) => setWalletTransferTarget(event.target.value)} placeholder="Destination owner public key" value={walletTransferTarget} />
              </label>
              <label className="showcase-field">
                <span>Generated wallet public key</span>
                <input className="showcase-input" readOnly value={generatedWalletPublicKey ?? "Generate a demo keypair or paste a private key below."} />
              </label>
              <label className="showcase-field showcase-field--full">
                <span>Wallet private key (base64 PKCS8 P-256)</span>
                <textarea
                  className="showcase-input"
                  onChange={(event) => {
                    setWalletPrivateKey(event.target.value);
                    setGeneratedWalletPublicKey(null);
                    resetWalletFlow();
                  }}
                  placeholder="Paste the private key that matches the current inventory owner public key"
                  rows={4}
                  value={walletPrivateKey}
                />
              </label>
            </div>
            <div className="action-row">
              <button className="action-button action-button--secondary" disabled={walletPendingStep === "wallet:generate"} onClick={() => void handleGenerateWalletKeypair()} type="button">
                {walletPendingStep === "wallet:generate" ? "Generating..." : "Generate demo wallet"}
              </button>
              <button className="action-button" disabled={!directWalletTransferEnabled || walletPendingStep === "wallet:challenge" || walletPrivateKey.trim().length === 0} onClick={() => void handleIssueWalletChallenge()} type="button">
                {walletPendingStep === "wallet:challenge" ? "Issuing..." : "1. Challenge"}
              </button>
              <button className="action-button" disabled={!directWalletTransferEnabled || walletPendingStep === "wallet:verify" || !walletChallenge} onClick={() => void handleVerifyWalletSession()} type="button">
                {walletPendingStep === "wallet:verify" ? "Verifying..." : "2. Verify"}
              </button>
              <button className="action-button" disabled={!directWalletTransferEnabled || walletPendingStep === "wallet:prepare" || !walletSession} onClick={() => void handlePrepareWalletTransfer()} type="button">
                {walletPendingStep === "wallet:prepare" ? "Preparing..." : "3. Prepare"}
              </button>
              <button className="action-button" disabled={!directWalletTransferEnabled || walletPendingStep === "wallet:sign" || !preparedWalletTransfer} onClick={() => void handleSignWalletTransfer()} type="button">
                {walletPendingStep === "wallet:sign" ? "Signing..." : "4. Sign"}
              </button>
              <button className="action-button" disabled={!directWalletTransferEnabled || walletPendingStep === "wallet:submit" || !signedWalletTransfer} onClick={() => void handleSubmitWalletTransfer()} type="button">
                {walletPendingStep === "wallet:submit" ? "Submitting..." : "5. Submit"}
              </button>
            </div>
            <div className="pill-row">
              <span className="ui-stat-pill">challenge {walletChallenge?.challenge.challengeId ?? "pending"}</span>
              <span className="ui-stat-pill">session {walletSession?.session.sessionId ?? "pending"}</span>
              <span className="ui-stat-pill">prepare {preparedWalletTransfer?.requestId ?? "pending"}</span>
              <span className="ui-stat-pill">submit {signedWalletTransfer ? "signed" : "pending"}</span>
            </div>
            {walletSession ? <p className="muted-copy">Session expires at {walletSession.session.expiresAt}.</p> : null}
            <p className="muted-copy">
              {!directWalletTransferEnabled ? "Wallet transfer route is disabled by server policy." : "Challenge → sign → submit. Use a private key that matches the current inventory owner public key."}
            </p>
            {walletMessage ? <p className="status-banner">{walletMessage}</p> : null}
          </Surface>
        </div>
      </details>
    </div>
  );
}
