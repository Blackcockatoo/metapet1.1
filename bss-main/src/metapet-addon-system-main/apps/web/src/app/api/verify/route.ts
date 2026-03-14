import { NextResponse } from "next/server";

import { normalizeApiError } from "@/lib/server/api-errors";
import { verifyAddonFromRequest } from "@/lib/server/verify-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await verifyAddonFromRequest(body);

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    const apiFailure = normalizeApiError(error);
    return NextResponse.json(apiFailure.body, { status: apiFailure.status });
  }
}
