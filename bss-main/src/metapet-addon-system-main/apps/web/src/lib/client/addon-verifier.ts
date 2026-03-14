import type { Addon } from "@bluesnake-studios/addon-core";

import { parseApiError } from "@/lib/client/api-error";

export async function verifyAddon(addon: Addon): Promise<boolean> {
  const response = await fetch("/api/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(addon)
  });

  if (!response.ok) {
    throw await parseApiError(response);
  }

  const payload = (await response.json()) as { verified: boolean };
  return payload.verified;
}
