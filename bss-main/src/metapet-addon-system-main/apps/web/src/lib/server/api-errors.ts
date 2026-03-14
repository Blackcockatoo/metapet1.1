import { ZodError } from "zod";

export type ApiErrorCode = "validation_failed" | "unauthorized" | "not_found" | "integrity_failed" | "internal_error";

export interface ApiErrorEnvelope {
  code: ApiErrorCode;
  message: string;
  details?: unknown;
}

export class ApiRouteError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ApiErrorCode,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "ApiRouteError";
  }
}

export function apiError(status: number, code: ApiErrorCode, message: string, details?: unknown): { status: number; body: ApiErrorEnvelope } {
  return {
    status,
    body: {
      code,
      message,
      details
    }
  };
}

export function normalizeApiError(error: unknown): { status: number; body: ApiErrorEnvelope } {
  if (error instanceof ApiRouteError) {
    return apiError(error.status, error.code, error.message, error.details);
  }

  if (error instanceof ZodError) {
    return apiError(400, "validation_failed", "Request validation failed.", error.flatten());
  }

  if (error instanceof Error) {
    if (error.message.includes("Unauthorized")) {
      return apiError(401, "unauthorized", "Unauthorized request.");
    }

    return apiError(500, "internal_error", "Internal server error.");
  }

  return apiError(500, "internal_error", "Unexpected error");
}
