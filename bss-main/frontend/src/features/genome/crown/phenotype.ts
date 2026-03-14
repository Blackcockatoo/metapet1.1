import type { TraitScores, GenomeMetrics, Phenotype, Digit } from "./types";

// ─── Step 4 — derivePhenotype() ───────────────────────────────────────────────

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** True if any of `digits` are in the metrics' dominant set. */
function hasDominant(metrics: GenomeMetrics, ...digits: Digit[]): boolean {
  return digits.some((d) => metrics.dominantDigits.includes(d));
}

/** Pick the first label whose threshold is met, descending. */
function tier(score: number, steps: Array<[number, string]>): string {
  for (const [t, label] of steps) {
    if (score >= t) return label;
  }
  return steps[steps.length - 1][1];
}

/** Dominant band of the prime current (cw / axial / ccw). */
function dominantBand(metrics: GenomeMetrics): "cw" | "axial" | "ccw" {
  const { cw, axial, ccw } = metrics.primeCurrent;
  if (axial >= cw && axial >= ccw) return "axial";
  if (cw >= ccw) return "cw";
  return "ccw";
}

// ─── Species class ────────────────────────────────────────────────────────────

function deriveSpeciesClass(traits: TraitScores): string {
  if (traits.will >= 70 && traits.guard >= 60) return "Crown Guardian";
  if (traits.dreamDepth >= 65) return "Eclipse Wraith";
  if (traits.bond >= 70) return "Bonded Familiar";
  if (traits.recursion >= 65) return "Loop Sage";
  if (traits.volatility >= 70) return "Furnace Striker";
  if (traits.curiosity >= 65) return "Lattice Scout";
  return "Lattice Wanderer";
}

// ─── Body class ───────────────────────────────────────────────────────────────

function deriveBodyClass(traits: TraitScores, blueMetrics: GenomeMetrics): string {
  const isLattice = blueMetrics.evenCount > 30;
  const isDense = traits.embodiment >= 60;
  if (isLattice && isDense) return "Lattice-armored familiar";
  if (isLattice) return "Lattice frame";
  if (isDense) return "Dense shell";
  if (traits.volatility >= 60) return "Adaptive coil form";
  return "Sleek courier form";
}

// ─── Crest class ──────────────────────────────────────────────────────────────

function deriveCrestClass(traits: TraitScores, redMetrics: GenomeMetrics): string {
  if (hasDominant(redMetrics, 3, 7)) return "Forked furnace crest";
  if (hasDominant(redMetrics, 1, 9)) return "Spark coronet";
  if (hasDominant(redMetrics, 0)) return "Void helm";
  if (traits.recursion >= 65) return "Spiral loop crown";
  if (traits.will >= 70) return "Flame-tipped war crest";
  return "Ridge crown";
}

// ─── Halo class ───────────────────────────────────────────────────────────────

function deriveHaloClass(redMetrics: GenomeMetrics): string {
  const band = dominantBand(redMetrics);
  if (band === "axial") return "Orbit halo with beam spikes";
  if (band === "cw") return "Clockwise spin ring";
  return "Counter-orbit shield";
}

// ─── Eye class ────────────────────────────────────────────────────────────────

function deriveEyeClass(traits: TraitScores): string {
  if (traits.will >= 65 && traits.curiosity >= 50) return "Ember pupil with cyan ring";
  if (traits.dreamDepth >= 65) return "Eclipse void eye";
  if (traits.recursion >= 65) return "Spiral recursion lens";
  if (traits.guard >= 65) return "Steel lattice iris";
  return "Lattice iris";
}

// ─── Tail class ───────────────────────────────────────────────────────────────

function deriveTailClass(traits: TraitScores): string {
  if (traits.volatility >= 65) return "Flame whip";
  if (traits.embodiment >= 65) return "Heavy anchor tail";
  if (traits.recursion >= 60) return "Coil loop tail";
  if (traits.curiosity >= 60) return "Lattice fin";
  return "Drift streamer";
}

// ─── Movement class ───────────────────────────────────────────────────────────

function deriveMovementClass(traits: TraitScores): string {
  if (traits.will >= 65 && traits.volatility >= 55) return "Hovering orbit + sudden throne-lunge";
  if (traits.embodiment >= 65) return "Grounded stomp";
  if (traits.curiosity >= 65) return "Scanning glide";
  if (traits.bond >= 65) return "Bonded orbit drift";
  return "Steady patrol hover";
}

// ─── Voice class ──────────────────────────────────────────────────────────────

function deriveVoiceClass(traits: TraitScores, redMetrics: GenomeMetrics, blueMetrics: GenomeMetrics): string {
  if (hasDominant(redMetrics, 3, 7) && blueMetrics.evenCount > 28) {
    return "Crystal hum layered with furnace clicks";
  }
  if (traits.dreamDepth >= 65) return "Low drone with harmonic shadow";
  if (traits.expression >= 65) return "Bright resonant call";
  if (traits.recursion >= 60) return "Echo loop chant";
  return "Soft lattice chime";
}

// ─── Colorway ─────────────────────────────────────────────────────────────────

/**
 * Color derivation:
 *   core   → RED dominant digit (inner glow, eyes, chest)
 *   shell  → BLUE dominant digit (silhouette, dorsal lines)
 *   aura   → resonance level (markings, sigils, ascension)
 *   accent → will / expression / bond hierarchy
 */
function deriveColorway(
  traits: TraitScores,
  redMetrics: GenomeMetrics,
  blueMetrics: GenomeMetrics,
): Phenotype["colorway"] {
  const CORE_COLORS: Record<number, string> = {
    0: "#1e293b", // void slate
    1: "#ef4444", // spark red
    2: "#f87171", // sensing rose
    3: "#f97316", // expression / furnace orange
    4: "#eab308", // frame gold
    5: "#a855f7", // hinge / mutation violet
    6: "#dc2626", // body crimson
    7: "#7c3aed", // recursion / mystic deep violet
    8: "#b91c1c", // memory dark red
    9: "#ef4444", // flare crimson
  };

  const SHELL_COLORS: Record<number, string> = {
    0: "#0f172a", // void deep
    1: "#1e3a5f", // spark deep navy
    2: "#06b6d4", // sensing cyan
    3: "#7c3aed", // expression violet shell
    4: "#3b82f6", // frame blue
    5: "#8b5cf6", // hinge amethyst
    6: "#1d4ed8", // body deep blue
    7: "#4c1d95", // recursion indigo
    8: "#0ea5e9", // memory sky
    9: "#2563eb", // flare electric blue
  };

  const redDom = redMetrics.dominantDigits[0] ?? 1;
  const blueDom = blueMetrics.dominantDigits[0] ?? 4;

  const core = CORE_COLORS[redDom] ?? "#ef4444";
  const shell = SHELL_COLORS[blueDom] ?? "#3b82f6";

  const aura =
    traits.resonance >= 80 ? "#fde68a" : // apex resonance: gold
    traits.resonance >= 65 ? "#a78bfa" : // high resonance: violet
    traits.resonance >= 45 ? "#60a5fa" : // mid: sky blue
    traits.dreamDepth >= 60 ? "#312e81" : // shadow-heavy: deep indigo
    "#475569";                            // default: slate

  const accent =
    traits.will >= 70    ? "#fbbf24" : // apex will: amber
    traits.expression >= 65 ? "#f472b6" : // expression: pink
    traits.bond >= 65    ? "#34d399" : // bond: emerald
    traits.curiosity >= 60 ? "#22d3ee" : // curiosity: cyan
    "#94a3b8";                            // default: slate

  return { core, shell, aura, accent };
}

// ─── Public function ──────────────────────────────────────────────────────────

/**
 * Step 4 — Derive the full phenotype from trait scores and channel metrics.
 *
 * Visual stack:
 *   RED   → inner glow, eyes, mouth, chest core, crest flame
 *   BLUE  → outer silhouette, dorsal lines, halo geometry, shell pattern
 *   UNION → markings, sigils, ascension crown
 *   SHADOW→ sleep form, eclipse mask, corruption bloom
 */
export function derivePhenotype(
  traits: TraitScores,
  redMetrics: GenomeMetrics,
  blueMetrics: GenomeMetrics,
): Phenotype {
  return {
    speciesClass:  deriveSpeciesClass(traits),
    bodyClass:     deriveBodyClass(traits, blueMetrics),
    crestClass:    deriveCrestClass(traits, redMetrics),
    haloClass:     deriveHaloClass(redMetrics),
    eyeClass:      deriveEyeClass(traits),
    tailClass:     deriveTailClass(traits),
    movementClass: deriveMovementClass(traits),
    voiceClass:    deriveVoiceClass(traits, redMetrics, blueMetrics),
    colorway:      deriveColorway(traits, redMetrics, blueMetrics),
  };
}

// ─── Evolution stage ──────────────────────────────────────────────────────────

/**
 * Derive the active evolution stage from trait scores.
 *
 *   Stage 1 — BLUE-led juvenile       (default start)
 *   Stage 2 — RED/BLUE balanced guardian
 *   Stage 3 — UNION ascended form     (high bond + resonance)
 *   Stage 4 — SHADOW eclipse form     (extreme dreamDepth — rare)
 */
export function deriveEvolutionStage(traits: TraitScores): 1 | 2 | 3 | 4 {
  if (traits.dreamDepth >= 85) return 4;
  if (traits.bond >= 75 && traits.resonance >= 70) return 3;
  if (traits.will >= 55 && traits.guard >= 45) return 2;
  return 1;
}

/** Display name for each stage. */
export const STAGE_NAMES: Record<1 | 2 | 3 | 4, string> = {
  1: "Juvenile (BLUE-led)",
  2: "Guardian (RED/BLUE balanced)",
  3: "Ascended (UNION form)",
  4: "Eclipse (SHADOW form)",
};
