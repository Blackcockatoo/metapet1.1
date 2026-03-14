// ─── Blue-60 Core Types ───────────────────────────────────────────────────────
// Blue-60 is the pet's hidden soul-wheel: a directed graph of 10 microstates
// that drives behaviour, aura, rarity, add-on reactions, breeding, and evolution.

/** A node on the Blue-60 wheel (0–9). */
export type BlueNode = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/** High-level macro role: what "kind" of energy is active. */
export type BlueMacroRole = "VOID" | "BRIDGE" | "EVEN" | "ODD";

/**
 * Four harmonic channels (C₄ decomposition).
 * All values are normalised 0–1.
 */
export type Harmonics = {
  m0: number; // stable body field / aura / heartbeat
  m1: number; // clockwise chiral swirl / seeking / focus
  m2: number; // opposition / eye-split / mirrored tension
  m3: number; // counter-clockwise swirl / dream-drift / memory
};

/** Instinct loop biases — how strongly a pet is pulled toward each cycle. */
export type CycleBias = {
  c1: number; // sovereignty / ritual loop  [1→4→9→6→1]
  c2: number; // curiosity / play loop       [2→7→8→3→2]
  c3: number; // awakening / coronation loop [1→4→7→8→9→6→3→2→1]
};

/**
 * The inherited Blue genome: controls how a pet moves through the wheel.
 * Bred from parents; modified by add-ons.
 */
export type BlueGenome = {
  /** Per-edge weight modifiers. Keys follow "from-to" format e.g. "1-4". */
  edgeWeights: Record<string, number>;
  /** Per-node pull strength. Positive = more likely to enter. */
  nodeAffinity: Record<BlueNode, number>;
  /** Extra pull towards gold-spine edges (0–1). */
  spineAffinity: number;
  /** Multiplier for entering Bridge Gate (node 5). Rare by default < 1. */
  bridgeAccess: number;
  /** Bonus pull toward ODD-role nodes (1 3 7 9). */
  oddBias: number;
  /** Bonus pull toward EVEN-role nodes (2 4 6 8). */
  evenBias: number;
  /** Baseline harmonic amplitudes for this pet's lineage. */
  harmonics: Harmonics;
  /** How strongly this pet gravitates to each instinct cycle. */
  cycleBias: CycleBias;
};

/**
 * The live runtime state of the Blue-60 engine for one pet.
 * Updated every tick by updateBlue60().
 */
export type BlueState = {
  activeNode: BlueNode;
  macroRole: BlueMacroRole;
  /** Number of consecutive ticks spent on the current node. */
  dwell: number;
  /** Slow-incrementing phase angle (radians, 0–2π). Drives shader/audio. */
  phase: number;
  /** Current resonance intensity 0–1. Peaks when inside a cycle. */
  resonance: number;
  /** Accumulated gold-spine traversal count. Triggers crown events. */
  spineCharge: number;
  /** Accumulated Bridge Gate entries. Triggers metamorphosis. */
  bridgeCharge: number;
  /** Active instinct loop, or "none". */
  currentCycle: "none" | "c1" | "c2" | "c3";
  /** Rolling trail of recently visited nodes (capped at 20). */
  lastPath: BlueNode[];
};

/**
 * Environment and care inputs that bend transition weights each tick.
 * Provided by the game layer — not stored in Blue-60 itself.
 */
export type BehaviourInputs = {
  energy: number;     // 0–1
  curiosity: number;  // 0–1
  bond: number;       // 0–1
  hunger: number;     // 0–1
  boredom: number;    // 0–1
  timeOfDay: number;  // 0–24 (hours)
};

/**
 * Effect descriptor emitted by an equipped add-on.
 * Each field is a delta applied on top of the pet's genome.
 */
export type BlueAddonEffect = {
  nodeAffinityDelta?: Partial<Record<BlueNode, number>>;
  edgeWeightDelta?: Record<string, number>;
  harmonicsDelta?: Partial<Harmonics>;
  cycleBiasDelta?: Partial<CycleBias>;
  spineAffinityDelta?: number;
  bridgeAccessDelta?: number;
};

/** Visual + behaviour metadata for each node (used by UI and behaviour outputs). */
export type BlueNodeTrait = {
  name: string;
  role: BlueMacroRole;
  /** Short player-facing action label. */
  behaviour: string;
  /** Visual tone descriptor (for shaders / animation). */
  visualTone: string;
  /** Accent colour (hex). */
  color: string;
};
