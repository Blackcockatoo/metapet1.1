import type { Digit, CrownChannels } from "./types";
import { parseDigits, deriveChannels, validateComplement } from "./analysis";

// ─── Rotational resonance alignment ──────────────────────────────────────────

/**
 * Find the circular shift of digitsB that maximises digit matches with digitsA.
 * Returns the shift offset in range [0, 59].
 *
 * Rationale: two crowns that share a rotational pattern are "resonant" —
 * offspring inherit the overlapping instinct windows more cleanly.
 */
export function findBestShift(digitsA: Digit[], digitsB: Digit[]): number {
  let bestShift = 0;
  let bestScore = -1;

  for (let shift = 0; shift < 60; shift++) {
    let score = 0;
    for (let i = 0; i < 60; i++) {
      if (digitsA[i] === digitsB[(i + shift) % 60]) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestShift = shift;
    }
  }

  return bestShift;
}

/** Score the best rotational alignment (0–60 digit matches). */
export function resonanceScore(digitsA: Digit[], digitsB: Digit[]): number {
  const shift = findBestShift(digitsA, digitsB);
  let score = 0;
  for (let i = 0; i < 60; i++) {
    if (digitsA[i] === digitsB[(i + shift) % 60]) score++;
  }
  return score;
}

// ─── Window splice ────────────────────────────────────────────────────────────

/**
 * Splice two crown digit arrays into one child array using 10-digit windows.
 * Even-indexed windows (0, 2, 4) come from parent A; odd-indexed (1, 3, 5) from B.
 * Parent B's windows are read with the best-alignment shift applied.
 *
 * Result is always exactly 60 digits (6 × 10-digit windows).
 */
function spliceWindows(
  digitsA: Digit[],
  digitsB: Digit[],
  shiftB: number,
): Digit[] {
  const WINDOW = 10;
  const result: Digit[] = [];

  for (let w = 0; w < 6; w++) {
    const useA = w % 2 === 0;
    const src = useA ? digitsA : digitsB;
    const baseOffset = useA ? 0 : shiftB;

    for (let j = 0; j < WINDOW; j++) {
      result.push(src[(w * WINDOW + j + baseOffset) % 60]);
    }
  }

  return result;
}

// ─── Complement law enforcement ───────────────────────────────────────────────

/**
 * Force the 30+30 complement structure after splicing.
 * For each i in 0..29:  digits[i + 30] = (10 − digits[i]) mod 10
 *
 * The first half is kept as-is (the "day" template); the second half
 * is recalculated to satisfy the complement law.
 */
function enforceComplementLaw(digits: Digit[]): Digit[] {
  const result = [...digits] as Digit[];
  for (let i = 0; i < 30; i++) {
    result[i + 30] = ((10 - result[i]) % 10) as Digit;
  }
  return result;
}

// ─── Breed result type ────────────────────────────────────────────────────────

export type BreedResult = {
  childRed60: string;
  childBlue60: string;
  channels: CrownChannels;
  /** Circular shift applied to parentB's red digits during splicing. */
  redShift: number;
  /** Circular shift applied to parentB's blue digits during splicing. */
  blueShift: number;
  /** Raw rotational resonance score for the red channel pair (0–60). */
  redResonance: number;
  /** Raw rotational resonance score for the blue channel pair (0–60). */
  blueResonance: number;
  /** Whether the child crowns satisfy the complement law (should always be true). */
  complementValid: boolean;
};

// ─── Main breeding function ───────────────────────────────────────────────────

/**
 * Breed two Meta-Pet crown pairs to produce one child pair.
 *
 * Algorithm:
 *   1. Find the best rotational alignment for each channel independently.
 *   2. Splice 10-digit windows alternating between A and B (with best shift).
 *   3. Enforce the complement law on the child (second 30 digits derived from first).
 *   4. Derive the child's UNION, SHADOW, DAY, and NIGHT channels.
 *
 * The result is always mathematically stable (complement law guaranteed).
 * No randomness is introduced — two identical parent pairs always produce
 * the same child.
 */
export function breedCrowns(
  parentA: { red60: string; blue60: string },
  parentB: { red60: string; blue60: string },
): BreedResult {
  const arRed  = parseDigits(parentA.red60);
  const brRed  = parseDigits(parentB.red60);
  const arBlue = parseDigits(parentA.blue60);
  const brBlue = parseDigits(parentB.blue60);

  const redShift  = findBestShift(arRed, brRed);
  const blueShift = findBestShift(arBlue, brBlue);

  const childRedDigits  = enforceComplementLaw(spliceWindows(arRed,  brRed,  redShift));
  const childBlueDigits = enforceComplementLaw(spliceWindows(arBlue, brBlue, blueShift));

  const childRed60  = childRedDigits.join("");
  const childBlue60 = childBlueDigits.join("");

  return {
    childRed60,
    childBlue60,
    channels: deriveChannels(childRed60, childBlue60),
    redShift,
    blueShift,
    redResonance:  resonanceScore(arRed,  brRed),
    blueResonance: resonanceScore(arBlue, brBlue),
    complementValid:
      validateComplement(childRedDigits) &&
      validateComplement(childBlueDigits),
  };
}

// ─── Breeding utilities ───────────────────────────────────────────────────────

/**
 * Compute overall breeding compatibility (0–100) between two parent pairs.
 * Higher = more resonant offspring; a score below 20 risks weak genome integrity.
 */
export function breedingCompatibility(
  parentA: { red60: string; blue60: string },
  parentB: { red60: string; blue60: string },
): number {
  const arRed  = parseDigits(parentA.red60);
  const brRed  = parseDigits(parentB.red60);
  const arBlue = parseDigits(parentA.blue60);
  const brBlue = parseDigits(parentB.blue60);

  const redScore  = resonanceScore(arRed,  brRed);   // 0–60
  const blueScore = resonanceScore(arBlue, brBlue);  // 0–60

  return Math.round(((redScore + blueScore) / 120) * 100);
}

/**
 * Tier label for a compatibility score.
 * Used in the breeding UI to guide player decisions.
 */
export function compatibilityTier(
  score: number,
): "Discordant" | "Faint" | "Resonant" | "Harmonic" | "Crown-Bonded" {
  if (score >= 85) return "Crown-Bonded";
  if (score >= 65) return "Harmonic";
  if (score >= 45) return "Resonant";
  if (score >= 25) return "Faint";
  return "Discordant";
}
