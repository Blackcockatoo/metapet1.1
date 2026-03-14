import { NextResponse } from "next/server";

import { normalizeApiError } from "@/lib/server/api-errors";
import { requireWalletSession, revokeWalletSession } from "@/lib/server/wallet-auth";

export async function POST(request: Request) {
  try {
    const session = await requireWalletSession(request);
    await revokeWalletSession(session.sessionId);

    return NextResponse.json({
      ok: true,
      revoked: true,
      sessionId: session.sessionId
    });
  } catch (error) {
    const failure = normalizeApiError(error);
    return NextResponse.json(failure.body, { status: failure.status });
  }
}
