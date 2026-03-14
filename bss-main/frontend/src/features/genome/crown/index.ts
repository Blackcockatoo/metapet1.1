// ─── Meta-Pet Dual Crown Genome — public API ──────────────────────────────────
// Import this module for everything genome-related:
//   types, analysis, traits, phenotype, state machine, breeding.

export * from "./types";
export * from "./analysis";
export * from "./traits";
export * from "./phenotype";
export * from "./stateMachine";
export * from "./breeding";

import { deriveChannels, analyzeGenome60, validateCrownString } from "./analysis";
import { scoreTraits } from "./traits";
import { derivePhenotype } from "./phenotype";
import type { MetaPetGenome, TraitScores, GenomeMetrics } from "./types";

// ─── Full genome factory ──────────────────────────────────────────────────────

/**
 * Build a complete, serialisable MetaPetGenome from a red/blue crown pair.
 *
 * Implementation order (per spec):
 *   1. deriveChannels       → union60, shadow60, day30, night30
 *   2. analyzeGenome60      × 4 channels → GenomeMetrics
 *   3. scoreTraits          → TraitScores
 *   4. derivePhenotype      → Phenotype
 *
 * Throws if either crown string is not exactly 60 valid decimal digits.
 */
export function buildMetaPetGenome(
  id: string,
  red60: string,
  blue60: string,
): MetaPetGenome {
  // Validate inputs
  const redErr = validateCrownString(red60);
  if (redErr) throw new Error(`red60: ${redErr}`);
  const blueErr = validateCrownString(blue60);
  if (blueErr) throw new Error(`blue60: ${blueErr}`);

  // Step 1 — derive channels
  const channels = deriveChannels(red60, blue60);

  // Step 2 — analyze all four channels
  const redMetrics   = analyzeGenome60(red60);
  const blueMetrics  = analyzeGenome60(blue60);
  const unionMetrics = analyzeGenome60(channels.union60);
  const shadowMetrics = analyzeGenome60(channels.shadow60);

  // Step 3 — score traits
  const traits = scoreTraits(redMetrics, blueMetrics, unionMetrics, shadowMetrics);

  // Step 4 — derive phenotype
  const phenotype = derivePhenotype(traits, redMetrics, blueMetrics);

  return {
    id,
    red60,
    blue60,
    union60:  channels.union60,
    shadow60: channels.shadow60,
    day30:    channels.day30,
    night30:  channels.night30,
    redMetrics,
    blueMetrics,
    unionMetrics,
    shadowMetrics,
    traits,
    phenotype,
  };
}

// ─── Per-channel trait scoring (for blendTraitsByMode) ───────────────────────

/**
 * Score traits for each individual channel so blendTraitsByMode() can animate
 * personality shifts as the pet transitions between modes.
 *
 * Returns four separate TraitScores — one per channel — not blended.
 */
export function scoreChannelTraits(genome: MetaPetGenome): {
  redTraits: TraitScores;
  blueTraits: TraitScores;
  unionTraits: TraitScores;
  shadowTraits: TraitScores;
} {
  const stub = (m: GenomeMetrics): TraitScores =>
    scoreTraits(m, m, m, m); // single-channel approximation

  return {
    redTraits:    stub(genome.redMetrics),
    blueTraits:   stub(genome.blueMetrics),
    unionTraits:  stub(genome.unionMetrics),
    shadowTraits: stub(genome.shadowMetrics),
  };
}

// ─── Canonical example pair (from spec) ───────────────────────────────────────

/**
 * The reference crown pair from the Meta-Pet Dual Crown Genome v1 spec.
 *
 * RED  — odd-heavy, 3/7 dominant → expressive furnace core, recursive crown
 * BLUE — even-enriched → geometric shell, lattice aura, high pattern memory
 */
export const EXAMPLE_RED60 =
  "113031491493585389543778774590997079619617525721567332336510";

export const EXAMPLE_BLUE60 =
  "012776329785893036118967145479098334781325217074992143965631";

/**
 * Pre-built genome for the canonical example pair.
 * Use this to bootstrap a test pet or as a phenotype reference.
 */
export const EXAMPLE_GENOME: MetaPetGenome = buildMetaPetGenome(
  "canonical-v1",
  EXAMPLE_RED60,
  EXAMPLE_BLUE60,
);
