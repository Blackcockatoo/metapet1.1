import { describe, expect, it } from "vitest";

import { ApiRouteError, normalizeApiError } from "@/lib/server/api-errors";

describe("normalizeApiError", () => {
  it("keeps explicit ApiRouteError messages", () => {
    const failure = normalizeApiError(new ApiRouteError(401, "unauthorized", "Unauthorized admin request."));

    expect(failure).toEqual({
      status: 401,
      body: {
        code: "unauthorized",
        message: "Unauthorized admin request.",
        details: undefined
      }
    });
  });

  it("does not expose raw internal exception messages on 500", () => {
    const failure = normalizeApiError(new Error("SQLITE_CONSTRAINT: UNIQUE failed: replay_nonces.id"));

    expect(failure).toEqual({
      status: 500,
      body: {
        code: "internal_error",
        message: "Internal server error.",
        details: undefined
      }
    });
  });
});
