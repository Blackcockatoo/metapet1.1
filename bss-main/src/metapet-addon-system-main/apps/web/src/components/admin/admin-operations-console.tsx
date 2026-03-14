"use client";

import { useState, type FormEvent } from "react";
import { Surface } from "@bluesnake-studios/ui";

import { formatDebugError } from "@/lib/client/api-error";
import { createSignedReceiverAttestation } from "@/lib/client/receiver-attestation";
import { mintAddon, transferAddon } from "@/lib/client/web-api";

interface TemplateOption {
  id: string;
  name: string;
}

interface MintFormState {
  templateId: string;
  addonId: string;
  edition: number;
  ownerPublicKey: string;
  title: string;
  description: string;
  traitsText: string;
}

export function AdminOperationsConsole({ receiverConsentRequired, templateOptions }: { receiverConsentRequired: boolean; templateOptions: TemplateOption[] }) {
  const [adminToken, setAdminToken] = useState("");
  const [adminActor, setAdminActor] = useState("admin-console");
  const [mintPending, setMintPending] = useState(false);
  const [transferPending, setTransferPending] = useState(false);
  const [mintResult, setMintResult] = useState<string | null>(null);
  const [transferResult, setTransferResult] = useState<string | null>(null);
  const [mintForm, setMintForm] = useState<MintFormState>({
    templateId: templateOptions[0]?.id ?? "",
    addonId: "",
    edition: 1,
    ownerPublicKey: "demo-owner-public-key",
    title: templateOptions[0]?.name ?? "",
    description: "Minted from the admin control plane.",
    traitsText: '{"origin":"admin-console"}'
  });
  const [transferForm, setTransferForm] = useState({
    addonId: "",
    fromOwnerPublicKey: "demo-owner-public-key",
    toOwnerPublicKey: "",
    includeReceiverConsent: receiverConsentRequired
  });
  const [receiverAttestationPrivateKey, setReceiverAttestationPrivateKey] = useState("");

  function buildHeaders() {
    return {
      adminToken,
      adminActor
    };
  }

  async function handleMint(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMintPending(true);
    setMintResult(null);

    try {
      const traits = JSON.parse(mintForm.traitsText) as Record<string, boolean | number | string>;
      const payload = await mintAddon(
        {
          templateId: mintForm.templateId,
          addonId: mintForm.addonId || `admin-${crypto.randomUUID()}`,
          edition: Number(mintForm.edition),
          ownerPublicKey: mintForm.ownerPublicKey,
          metadata: {
            title: mintForm.title,
            description: mintForm.description,
            traits
          }
        },
        buildHeaders()
      );

      setMintResult(`Mint accepted for ${payload.addon?.id ?? "unknown"}.`);
    } catch (error) {
      setMintResult(formatDebugError(error));
    } finally {
      setMintPending(false);
    }
  }

  async function handleTransfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTransferPending(true);
    setTransferResult(null);

    try {
      if (transferForm.includeReceiverConsent && receiverAttestationPrivateKey.trim().length === 0) {
        throw new Error("Paste the destination owner's private key to generate a signed receiver attestation.");
      }

      const issuedAt = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const requestId = `admin-transfer-${crypto.randomUUID()}`;
      const payload = await transferAddon(
        {
          addonId: transferForm.addonId,
          fromOwnerPublicKey: transferForm.fromOwnerPublicKey,
          toOwnerPublicKey: transferForm.toOwnerPublicKey,
          receiverConsent: transferForm.includeReceiverConsent
            ? await createSignedReceiverAttestation({
                requestId,
                addonId: transferForm.addonId,
                fromOwnerPublicKey: transferForm.fromOwnerPublicKey,
                toOwnerPublicKey: transferForm.toOwnerPublicKey,
                receiverPublicKey: transferForm.toOwnerPublicKey,
                issuedAt,
                expiresAt,
                receiverPrivateKey: receiverAttestationPrivateKey
              })
            : undefined
        },
        buildHeaders()
      );
      setTransferResult(`Transfer accepted for ${payload.addonId ?? transferForm.addonId}.`);
    } catch (error) {
      setTransferResult(formatDebugError(error));
    } finally {
      setTransferPending(false);
    }
  }

  return (
    <div className="card-grid">
      <Surface className="stacked-card">
        <h2>Admin session</h2>
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
        <p className="muted-copy">These values are sent as `x-admin-token` and `x-admin-actor` headers to the existing route handlers.</p>
      </Surface>

      <Surface className="stacked-card">
        <h2>Mint add-on</h2>
        <form className="stacked-form" onSubmit={handleMint}>
          <div className="form-grid">
            <label className="showcase-field">
              <span>Template</span>
              <select
                className="showcase-select"
                onChange={(event) => setMintForm((current) => ({ ...current, templateId: event.target.value }))}
                value={mintForm.templateId}
              >
                {templateOptions.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="showcase-field">
              <span>Edition</span>
              <input
                className="showcase-input"
                min={1}
                onChange={(event) => setMintForm((current) => ({ ...current, edition: Number(event.target.value) }))}
                type="number"
                value={mintForm.edition}
              />
            </label>
            <label className="showcase-field">
              <span>Add-on id</span>
              <input
                className="showcase-input"
                onChange={(event) => setMintForm((current) => ({ ...current, addonId: event.target.value }))}
                placeholder="Leave blank to auto-generate"
                value={mintForm.addonId}
              />
            </label>
            <label className="showcase-field">
              <span>Owner public key</span>
              <input
                className="showcase-input"
                onChange={(event) => setMintForm((current) => ({ ...current, ownerPublicKey: event.target.value }))}
                value={mintForm.ownerPublicKey}
              />
            </label>
            <label className="showcase-field">
              <span>Title</span>
              <input className="showcase-input" onChange={(event) => setMintForm((current) => ({ ...current, title: event.target.value }))} value={mintForm.title} />
            </label>
            <label className="showcase-field">
              <span>Description</span>
              <input
                className="showcase-input"
                onChange={(event) => setMintForm((current) => ({ ...current, description: event.target.value }))}
                value={mintForm.description}
              />
            </label>
          </div>
          <label className="showcase-field">
            <span>Traits JSON</span>
            <textarea
              className="showcase-input showcase-textarea"
              onChange={(event) => setMintForm((current) => ({ ...current, traitsText: event.target.value }))}
              rows={5}
              value={mintForm.traitsText}
            />
          </label>
          <button className="action-button" disabled={mintPending || adminToken.trim().length === 0} type="submit">
            {mintPending ? "Minting..." : "POST /api/mint"}
          </button>
        </form>
        {mintResult ? <p className="status-banner">{mintResult}</p> : null}
      </Surface>

      <Surface className="stacked-card">
        <h2>Transfer add-on</h2>
        <form className="stacked-form" onSubmit={handleTransfer}>
          <label className="showcase-field">
            <span>Receiver consent</span>
            <input
              checked={transferForm.includeReceiverConsent}
              disabled={receiverConsentRequired}
              onChange={(event) => setTransferForm((current) => ({ ...current, includeReceiverConsent: event.target.checked }))}
              type="checkbox"
            />
          </label>
          <p className="muted-copy">
            {receiverConsentRequired
              ? "Server policy currently requires a signed receiver attestation for every transfer."
              : "Enable this to attach a signed receiver attestation to the transfer request."}
          </p>
          <div className="form-grid">
            <label className="showcase-field">
              <span>Add-on id</span>
              <input
                className="showcase-input"
                onChange={(event) => setTransferForm((current) => ({ ...current, addonId: event.target.value }))}
                value={transferForm.addonId}
              />
            </label>
            <label className="showcase-field">
              <span>From owner</span>
              <input
                className="showcase-input"
                onChange={(event) => setTransferForm((current) => ({ ...current, fromOwnerPublicKey: event.target.value }))}
                value={transferForm.fromOwnerPublicKey}
              />
            </label>
            <label className="showcase-field">
              <span>To owner</span>
              <input
                className="showcase-input"
                onChange={(event) => setTransferForm((current) => ({ ...current, toOwnerPublicKey: event.target.value }))}
                value={transferForm.toOwnerPublicKey}
              />
            </label>
            <label className="showcase-field showcase-field--full">
              <span>Destination owner private key for attestation</span>
              <textarea
                className="showcase-input showcase-textarea"
                onChange={(event) => setReceiverAttestationPrivateKey(event.target.value)}
                placeholder="Paste the destination owner's private key when generating a signed receiver attestation"
                rows={4}
                value={receiverAttestationPrivateKey}
              />
            </label>
          </div>
          <button className="action-button" disabled={transferPending || adminToken.trim().length === 0} type="submit">
            {transferPending ? "Transferring..." : "POST /api/transfer"}
          </button>
        </form>
        {transferResult ? <p className="status-banner">{transferResult}</p> : null}
      </Surface>
    </div>
  );
}
