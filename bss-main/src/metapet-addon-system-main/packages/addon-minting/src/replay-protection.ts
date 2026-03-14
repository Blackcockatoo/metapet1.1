import type { ReplayGuard } from "./models";

export function createInMemoryReplayGuard(): ReplayGuard {
  const seen = new Set<string>();

  return {
    has(nonce) {
      return seen.has(nonce);
    },
    remember(nonce) {
      seen.add(nonce);
    }
  };
}

export async function assertNonceUnused(nonce: string, replayGuard?: ReplayGuard): Promise<void> {
  if (!replayGuard) {
    return;
  }

  if (await replayGuard.has(nonce)) {
    throw new Error(`Replay detected for nonce: ${nonce}`);
  }
}

export async function rememberNonce(nonce: string, replayGuard?: ReplayGuard): Promise<void> {
  if (!replayGuard) {
    return;
  }

  await replayGuard.remember(nonce);
}

export function isExpired(expiresAt: string | undefined, now = new Date()): boolean {
  if (!expiresAt) {
    return false;
  }

  return new Date(expiresAt).getTime() <= now.getTime();
}

export function assertNotExpired(expiresAt: string | undefined, now = new Date()): void {
  if (isExpired(expiresAt, now)) {
    throw new Error("Mint or transfer request has expired.");
  }
}
