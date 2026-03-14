// ─── Meta-Pet Dual Crown Genome — core types ─────────────────────────────────
// One pet = two 60-digit crown strings: RED (soul/will) + BLUE (form/memory).
// Four derived channels: UNION, SHADOW, DAY, NIGHT.

/** A single crown digit (0–9). */
export type Digit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/**
 * Canonical digit semantics (shared across engine, render, audio, AI).
 *
 * 0 → void, seal, reset
 * 1 → spark, will, identity
 * 2 → sensing, receptivity
 * 3 → expression, voice, pattern projection
 * 4 → frame, order, shell
 * 5 → hinge, mutation, adaptability
 * 6 → body, weight, embodiment
 * 7 → recursion, mystic loop, occult drive
 * 8 → memory, archive, retention
 * 9 → flare, release, charge
 */
export type DigitMeaning =
  | "void"
  | "spark"
  | "sensing"
  | "expression"
  | "frame"
  | "hinge"
  | "body"
  | "recursion"
  | "memory"
  | "flare";

export const DIGIT_MEANINGS: Record<Digit, DigitMeaning> = {
  0: "void",
  1: "spark",
  2: "sensing",
  3: "expression",
  4: "frame",
  5: "hinge",
  6: "body",
  7: "recursion",
  8: "memory",
  9: "flare",
};

// ─── Genome metrics ───────────────────────────────────────────────────────────

/**
 * Prime current: the 60-digit string split into three 20-digit bands.
 * Drives beam / shield / orbit visual geometry.
 */
export type PrimeCurrent = {
  cw: number;    // clockwise band (digits 0–19)
  axial: number; // axial cut     (digits 20–39)
  ccw: number;   // counter-clockwise band (digits 40–59)
};

/** Full statistical analysis of one 60-digit crown string. */
export type GenomeMetrics = {
  counts: number[];          // per-digit frequency, length 10 (index = digit)
  digitSum: number;          // sum of all 60 digits
  digitalRoot: number;       // iterated digit sum until single digit
  oddCount: number;          // count of odd digits (1 3 5 7 9)
  evenCount: number;         // count of non-zero even digits (2 4 6 8)
  zeroCount: number;         // count of 0s
  dominantDigits: Digit[];   // digit(s) with the highest frequency
  primeCurrent: PrimeCurrent;
  complementValid: boolean;  // digits[i] + digits[i+30] ≡ 0 (mod 10) ∀ i < 30
};

// ─── Derived channels ─────────────────────────────────────────────────────────

/** All six crown channels derived from a red/blue pair. */
export type CrownChannels = {
  red60: string;    // motive engine
  blue60: string;   // body geometry
  union60: string;  // (red + blue) mod 10 — evolved / bonded / ascended state
  shadow60: string; // (red − blue + 10) mod 10 — dream / eclipse / hidden instincts
  day30: string;    // first 30 digits of red — visible outward form
  night30: string;  // last 30 digits of red — inverse latent form
};

// ─── Trait scores ─────────────────────────────────────────────────────────────

/** Ten computed trait scores, each 0–100. */
export type TraitScores = {
  will: number;        // RED — drive, resolve, attack power
  curiosity: number;   // BLUE — exploration, scan range
  guard: number;       // BLUE — defense, shell integrity
  expression: number;  // 70% RED + 30% UNION — voice, sigil, presence
  recursion: number;   // RED — loop depth, mystic resonance
  embodiment: number;  // 50% RED + 50% BLUE — physical density
  volatility: number;  // RED (damped by BLUE.guard) — unpredictability, burst
  dreamDepth: number;  // SHADOW — eclipse form access, latent instincts
  bond: number;        // UNION — affinity, evolution unlock rate
  resonance: number;   // average across all four channels
};

// ─── Phenotype ────────────────────────────────────────────────────────────────

/** Visual and behavioural class assignments derived from traits + metrics. */
export type Phenotype = {
  speciesClass: string;
  bodyClass: string;
  crestClass: string;
  haloClass: string;
  eyeClass: string;
  tailClass: string;
  movementClass: string;
  voiceClass: string;
  colorway: {
    core: string;   // inner glow, eyes, chest — driven by RED dominant digit
    shell: string;  // outer silhouette, dorsal lines — driven by BLUE dominant digit
    aura: string;   // markings, sigils, ascension crown — driven by resonance
    accent: string; // accent driven by will / expression / bond
  };
};

// ─── Full genome record ───────────────────────────────────────────────────────

/** Fully serialisable genome for one Meta-Pet instance. */
export type MetaPetGenome = {
  id: string;
  red60: string;
  blue60: string;
  union60: string;
  shadow60: string;
  day30: string;
  night30: string;
  redMetrics: GenomeMetrics;
  blueMetrics: GenomeMetrics;
  unionMetrics: GenomeMetrics;
  shadowMetrics: GenomeMetrics;
  traits: TraitScores;
  phenotype: Phenotype;
};

// ─── State machine ────────────────────────────────────────────────────────────

/** Behaviour mode — selected by the AI from genome-weighted scores. */
export type Mode = "idle" | "observe" | "play" | "focus" | "dream" | "battle" | "bonded";

/** Channel blend weights for each mode (must sum to 1.0). */
export type ModeBlend = {
  red: number;
  blue: number;
  union: number;
  shadow: number;
};

// ─── Evolution ────────────────────────────────────────────────────────────────

/**
 * Stage 1 = BLUE-led juvenile
 * Stage 2 = RED/BLUE balanced guardian
 * Stage 3 = UNION ascended form
 * Stage 4 = SHADOW eclipse form (special / rare)
 */
export type EvolutionStage = 1 | 2 | 3 | 4;
