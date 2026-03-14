import { addonSchema } from "@bluesnake-studios/addon-core";
import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError, normalizeApiError } from "@/lib/server/api-errors";
import { clearInventorySnapshot, loadInventorySnapshot, saveInventorySnapshot } from "@/lib/server/inventory-repository";

const inventorySnapshotSchema = z.object({
  ownerPublicKey: z.string().min(1),
  addons: z.record(z.string(), addonSchema),
  equippedByCategory: z.record(z.string(), z.string().min(1))
});

const inventoryBodySchema = z.object({
  ownerPublicKey: z.string().min(1),
  snapshot: inventorySnapshotSchema
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const ownerPublicKey = url.searchParams.get("ownerPublicKey");

    if (!ownerPublicKey) {
      const failure = apiError(400, "validation_failed", "ownerPublicKey is required.");
      return NextResponse.json(failure.body, { status: failure.status });
    }

    const snapshot = await loadInventorySnapshot(ownerPublicKey);
    return NextResponse.json({ snapshot: snapshot ?? null });
  } catch (error) {
    const failure = normalizeApiError(error);
    return NextResponse.json(failure.body, { status: failure.status });
  }
}

export async function POST(request: Request) {
  try {
    const parsed = inventoryBodySchema.parse(await request.json());
    await saveInventorySnapshot(parsed.ownerPublicKey, parsed.snapshot);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const failure = normalizeApiError(error);
    return NextResponse.json(failure.body, { status: failure.status });
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const ownerPublicKey = url.searchParams.get("ownerPublicKey");

    if (!ownerPublicKey) {
      const failure = apiError(400, "validation_failed", "ownerPublicKey is required.");
      return NextResponse.json(failure.body, { status: failure.status });
    }

    await clearInventorySnapshot(ownerPublicKey);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const failure = normalizeApiError(error);
    return NextResponse.json(failure.body, { status: failure.status });
  }
}
