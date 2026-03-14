import type {
  BlueState,
  BlueGenome,
  BlueAddonEffect,
  BehaviourInputs,
  BlueNode,
  Harmonics,
} from "./types";
import {
  BASE_EDGE_WEIGHTS,
  CYCLES,
  CYCLE_PAIRS,
  GOLD_SPINE_SET,
  getOutgoingEdges,
  nodeToMacroRole,
} from "./graph";

// ─── Defaults ─────────────────────────────────────────────────────────────────

export function defaultGenome(): BlueGenome {
  return {
    edgeWeights: {},
    nodeAffinity: {
      0: 0.00, 1: 0.10, 2: 0.05, 3: 0.05,
      4: 0.10, 5: 0.00, 6: 0.05, 7: 0.10,
      8: 0.05, 9: 0.08,
    },
    spineAffinity: 0.5,
    bridgeAccess: 0.7,
    oddBias: 0.10,
    evenBias: 0.10,
    harmonics: { m0: 0.40, m1: 0.30, m2: 0.20, m3: 0.25 },
    cycleBias: { c1: 0.30, c2: 0.40, c3: 0.20 },
  };
}

export function defaultState(): BlueState {
  return {
    activeNode: 1,       // start at Oracle Spark
    macroRole: "ODD",
    dwell: 0,
    phase: 0,
    resonance: 0.5,
    spineCharge: 0,
    bridgeCharge: 0,
    currentCycle: "none",
    lastPath: [1],
  };
}

export function defaultInputs(): BehaviourInputs {
  return {
    energy: 0.70,
    curiosity: 0.50,
    bond: 0.60,
    hunger: 0.30,
    boredom: 0.20,
    timeOfDay: 12,
  };
}

// ─── Cycle detection ──────────────────────────────────────────────────────────

/**
 * Scans the recent path for any rotation match against c1, c2, or c3.
 * c3 (Coronation, length 8) is checked last — it's rarer.
 */
export function detectCycle(lastPath: BlueNode[]): "none" | "c1" | "c2" | "c3" {
  for (const id of ["c1", "c2", "c3"] as const) {
    const cycle = CYCLES[id];
    const cycleLen = cycle.length;
    if (lastPath.length < cycleLen) continue;

    const tail = lastPath.slice(-cycleLen);
    for (let offset = 0; offset < cycleLen; offset++) {
      if (cycle.every((node, i) => node === tail[(offset + i) % cycleLen])) {
        return id;
      }
    }
  }
  return "none";
}

// ─── Spine & bridge charge ────────────────────────────────────────────────────

export function updateSpineCharge(lastPath: BlueNode[], current: number): number {
  if (lastPath.length < 2) return current;
  const from = lastPath[lastPath.length - 2];
  const to = lastPath[lastPath.length - 1];
  return GOLD_SPINE_SET.has(`${from}-${to}`)
    ? current + 1
    : Math.max(0, current - 0.1);
}

export function updateBridgeCharge(nextNode: BlueNode, state: BlueState): number {
  if (nextNode === 5) return state.bridgeCharge + 1;
  if (state.activeNode === 5) return state.bridgeCharge + 0.5; // leaving bridge still counts
  return Math.max(0, state.bridgeCharge - 0.05);
}

// ─── Live harmonic computation ────────────────────────────────────────────────

/**
 * Derives current harmonic intensities from live state + genome baseline.
 * Use this to drive visual / shader / audio outputs.
 */
export function computeLiveHarmonics(state: BlueState, genome: BlueGenome): Harmonics {
  const base = genome.harmonics;
  const { activeNode, currentCycle, spineCharge, dwell, bridgeCharge } = state;

  // m0: body field — strengthens with even-role nodes and sustained dwell
  const evenBoost = ([2, 4, 6, 8] as BlueNode[]).includes(activeNode) ? 0.12 : 0;
  const dwellBoost = Math.min(0.10, dwell * 0.015);
  const m0 = clamp01(base.m0 + evenBoost + dwellBoost);

  // m1: clockwise chiral — boosted by odd nodes and sovereignty cycle
  const oddBoost = ([1, 3, 7, 9] as BlueNode[]).includes(activeNode) ? 0.15 : 0;
  const c1Boost = currentCycle === "c1" ? 0.12 : 0;
  const m1 = clamp01(base.m1 + oddBoost + c1Boost);

  // m2: opposition / split — boosted by bridge gate and spine charge
  const bridgeBoost = activeNode === 5 ? 0.20 : 0;
  const spineBoost = Math.min(0.15, spineCharge * 0.01);
  const bridgeChargeBoost = Math.min(0.10, bridgeCharge * 0.005);
  const m2 = clamp01(base.m2 + bridgeBoost + spineBoost + bridgeChargeBoost);

  // m3: counter-clockwise / dream — boosted by void and curiosity cycle
  const voidBoost = activeNode === 0 ? 0.18 : 0;
  const c2Boost = currentCycle === "c2" ? 0.12 : 0;
  const c3Boost = currentCycle === "c3" ? 0.08 : 0;
  const m3 = clamp01(base.m3 + voidBoost + c2Boost + c3Boost);

  return { m0, m1, m2, m3 };
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

// ─── Weighted transition sampler ──────────────────────────────────────────────

function buildEffectiveWeights(
  edges: Array<{ to: BlueNode; key: string }>,
  genome: BlueGenome,
  addons: BlueAddonEffect[],
  inputs: BehaviourInputs,
  state: BlueState,
): Record<string, number> {
  const weights: Record<string, number> = {};

  for (const { key, to } of edges) {
    let w = BASE_EDGE_WEIGHTS[key] ?? 0.05;

    // Genome edge-weight modifier
    const genomeEdge = genome.edgeWeights[key];
    if (genomeEdge !== undefined) w *= 1 + genomeEdge;

    // Node affinity
    w *= 1 + (genome.nodeAffinity[to] ?? 0);

    // Gold spine bonus
    if (GOLD_SPINE_SET.has(key)) w *= 1 + genome.spineAffinity * 0.5;

    // Bridge access multiplier (makes node 5 rarer or more accessible)
    if (to === 5) w *= genome.bridgeAccess;

    // Odd / even bias
    const role = nodeToMacroRole(to);
    if (role === "ODD") w *= 1 + genome.oddBias * 0.3;
    if (role === "EVEN") w *= 1 + genome.evenBias * 0.3;

    // ── Behaviour input bends ────────────────────────────────────────────────
    // Oracle / Crown attracted by curiosity
    if (to === 1 || to === 9) w *= 1 + inputs.curiosity * 0.20;
    // Trickster / Gather attracted by boredom
    if (to === 7 || to === 2) w *= 1 + inputs.boredom * 0.30;
    // Guard attractive when energy is low (rest state)
    if (to === 6) w *= 1 + (1 - inputs.energy) * 0.20;
    // Void more likely when bond is weak
    if (to === 0) w *= 1 + (1 - inputs.bond) * 0.25;
    // Wander boosted by curiosity + low hunger
    if (to === 8) w *= 1 + inputs.curiosity * 0.15 + (1 - inputs.hunger) * 0.10;
    // Bridge harder to reach when hungry
    if (to === 5) w *= 1 - inputs.hunger * 0.15;
    // Forge / Voice boosted by high energy
    if (to === 4 || to === 3) w *= 1 + inputs.energy * 0.12;

    // Time-of-day modulations
    const isNight = inputs.timeOfDay > 20 || inputs.timeOfDay < 6;
    if (isNight && (to === 0 || to === 3)) w *= 1.25; // quiet / dreaming at night
    if (!isNight && to === 9) w *= 1.20;               // crown signal peaks in the day
    if (isNight && to === 9) w *= 0.80;

    // ── Add-on modifiers ─────────────────────────────────────────────────────
    for (const addon of addons) {
      if (addon.edgeWeightDelta?.[key] !== undefined) {
        w *= 1 + addon.edgeWeightDelta[key];
      }
      if (addon.nodeAffinityDelta?.[to] !== undefined) {
        w *= 1 + (addon.nodeAffinityDelta[to] ?? 0);
      }
    }

    weights[key] = Math.max(0.001, w);
  }

  return weights;
}

function sampleWeighted(
  edges: Array<{ to: BlueNode; key: string }>,
  weights: Record<string, number>,
): BlueNode {
  const total = edges.reduce((sum, { key }) => sum + (weights[key] ?? 0.001), 0);
  let r = Math.random() * total;
  for (const { key, to } of edges) {
    r -= weights[key] ?? 0.001;
    if (r <= 0) return to;
  }
  return edges[edges.length - 1].to;
}

// ─── State advancement ────────────────────────────────────────────────────────

function advanceState(
  state: BlueState,
  nextNode: BlueNode,
  _genome: BlueGenome,
  _inputs: BehaviourInputs,
): BlueState {
  const nextPath = [...state.lastPath.slice(-19), nextNode]; // keep last 20 nodes
  const nextSpineCharge = updateSpineCharge(nextPath, state.spineCharge);
  const nextBridgeCharge = updateBridgeCharge(nextNode, state);
  const nextCycle = detectCycle(nextPath);

  // Dwell: increments while staying on same node, resets on move
  const nextDwell = nextNode === state.activeNode ? state.dwell + 1 : 0;

  // Resonance: pulls toward 0.9 inside a cycle, decays toward 0.3 outside
  const resonanceTarget = nextCycle !== "none" ? 0.9 : 0.3;
  const nextResonance = state.resonance + (resonanceTarget - state.resonance) * 0.1;

  // Phase: slow angular increment used by shaders and audio panning
  const nextPhase = (state.phase + 0.05) % (2 * Math.PI);

  return {
    activeNode: nextNode,
    macroRole: nodeToMacroRole(nextNode),
    dwell: nextDwell,
    phase: nextPhase,
    resonance: nextResonance,
    spineCharge: nextSpineCharge,
    bridgeCharge: nextBridgeCharge,
    currentCycle: nextCycle,
    lastPath: nextPath,
  };
}

// ─── Crownwheel event detection ───────────────────────────────────────────────

/** Returns true if a full spine loop was just completed (triggers crown event). */
export function isSpineLoopComplete(state: BlueState): boolean {
  // Full loop = [1,4,7,8,9,6,3,2] then back to 1
  const spineLen = 8;
  if (state.lastPath.length < spineLen + 1) return false;
  const tail = state.lastPath.slice(-(spineLen + 1));
  const SPINE_LOOP: BlueNode[] = [1, 4, 7, 8, 9, 6, 3, 2, 1];
  return SPINE_LOOP.every((n, i) => n === tail[i]);
}

// ─── Cycle-bias application to cycle detection ────────────────────────────────

/**
 * Returns the active instinct cycle with genome & addon cycle bias applied.
 * Pets with high c2 bias "settle" into curiosity-cycle more readily than the
 * raw path detection would suggest.
 */
export function detectCycleWithBias(
  lastPath: BlueNode[],
  genome: BlueGenome,
  addons: BlueAddonEffect[],
): "none" | "c1" | "c2" | "c3" {
  const raw = detectCycle(lastPath);

  // Merge addon cycleBias deltas
  const effectiveBias = { ...genome.cycleBias };
  for (const addon of addons) {
    if (addon.cycleBiasDelta) {
      for (const [k, v] of Object.entries(addon.cycleBiasDelta) as [keyof typeof effectiveBias, number][]) {
        effectiveBias[k] = clamp01((effectiveBias[k] ?? 0) + v);
      }
    }
  }

  // If raw detected nothing, a high cycle bias can "sustain" the nearest partial match
  if (raw !== "none") return raw;

  for (const id of ["c3", "c1", "c2"] as const) {
    const cycle = CYCLES[id];
    const recent = lastPath.slice(-cycle.length + 1);
    const pairs = CYCLE_PAIRS[id];
    const recentPairs = new Set(
      recent.slice(0, -1).map((n, i) => `${n}-${recent[i + 1]}`),
    );
    const matchRatio = pairs.filter(([a, b]) => recentPairs.has(`${a}-${b}`)).length / pairs.length;

    if (matchRatio >= 0.75 && effectiveBias[id] >= 0.5) return id;
  }

  return "none";
}

// ─── Main update function ─────────────────────────────────────────────────────

/**
 * Single Blue-60 tick.
 * Call this on a fixed interval (e.g. every 500 ms – 2 s depending on game feel).
 */
export function updateBlue60(
  state: BlueState,
  inputs: BehaviourInputs,
  genome: BlueGenome,
  addons: BlueAddonEffect[],
): BlueState {
  const edges = getOutgoingEdges(state.activeNode);
  if (edges.length === 0) return state; // safety: isolated node

  const weights = buildEffectiveWeights(edges, genome, addons, inputs, state);
  const nextNode = sampleWeighted(edges, weights);
  return advanceState(state, nextNode, genome, inputs);
}

// ─── Breeding helpers ─────────────────────────────────────────────────────────

/** Linear interpolation (used by breeding formula). */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Produce an offspring genome by blending two parents with a seed mix ratio.
 * Mutation magnitude is controlled by `mutationStrength` (0 = none, 1 = wild).
 */
export function breedGenomes(
  parentA: BlueGenome,
  parentB: BlueGenome,
  seedMix: number, // 0–1 how much of B vs A
  mutationStrength = 0.05,
  rng: () => number = Math.random,
): BlueGenome {
  const mut = () => (rng() * 2 - 1) * mutationStrength;

  const blendRecord = <T extends number>(
    a: Record<string, T>,
    b: Record<string, T>,
  ): Record<string, number> => {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    return Object.fromEntries(
      [...keys].map((k) => [k, clamp01(lerp(Number(a[k] ?? 0), Number(b[k] ?? 0), seedMix) + mut())]),
    );
  };

  return {
    edgeWeights: blendRecord(parentA.edgeWeights, parentB.edgeWeights),
    nodeAffinity: blendRecord(
      parentA.nodeAffinity as Record<string, number>,
      parentB.nodeAffinity as Record<string, number>,
    ) as BlueGenome["nodeAffinity"],
    spineAffinity: clamp01(lerp(parentA.spineAffinity, parentB.spineAffinity, seedMix) + mut()),
    bridgeAccess: clamp01(lerp(parentA.bridgeAccess, parentB.bridgeAccess, seedMix) + mut()),
    oddBias: clamp01(lerp(parentA.oddBias, parentB.oddBias, seedMix) + mut()),
    evenBias: clamp01(lerp(parentA.evenBias, parentB.evenBias, seedMix) + mut()),
    harmonics: {
      m0: clamp01(lerp(parentA.harmonics.m0, parentB.harmonics.m0, seedMix) + mut()),
      m1: clamp01(lerp(parentA.harmonics.m1, parentB.harmonics.m1, seedMix) + mut()),
      m2: clamp01(lerp(parentA.harmonics.m2, parentB.harmonics.m2, seedMix) + mut()),
      m3: clamp01(lerp(parentA.harmonics.m3, parentB.harmonics.m3, seedMix) + mut()),
    },
    cycleBias: {
      c1: clamp01(lerp(parentA.cycleBias.c1, parentB.cycleBias.c1, seedMix) + mut()),
      c2: clamp01(lerp(parentA.cycleBias.c2, parentB.cycleBias.c2, seedMix) + mut()),
      c3: clamp01(lerp(parentA.cycleBias.c3, parentB.cycleBias.c3, seedMix) + mut()),
    },
  };
}
