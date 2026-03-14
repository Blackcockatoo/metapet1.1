import type { Digit, GenomeMetrics, PrimeCurrent, CrownChannels } from "./types";

// ─── Step 1 — analyzeGenome60() ───────────────────────────────────────────────

/** Parse a 60-char crown string into a typed digit array. */
export function parseDigits(crown: string): Digit[] {
  if (crown.length !== 60) {
    throw new Error(`Crown string must be exactly 60 digits, got ${crown.length}: "${crown}"`);
  }
  return crown.split("").map((ch, i) => {
    const d = Number(ch);
    if (!Number.isInteger(d) || d < 0 || d > 9) {
      throw new Error(`Invalid character "${ch}" at position ${i}`);
    }
    return d as Digit;
  });
}

/**
 * Digital root: iteratively sum digits until a single digit remains.
 * digitalRoot(0) = 0, digitalRoot(n) = 1 + ((n−1) mod 9) for n > 0.
 */
export function digitalRoot(n: number): number {
  if (n === 0) return 0;
  return 1 + ((n - 1) % 9);
}

/**
 * Prime current — divides the 60-digit string into three 20-digit bands:
 *   cw (clockwise)   = digits  0–19
 *   axial            = digits 20–39
 *   ccw (c-c-w)      = digits 40–59
 *
 * The band with the highest sum drives the dominant visual geometry
 * (beam / orbit / shield respectively).
 */
export function computePrimeCurrent(digits: Digit[]): PrimeCurrent {
  const bandSum = (start: number) =>
    digits.slice(start, start + 20).reduce((a, b) => a + b, 0);
  return { cw: bandSum(0), axial: bandSum(20), ccw: bandSum(40) };
}

/**
 * Complement validation.
 * A valid dual-crown has the 30+30 structure where:
 *   digits[i] + digits[i + 30] ≡ 0 (mod 10)  for every i in 0..29
 * (digit 0 is self-complementary since (0 + 0) mod 10 = 0 and (0 + 10) mod 10 = 0)
 */
export function validateComplement(digits: Digit[]): boolean {
  for (let i = 0; i < 30; i++) {
    const sum = digits[i] + digits[i + 30];
    if (sum !== 0 && sum !== 10) return false;
  }
  return true;
}

/** Full statistical analysis for one 60-digit crown string. */
export function analyzeGenome60(crown: string): GenomeMetrics {
  const digits = parseDigits(crown);

  // Frequency table
  const counts = Array.from({ length: 10 }, (_, d) =>
    digits.filter((x) => x === d).length,
  );

  const digitSum = digits.reduce((a, b) => a + b, 0);
  const root = digitalRoot(digitSum);

  const oddCount = digits.filter((d) => d % 2 !== 0).length;
  const evenCount = digits.filter((d) => d % 2 === 0 && d !== 0).length;
  const zeroCount = counts[0];

  // All digits tied for the highest frequency
  const maxCount = Math.max(...counts);
  const dominantDigits = counts
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c === maxCount)
    .map(({ i }) => i as Digit);

  const primeCurrent = computePrimeCurrent(digits);
  const complementValid = validateComplement(digits);

  return {
    counts,
    digitSum,
    digitalRoot: root,
    oddCount,
    evenCount,
    zeroCount,
    dominantDigits,
    primeCurrent,
    complementValid,
  };
}

// ─── Step 2 — deriveChannels() ────────────────────────────────────────────────

/**
 * Derive all six crown channels from a red/blue pair.
 *
 * UNION  = (red[i] + blue[i]) mod 10   — evolved / bonded / ascended state
 * SHADOW = (red[i] − blue[i] + 10) mod 10 — dream / eclipse / hidden instincts
 * DAY    = first 30 digits of RED      — visible outward form
 * NIGHT  = last 30 digits of RED       — inverse latent form
 */
export function deriveChannels(red60: string, blue60: string): CrownChannels {
  if (red60.length !== 60) throw new Error(`red60 must be 60 digits, got ${red60.length}`);
  if (blue60.length !== 60) throw new Error(`blue60 must be 60 digits, got ${blue60.length}`);

  const union60 = red60
    .split("")
    .map((r, i) => ((Number(r) + Number(blue60[i])) % 10).toString())
    .join("");

  const shadow60 = red60
    .split("")
    .map((r, i) => ((Number(r) - Number(blue60[i]) + 10) % 10).toString())
    .join("");

  return {
    red60,
    blue60,
    union60,
    shadow60,
    day30: red60.slice(0, 30),
    night30: red60.slice(30, 60),
  };
}

// ─── Utility ──────────────────────────────────────────────────────────────────

/**
 * Validate that a string is exactly 60 decimal digits.
 * Returns a user-facing error string, or null if valid.
 */
export function validateCrownString(crown: string): string | null {
  if (typeof crown !== "string") return "Must be a string";
  if (crown.length !== 60) return `Must be exactly 60 digits (got ${crown.length})`;
  if (!/^\d+$/.test(crown)) return "Must contain only digits 0–9";
  return null;
}

/**
 * Returns the dominant instinct of a crown as a human-readable label.
 * Based on the digit with the highest frequency.
 */
export function dominantInstinct(metrics: GenomeMetrics): string {
  const labels: Record<number, string> = {
    0: "Void / Reset",
    1: "Will / Spark",
    2: "Sensing",
    3: "Expression",
    4: "Frame / Order",
    5: "Mutation / Hinge",
    6: "Embodiment",
    7: "Recursion / Mystic",
    8: "Memory / Archive",
    9: "Flare / Release",
  };
  const dom = metrics.dominantDigits[0] ?? 1;
  return labels[dom] ?? "Unknown";
}
