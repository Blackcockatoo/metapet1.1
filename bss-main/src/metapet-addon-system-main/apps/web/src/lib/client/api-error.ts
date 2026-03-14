export interface ClientApiErrorEnvelope {
  code: string;
  message: string;
  error?: string;
  details?: unknown;
}

export class ClientApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(`[${code}] ${message}`);
    this.name = "ClientApiError";
  }
}

export async function parseApiError(response: Response): Promise<ClientApiError> {
  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  const envelope = payload as Partial<ClientApiErrorEnvelope> | null;
  const code = envelope?.code ?? "internal_error";
  const message = envelope?.message ?? envelope?.error ?? `Request failed with status ${response.status}.`;

  return new ClientApiError(response.status, code, message, envelope?.details);
}

export function formatDebugError(error: unknown): string {
  if (error instanceof ClientApiError) {
    const details = error.details ? ` details=${JSON.stringify(error.details)}` : "";
    return `${error.message} (status=${error.status}${details})`;
  }

  return error instanceof Error ? error.message : "Unexpected request error.";
}
