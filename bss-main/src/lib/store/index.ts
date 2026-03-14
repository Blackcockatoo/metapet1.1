import { createMetaPetWebStore, type MetaPetState, type PetType, type MirrorModeState, type MirrorPhase, type MirrorOutcome, type MirrorPrivacyPreset } from '@metapet/core/store';

export type { MetaPetState, PetType, MirrorModeState, MirrorPhase, MirrorOutcome, MirrorPrivacyPreset };
export { createMetaPetWebStore } from '@metapet/core/store';
export type { Vitals } from '@metapet/core/vitals';

export const useStore = createMetaPetWebStore();

/** Create an isolated store instance for use in unit tests. */
export function createTestStore() {
  return createMetaPetWebStore({ autoPauseOnVisibilityChange: false, tickMs: 999_999 });
}

/**
 * Subscribe to store mutations for audit logging.
 * Returns an unsubscribe function.
 */
export function subscribeToAuditLog(
  handler: (event: { action: string; timestamp: number; state: MetaPetState }) => void
): () => void {
  let prev = useStore.getState();
  return useStore.subscribe(next => {
    const action =
      next.lastAction !== prev.lastAction ? (next.lastAction ?? 'action') :
      next.essence !== prev.essence ? 'essence_change' :
      next.systemState !== prev.systemState ? 'system_state_change' :
      next.achievements.length !== prev.achievements.length ? 'achievement_unlocked' :
      'state_change';
    handler({ action, timestamp: Date.now(), state: next });
    prev = next;
  });
}
