import { NextResponse } from "next/server";

import { normalizeApiError } from "@/lib/server/api-errors";
import { issueWalletSessionChallenge } from "@/lib/server/wallet-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await issueWalletSessionChallenge(body);
    return NextResponse.json(result);
  } catch (error) {
    const failure = normalizeApiError(error);
    return NextResponse.json(failure.body, { status: failure.status });
  }
}
