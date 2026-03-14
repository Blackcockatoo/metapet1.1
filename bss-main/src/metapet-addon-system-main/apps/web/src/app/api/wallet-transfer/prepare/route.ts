import { NextResponse } from "next/server";

import { normalizeApiError } from "@/lib/server/api-errors";
import { isDirectWalletTransferEnabled, isReceiverConsentRequired } from "@/lib/server/transfer-policy";
import { requireWalletSession } from "@/lib/server/wallet-auth";
import { prepareWalletTransferFromRequest } from "@/lib/server/wallet-transfer-service";

export async function POST(request: Request) {
  try {
    if (!isDirectWalletTransferEnabled()) {
      return NextResponse.json({ code: "not_found", message: "Direct wallet transfer routes are disabled." }, { status: 404 });
    }

    const session = await requireWalletSession(request);
    const body = await request.json();
    const result = await prepareWalletTransferFromRequest(body, {
      sessionId: session.sessionId,
      sessionOwnerPublicKey: session.ownerPublicKey,
      requireReceiverConsent: isReceiverConsentRequired()
    });
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    const failure = normalizeApiError(error);
    return NextResponse.json(failure.body, { status: failure.status });
  }
}
