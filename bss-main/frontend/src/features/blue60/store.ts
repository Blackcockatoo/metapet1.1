import { create } from "zustand";
import type { BlueState, BlueGenome, BlueAddonEffect, BehaviourInputs } from "./types";
import {
  updateBlue60,
  defaultGenome,
  defaultState,
  defaultInputs,
  isSpineLoopComplete,
} from "./engine";

// ─── Store shape ──────────────────────────────────────────────────────────────

type Blue60Store = {
  // ── Core state ─────────────────────────────────────────────────────────────
  petState: BlueState;
  genome: BlueGenome;
  addons: BlueAddonEffect[];
  inputs: BehaviourInputs;

  // ── Crown event flag ────────────────────────────────────────────────────────
  /** Set to true when a full spine loop was just completed; cleared on next tick. */
  crownEventPending: boolean;

  // ── Actions ─────────────────────────────────────────────────────────────────

  /**
   * Advance the Blue-60 engine by one tick.
   * Call this on a fixed interval — typically 500 ms to 2 s depending on game pacing.
   */
  tick: () => void;

  /** Replace a subset of behaviour inputs (e.g. update energy after feeding). */
  setInputs: (patch: Partial<BehaviourInputs>) => void;

  /** Replace a subset of the genome (e.g. after breeding or levelling). */
  setGenome: (patch: Partial<BlueGenome>) => void;

  /** Equip an add-on and apply its Blue effect. */
  addAddon: (effect: BlueAddonEffect) => void;

  /** Unequip an add-on by index. */
  removeAddon: (index: number) => void;

  /** Acknowledge the crown event (clears the flag). */
  clearCrownEvent: () => void;

  /** Reset to factory defaults (new pet / fresh start). */
  reset: () => void;
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useBlue60Store = create<Blue60Store>()((set, get) => ({
  petState: defaultState(),
  genome: defaultGenome(),
  addons: [],
  inputs: defaultInputs(),
  crownEventPending: false,

  tick() {
    const { petState, inputs, genome, addons } = get();
    const next = updateBlue60(petState, inputs, genome, addons);
    const crownEvent = isSpineLoopComplete(next);
    set({ petState: next, crownEventPending: crownEvent || get().crownEventPending });
  },

  setInputs(patch) {
    set((s) => ({ inputs: { ...s.inputs, ...patch } }));
  },

  setGenome(patch) {
    set((s) => ({ genome: { ...s.genome, ...patch } }));
  },

  addAddon(effect) {
    set((s) => ({ addons: [...s.addons, effect] }));
  },

  removeAddon(index) {
    set((s) => ({ addons: s.addons.filter((_, i) => i !== index) }));
  },

  clearCrownEvent() {
    set({ crownEventPending: false });
  },

  reset() {
    set({
      petState: defaultState(),
      genome: defaultGenome(),
      addons: [],
      inputs: defaultInputs(),
      crownEventPending: false,
    });
  },
}));
