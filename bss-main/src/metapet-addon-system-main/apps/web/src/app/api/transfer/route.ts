import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/server/admin-auth";
import { normalizeApiError } from "@/lib/server/api-errors";
import { recordAuditEvent } from "@/lib/server/audit-log";
import { isReceiverConsentRequired } from "@/lib/server/transfer-policy";
import { transferAddonFromRequest } from "@/lib/server/transfer-service";

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
    // Mandatory trust boundary: every transfer variant on this route requires
    // admin-session authorization. Owner signatures are additive proof, not a
    // replacement for admin auth on this endpoint.
    const session = requireAdminSession(request);
    const body = await request.json();
    const result = await transferAddonFromRequest(body, {
      requesterId: session.actorId,
      isAdmin: session.isAdmin,
      requireReceiverConsent: isReceiverConsentRequired()
    });

    await recordAuditEvent({
      action: "transfer",
      actorId: session.actorId,
      status: result.status === 200 ? "accepted" : "rejected",
      details: result.body as unknown as Record<string, unknown>
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    const failure = toAdminRouteFailure(error);

    await recordAuditEvent({
      action: "transfer",
      actorId: request.headers.get("x-admin-actor") ?? "unknown",
      status: "rejected",
      details: failure.body as unknown as Record<string, unknown>
    });

    return NextResponse.json(failure.body, { status: failure.status });
  }
}
