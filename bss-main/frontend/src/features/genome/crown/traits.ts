import type { GenomeMetrics, TraitScores } from "./types";

// ─── Step 3 — scoreTraits() ───────────────────────────────────────────────────

/**
 * Weight vectors for each trait — index corresponds to digit 0–9.
 * Weights encode which digit semantics most strongly express each trait.
 *
 *   0=void  1=spark  2=sensing  3=expression  4=frame
 *   5=hinge 6=body   7=recursion 8=memory     9=flare
 */
const TRAIT_WEIGHTS = {
  will:       [0, 3, 0, 1, 0, 1, 0, 2, 0, 2] as const,
  curiosity:  [0, 0, 2, 0, 1, 0, 0, 1, 2, 0] as const,
  guard:      [1, 0, 0, 0, 2, 0, 2, 0, 1, 0] as const,
  expression: [0, 1, 0, 3, 0, 1, 0, 1, 0, 1] as const,
  recursion:  [0, 0, 0, 1, 0, 1, 0, 3, 1, 0] as const,
  embodiment: [0, 0, 0, 0, 1, 1, 3, 0, 0, 0] as const,
  volatility: [0, 1, 0, 1, 0, 1, 0, 3, 0, 2] as const,
  dreamDepth: [1, 0, 0, 1, 0, 1, 0, 2, 2, 0] as const,
  bond:       [0, 1, 1, 2, 1, 2, 1, 2, 1, 1] as const,
  resonance:  [1, 1, 1, 1, 1, 2, 1, 1, 1, 1] as const,
} satisfies Record<keyof TraitScores, readonly number[]>;

/**
 * Weighted dot product of digit counts against a weight vector, normalised to 0–100.
 *
 *   score = Σ(counts[i] × weights[i]) / (60 × max(weights))
 */
function weightedScore(counts: number[], weights: readonly number[]): number {
  const dot = counts.reduce((sum, c, i) => sum + c * (weights[i] ?? 0), 0);
  const maxWeight = Math.max(...weights);
  if (maxWeight === 0) return 0;
  return Math.round((dot / (60 * maxWeight)) * 100);
}

/** Linear interpolation between two 0–100 scores. */
function blend(a: number, b: number, aFraction: number): number {
  return Math.round(a * aFraction + b * (1 - aFraction));
}

/**
 * Step 3 — Compute all ten trait scores from the four channel metrics.
 *
 * Channel assignment (per spec):
 *   will        = RED
 *   curiosity   = BLUE
 *   guard       = BLUE
 *   expression  = 70% RED + 30% UNION
 *   recursion   = RED
 *   embodiment  = 50% RED + 50% BLUE
 *   volatility  = RED, damped by BLUE.guard   (higher guard → more stability)
 *   dreamDepth  = SHADOW
 *   bond        = UNION
 *   resonance   = average across all four channels
 */
export function scoreTraits(
  red: GenomeMetrics,
  blue: GenomeMetrics,
  union: GenomeMetrics,
  shadow: GenomeMetrics,
): TraitScores {
  const will = weightedScore(red.counts, TRAIT_WEIGHTS.will);
  const curiosity = weightedScore(blue.counts, TRAIT_WEIGHTS.curiosity);
  const guardRaw = weightedScore(blue.counts, TRAIT_WEIGHTS.guard);
  const expression = blend(
    weightedScore(red.counts, TRAIT_WEIGHTS.expression),
    weightedScore(union.counts, TRAIT_WEIGHTS.expression),
    0.7,
  );
  const recursion = weightedScore(red.counts, TRAIT_WEIGHTS.recursion);
  const embodiment = blend(
    weightedScore(red.counts, TRAIT_WEIGHTS.embodiment),
    weightedScore(blue.counts, TRAIT_WEIGHTS.embodiment),
    0.5,
  );

  // Volatility is damped by guard: high guard pulls volatile pets toward stability
  const volatilityRaw = weightedScore(red.counts, TRAIT_WEIGHTS.volatility);
  const guardDamp = guardRaw / 100;
  const volatility = Math.round(volatilityRaw * (1 - guardDamp * 0.3));

  const dreamDepth = weightedScore(shadow.counts, TRAIT_WEIGHTS.dreamDepth);
  const bond = weightedScore(union.counts, TRAIT_WEIGHTS.bond);

  // Resonance: mean across all four channels
  const resonance = Math.round(
    [red, blue, union, shadow]
      .map((m) => weightedScore(m.counts, TRAIT_WEIGHTS.resonance))
      .reduce((a, b) => a + b, 0) / 4,
  );

  return {
    will,
    curiosity,
    guard: guardRaw,
    expression,
    recursion,
    embodiment,
    volatility,
    dreamDepth,
    bond,
    resonance,
  };
}

// ─── Trait utilities ──────────────────────────────────────────────────────────

/** Human-readable label for a 0–100 trait score. */
export function traitTier(score: number): "dormant" | "latent" | "active" | "dominant" | "apex" {
  if (score < 20) return "dormant";
  if (score < 40) return "latent";
  if (score < 60) return "active";
  if (score < 80) return "dominant";
  return "apex";
}

/** Summarise the three highest traits as a personality archetype string. */
export function personalityArchetype(traits: TraitScores): string {
  const ranked = (Object.entries(traits) as [keyof TraitScores, number][])
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([k]) => k);

  const archetypes: Partial<Record<string, string>> = {
    "will,volatility,expression": "Furnace Herald",
    "will,recursion,expression": "Crown Sage",
    "will,guard,embodiment": "Iron Guardian",
    "curiosity,recursion,dreamDepth": "Lattice Oracle",
    "curiosity,bond,resonance": "Bonded Scout",
    "dreamDepth,recursion,shadow": "Eclipse Wraith",
    "bond,resonance,expression": "Resonant Familiar",
    "embodiment,guard,bond": "Steadfast Sentinel",
    "volatility,will,recursion": "Chaotic Furnace",
    "expression,curiosity,bond": "Luminous Voice",
  };

  const key = ranked.join(",");
  return archetypes[key] ?? `${ranked[0]} / ${ranked[1]} Aspect`;
}
