import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/lib/server/audit-log";
import { normalizeApiError } from "@/lib/server/api-errors";
import { isDirectWalletTransferEnabled, isReceiverConsentRequired } from "@/lib/server/transfer-policy";
import { requireWalletSession } from "@/lib/server/wallet-auth";
import { submitWalletTransferFromRequest } from "@/lib/server/wallet-transfer-service";

export async function POST(request: Request) {
  try {
    if (!isDirectWalletTransferEnabled()) {
      return NextResponse.json({ code: "not_found", message: "Direct wallet transfer routes are disabled." }, { status: 404 });
    }

    const session = await requireWalletSession(request);
    const body = await request.json();
    const result = await submitWalletTransferFromRequest(body, {
      sessionId: session.sessionId,
      sessionOwnerPublicKey: session.ownerPublicKey,
      requireReceiverConsent: isReceiverConsentRequired()
    });

    await recordAuditEvent({
      action: "transfer",
      actorId: `wallet:${session.ownerPublicKey}`,
      status: result.status === 200 ? "accepted" : "rejected",
      details: {
        ...(result.body as Record<string, unknown>),
        channel: "wallet",
        sessionId: session.sessionId
      }
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    const failure = normalizeApiError(error);
    return NextResponse.json(failure.body, { status: failure.status });
  }
}
