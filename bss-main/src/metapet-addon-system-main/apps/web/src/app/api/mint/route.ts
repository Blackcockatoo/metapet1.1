import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/server/admin-auth";
import { normalizeApiError } from "@/lib/server/api-errors";
import { recordAuditEvent } from "@/lib/server/audit-log";
import { mintAddonFromRequest } from "@/lib/server/mint-service";

function extractSignerKeyId(payload: unknown): string | undefined {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const addon = (payload as { addon?: unknown }).addon;

  if (typeof addon !== "object" || addon === null) {
    return undefined;
  }

  const proof = (addon as { proof?: unknown }).proof;

  if (typeof proof !== "object" || proof === null) {
    return undefined;
  }

  const keyId = (proof as { keyId?: unknown }).keyId;
  return typeof keyId === "string" && keyId.length > 0 ? keyId : undefined;
}

function toAdminRouteFailure(error: unknown) {
  const failure = normalizeApiError(error);

  if (failure.status === 401 && failure.body.code === "unauthorized") {
    return {
      status: 401,
      body: {
        code: "ADMIN_UNAUTHORIZED",
        message: failure.body.message,
        details: failure.body.details
      }
    };
  }

  return failure;
}

export async function POST(request: Request) {
  try {
    const session = requireAdminSession(request);
    const body = await request.json();
    const result = await mintAddonFromRequest(body);

    await recordAuditEvent({
      action: "mint",
      actorId: session.actorId,
      status: result.status === 200 ? "accepted" : "rejected",
      details: {
        ...(result.body as Record<string, unknown>),
        signerKeyId: extractSignerKeyId(result.body)
      }
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    const failure = toAdminRouteFailure(error);

    await recordAuditEvent({
      action: "mint",
      actorId: request.headers.get("x-admin-actor") ?? "unknown",
      status: "rejected",
      details: failure.body as unknown as Record<string, unknown>
    });

    return NextResponse.json(failure.body, { status: failure.status });
  }
}
