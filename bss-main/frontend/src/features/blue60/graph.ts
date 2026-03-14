import type { BlueNode, BlueMacroRole, BlueNodeTrait } from "./types";

// ─── Node trait table ─────────────────────────────────────────────────────────

export const NODE_TRAITS: Record<BlueNode, BlueNodeTrait> = {
  0: {
    name: "Void Gate",
    role: "VOID",
    behaviour: "Observing",
    visualTone: "dim halo, minimal motion",
    color: "#64748b",
  },
  1: {
    name: "Oracle Spark",
    role: "ODD",
    behaviour: "Noticing",
    visualTone: "sharp cyan flicker",
    color: "#22d3ee",
  },
  2: {
    name: "Gather Form",
    role: "EVEN",
    behaviour: "Collecting",
    visualTone: "square lattice pulse",
    color: "#4ade80",
  },
  3: {
    name: "Voice Loop",
    role: "ODD",
    behaviour: "Chirping",
    visualTone: "throat sigil glow",
    color: "#a78bfa",
  },
  4: {
    name: "Forge Pattern",
    role: "EVEN",
    behaviour: "Building",
    visualTone: "geometric gold-green band",
    color: "#fbbf24",
  },
  5: {
    name: "Bridge Gate",
    role: "BRIDGE",
    behaviour: "Crossing",
    visualTone: "central bloom / phase split",
    color: "#ec4899",
  },
  6: {
    name: "Guard Structure",
    role: "EVEN",
    behaviour: "Protecting",
    visualTone: "dense shell glow",
    color: "#60a5fa",
  },
  7: {
    name: "Trickster Pulse",
    role: "ODD",
    behaviour: "Playing",
    visualTone: "quick side arcs",
    color: "#f97316",
  },
  8: {
    name: "Wander Circuit",
    role: "EVEN",
    behaviour: "Roaming",
    visualTone: "orbit trails",
    color: "#34d399",
  },
  9: {
    name: "Crown Signal",
    role: "ODD",
    behaviour: "Awakening",
    visualTone: "crown flare / sun-gold crest",
    color: "#fde68a",
  },
};

export function nodeToMacroRole(node: BlueNode): BlueMacroRole {
  return NODE_TRAITS[node].role;
}

// ─── Transition graph ─────────────────────────────────────────────────────────
// Keys are "from-to"; values are base transition weights (unnormalised).
// Higher = more likely when all other modifiers are neutral.

export const BASE_EDGE_WEIGHTS: Record<string, number> = {
  // 0  Void Gate → limited exits
  "0-1": 0.55,
  "0-5": 0.45,

  // 1  Oracle Spark → well-connected (gateway to spine and curiosity)
  "1-0": 0.08,
  "1-2": 0.28,
  "1-4": 0.38, // spine edge
  "1-7": 0.14,
  "1-9": 0.12,

  // 2  Gather Form
  "2-1": 0.28, // spine edge (back)
  "2-3": 0.42,
  "2-7": 0.30,

  // 3  Voice Loop
  "3-2": 0.38, // spine edge
  "3-4": 0.28,
  "3-6": 0.34, // spine edge

  // 4  Forge Pattern
  "4-3": 0.18,
  "4-5": 0.12,
  "4-7": 0.40, // spine edge
  "4-9": 0.30, // sovereignty cycle shortcut

  // 5  Bridge Gate → many exits (metamorphosis hub)
  "5-0": 0.14,
  "5-1": 0.20,
  "5-4": 0.14,
  "5-6": 0.20,
  "5-8": 0.18,
  "5-9": 0.14,

  // 6  Guard Structure
  "6-1": 0.30, // sovereignty cycle + spine
  "6-3": 0.32, // spine edge
  "6-5": 0.12,
  "6-7": 0.26,

  // 7  Trickster Pulse
  "7-2": 0.22,
  "7-6": 0.28,
  "7-8": 0.50, // spine edge + curiosity cycle

  // 8  Wander Circuit
  "8-3": 0.30, // curiosity cycle
  "8-7": 0.28,
  "8-9": 0.42, // spine edge

  // 9  Crown Signal
  "9-0": 0.10,
  "9-5": 0.18,
  "9-6": 0.40, // spine edge
  "9-8": 0.32,
};

/** Returns all outgoing edge keys from a given node. */
export function getOutgoingEdges(node: BlueNode): Array<{ to: BlueNode; key: string }> {
  return Object.keys(BASE_EDGE_WEIGHTS)
    .filter((k) => k.startsWith(`${node}-`))
    .map((key) => ({ key, to: Number(key.split("-")[1]) as BlueNode }));
}

// ─── Gold spine ───────────────────────────────────────────────────────────────
// The sacred backbone. Traversal accumulates spineCharge and triggers crown events.

export const GOLD_SPINE_NODES: BlueNode[] = [1, 4, 7, 8, 9, 6, 3, 2];

/** Consecutive pairs that form the gold spine loop (including closing 2→1). */
export const GOLD_SPINE_PAIRS: [BlueNode, BlueNode][] = [
  [1, 4], [4, 7], [7, 8], [8, 9], [9, 6], [6, 3], [3, 2], [2, 1],
];

/** Fast set for O(1) spine-edge lookup. */
export const GOLD_SPINE_SET = new Set(GOLD_SPINE_PAIRS.map(([a, b]) => `${a}-${b}`));

// ─── Instinct cycles ──────────────────────────────────────────────────────────

export const CYCLES: Record<"c1" | "c2" | "c3", BlueNode[]> = {
  c1: [1, 4, 9, 6],       // Sovereignty cycle
  c2: [2, 7, 8, 3],       // Curiosity cycle
  c3: [1, 4, 7, 8, 9, 6, 3, 2], // Coronation cycle (= full spine loop)
};

/** Directed pairs for each cycle (used for UI arrows and detection). */
export const CYCLE_PAIRS: Record<"c1" | "c2" | "c3", [BlueNode, BlueNode][]> = {
  c1: [[1, 4], [4, 9], [9, 6], [6, 1]],
  c2: [[2, 7], [7, 8], [8, 3], [3, 2]],
  c3: [[1, 4], [4, 7], [7, 8], [8, 9], [9, 6], [6, 3], [3, 2], [2, 1]],
};

/** Accent colours per cycle (for UI rendering). */
export const CYCLE_COLORS: Record<"c1" | "c2" | "c3", string> = {
  c1: "#fbbf24", // amber — sovereignty
  c2: "#22d3ee", // cyan  — curiosity
  c3: "#a78bfa", // violet — coronation
};
