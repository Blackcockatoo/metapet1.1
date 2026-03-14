import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminSession } from "@/lib/server/admin-auth";
import { listAuditEvents } from "@/lib/server/audit-log";
import { normalizeApiError } from "@/lib/server/api-errors";
import { listStorefrontOrders } from "@/lib/server/listings-repository";
import { listReplayNonceRecords } from "@/lib/server/replay-repository";

const querySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(20),
  actorId: z.string().trim().min(1).optional(),
  auditAction: z.enum(["mint", "transfer"]).optional(),
  auditStatus: z.enum(["accepted", "rejected"]).optional(),
  replayOperation: z.string().trim().min(1).optional(),
  replayStatus: z.enum(["accepted", "replayed", "expired"]).optional(),
  scopeKey: z.string().trim().min(1).optional(),
  orderListingId: z.string().trim().min(1).optional(),
  orderOwnerPublicKey: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).optional()
});

export async function GET(request: Request) {
  try {
    requireAdminSession(request);
    const url = new URL(request.url);
    const query = querySchema.parse({
      limit: url.searchParams.get("limit") ?? undefined,
      actorId: url.searchParams.get("actorId") ?? undefined,
      auditAction: url.searchParams.get("auditAction") ?? undefined,
      auditStatus: url.searchParams.get("auditStatus") ?? undefined,
      replayOperation: url.searchParams.get("replayOperation") ?? undefined,
      replayStatus: url.searchParams.get("replayStatus") ?? undefined,
      scopeKey: url.searchParams.get("scopeKey") ?? undefined,
      orderListingId: url.searchParams.get("orderListingId") ?? undefined,
      orderOwnerPublicKey: url.searchParams.get("orderOwnerPublicKey") ?? undefined,
      search: url.searchParams.get("search") ?? undefined
    });

    const [auditEvents, replayNonces, orders] = await Promise.all([
      listAuditEvents({
        limit: query.limit,
        actorId: query.actorId,
        action: query.auditAction,
        status: query.auditStatus,
        search: query.search
      }),
      listReplayNonceRecords({
        limit: query.limit,
        operation: query.replayOperation,
        scopeKey: query.scopeKey,
        status: query.replayStatus,
        search: query.search
      }),
      listStorefrontOrders({
        limit: query.limit,
        listingId: query.orderListingId,
        ownerPublicKey: query.orderOwnerPublicKey,
        search: query.search
      })
    ]);

    return NextResponse.json({ auditEvents, replayNonces, orders });
  } catch (error) {
    const failure = normalizeApiError(error);
    return NextResponse.json(failure.body, { status: failure.status });
  }
}
