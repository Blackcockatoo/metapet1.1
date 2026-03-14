import type { Mode, ModeBlend, TraitScores } from "./types";

// ─── Mode blend weights (from spec) ──────────────────────────────────────────

/**
 * Returns the channel blend for a given behaviour mode.
 * Weights sum to 1.0 and determine how much of each channel's
 * trait profile is expressed at runtime.
 *
 * Usage: multiply each channel's trait vector by its weight and sum → live traits.
 */
export function modeBlend(mode: Mode): ModeBlend {
  switch (mode) {
    case "idle":    return { red: 0.25, blue: 0.55, union: 0.10, shadow: 0.10 };
    case "observe": return { red: 0.15, blue: 0.65, union: 0.10, shadow: 0.10 };
    case "play":    return { red: 0.35, blue: 0.35, union: 0.20, shadow: 0.10 };
    case "focus":   return { red: 0.45, blue: 0.35, union: 0.15, shadow: 0.05 };
    case "dream":   return { red: 0.10, blue: 0.20, union: 0.15, shadow: 0.55 };
    case "battle":  return { red: 0.65, blue: 0.15, union: 0.15, shadow: 0.05 };
    case "bonded":  return { red: 0.25, blue: 0.25, union: 0.40, shadow: 0.10 };
  }
}

// ─── Mode suggestion (genome-weighted, no fake randomness) ───────────────────

/**
 * Compute a fitness score for each mode from the pet's trait profile,
 * then return the mode with the highest score.
 *
 * The pet's genome nudges it toward its "natural" mode — high-will pets
 * gravitate toward focus/battle; high-dreamDepth pets gravitate toward dream.
 *
 * @param hint  Optional external bonus scores (e.g. from time-of-day or interaction).
 *              Added on top of the trait-derived scores before selection.
 */
export function suggestMode(
  traits: TraitScores,
  hint?: Partial<Record<Mode, number>>,
): Mode {
  const scores: Record<Mode, number> = {
    idle: (
      traits.embodiment * 0.40 +
      traits.guard      * 0.30 +
      (100 - traits.volatility) * 0.30
    ),
    observe: (
      traits.curiosity  * 0.50 +
      traits.recursion  * 0.30 +
      traits.dreamDepth * 0.20
    ),
    play: (
      traits.curiosity  * 0.40 +
      traits.volatility * 0.30 +
      traits.bond       * 0.30
    ),
    focus: (
      traits.will       * 0.40 +
      traits.recursion  * 0.30 +
      traits.expression * 0.30
    ),
    dream: (
      traits.dreamDepth               * 0.50 +
      traits.recursion                * 0.30 +
      (100 - traits.will)             * 0.20
    ),
    battle: (
      traits.will       * 0.40 +
      traits.volatility * 0.40 +
      traits.expression * 0.20
    ),
    bonded: (
      traits.bond       * 0.50 +
      traits.resonance  * 0.30 +
      traits.expression * 0.20
    ),
  };

  // Apply external hints (time-of-day, recent interaction, etc.)
  if (hint) {
    for (const [mode, bonus] of Object.entries(hint) as [Mode, number][]) {
      scores[mode] += bonus;
    }
  }

  return (Object.entries(scores) as [Mode, number][]).reduce<[Mode, number]>(
    (best, [m, s]) => (s > best[1] ? [m, s] : best),
    ["idle", -Infinity],
  )[0];
}

// ─── Live trait blending ──────────────────────────────────────────────────────

/**
 * Blend four channel trait vectors according to the current mode's weights.
 * Use this to animate the pet's expressed personality as it transitions modes.
 *
 * Each trait value is a weighted sum across all four channel profiles.
 */
export function blendTraitsByMode(
  redTraits: TraitScores,
  blueTraits: TraitScores,
  unionTraits: TraitScores,
  shadowTraits: TraitScores,
  mode: Mode,
): TraitScores {
  const w = modeBlend(mode);

  const blend = (key: keyof TraitScores): number =>
    Math.round(
      redTraits[key]    * w.red   +
      blueTraits[key]   * w.blue  +
      unionTraits[key]  * w.union +
      shadowTraits[key] * w.shadow,
    );

  return {
    will:        blend("will"),
    curiosity:   blend("curiosity"),
    guard:       blend("guard"),
    expression:  blend("expression"),
    recursion:   blend("recursion"),
    embodiment:  blend("embodiment"),
    volatility:  blend("volatility"),
    dreamDepth:  blend("dreamDepth"),
    bond:        blend("bond"),
    resonance:   blend("resonance"),
  };
}

// ─── Mode transition table ────────────────────────────────────────────────────

/**
 * Plausible mode transitions — used to constrain state-machine jumps.
 * A pet generally cannot leap directly from "idle" to "battle";
 * it should pass through "observe" or "focus" first.
 */
export const VALID_TRANSITIONS: Record<Mode, Mode[]> = {
  idle:    ["observe", "dream", "play"],
  observe: ["idle", "focus", "play", "bonded"],
  play:    ["observe", "idle", "battle", "bonded"],
  focus:   ["observe", "battle", "bonded"],
  dream:   ["idle", "observe"],
  battle:  ["focus", "idle", "observe"],
  bonded:  ["idle", "play", "focus", "observe"],
};

/** Human-readable display labels for each mode. */
export const MODE_LABELS: Record<Mode, string> = {
  idle:    "Resting",
  observe: "Observing",
  play:    "Playing",
  focus:   "Focused",
  dream:   "Dreaming",
  battle:  "Battle-ready",
  bonded:  "Bonded",
};
