import { NextResponse } from "next/server";

import { normalizeApiError } from "@/lib/server/api-errors";
import { createShareUrlFromRequest } from "@/lib/server/moss60-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await createShareUrlFromRequest(body);

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    const apiFailure = normalizeApiError(error);
    return NextResponse.json(apiFailure.body, { status: apiFailure.status });
  }
}
