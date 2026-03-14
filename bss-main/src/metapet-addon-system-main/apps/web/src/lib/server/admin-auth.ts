import { timingSafeEqual } from "node:crypto";

import { parseServerEnv } from "@bluesnake-studios/config";

import { ApiRouteError } from "@/lib/server/api-errors";

export interface AdminSession {
  actorId: string;
  isAdmin: true;
}

/**
 * Constant-time token comparison that prevents timing-based token enumeration.
 * When lengths differ a dummy comparison is still performed so that rejection
 * time does not leak the expected token's length.
 */
function isTokenValid(provided: string, expected: string): boolean {
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");

  if (a.length !== b.length) {
    timingSafeEqual(b, b); // dummy — keeps timing uniform
    return false;
  }

  return timingSafeEqual(a, b);
}

export function requireAdminSession(request: Request): AdminSession {
  const env = parseServerEnv(process.env);
  const expectedToken = env.ADMIN_API_TOKEN;

  if (!expectedToken) {
    throw new ApiRouteError(500, "internal_error", "Admin auth is not configured. Set ADMIN_API_TOKEN.");
  }

  const token = request.headers.get("x-admin-token");

  if (!token || !isTokenValid(token, expectedToken)) {
    throw new ApiRouteError(401, "unauthorized", "Unauthorized admin request.");
  }

  const actorId = request.headers.get("x-admin-actor")?.trim() || "admin";

  return {
    actorId,
    isAdmin: true
  };
}

export function resolveOptionalAdminSession(request: Request): AdminSession | undefined {
  if (!request.headers.get("x-admin-token")) {
    return undefined;
  }

  return requireAdminSession(request);
}
