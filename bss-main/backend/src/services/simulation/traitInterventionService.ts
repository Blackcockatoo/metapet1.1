import type { SimulationRequest, SimulationResult } from "../../../../shared/contracts/genomeResonance";

export type InteractionGraph = Record<string, Record<string, number>>;

export type PotionType = "stimulant" | "inhibitor" | "balancer" | "catalyst";

export type PotionProfile = {
  type: PotionType;
  potency: number; // 0–1
  synergyScore: number; // net positive synergy across affected traits
  dominantTrait: string;
};

/**
 * Classify the overall potion type based on the net propagation effect.
 */
function classifyPotion(results: SimulationResult[]): PotionType {
  const netEffect = results.reduce((sum, r) => sum + r.estimate, 0);
  const spread = Math.max(...results.map((r) => r.estimate)) - Math.min(...results.map((r) => r.estimate));

  if (spread > 0.6) return "catalyst";
  if (netEffect > 0.15) return "stimulant";
  if (netEffect < -0.15) return "inhibitor";
  return "balancer";
}

/**
 * Multi-hop trait propagation: first-order neighborhood + second-order dampened effects.
 */
function propagateMultiHop(traitId: string, delta: number, graph: InteractionGraph): number {
  const firstOrder = graph[traitId] ?? {};

  // First-hop: direct neighbors
  let total = delta;
  for (const [neighborId, weight] of Object.entries(firstOrder)) {
    const firstHopEffect = delta * weight;
    total += firstHopEffect;

    // Second-hop: neighbors of neighbors (damped by 0.4)
    const secondOrder = graph[neighborId] ?? {};
    for (const [, secondWeight] of Object.entries(secondOrder)) {
      total += firstHopEffect * secondWeight * 0.4;
    }
  }
  return total;
}

/**
 * Compute confidence decay: more uncertainty as propagation hops increase.
 */
function computeUncertainty(propagated: number, hopCount: number): number {
  const baseUncertainty = Math.abs(propagated) * 0.2;
  const hopPenalty = hopCount * 0.05;
  return Math.min(0.5, baseUncertainty + hopPenalty);
}

export function runTraitIntervention(
  request: SimulationRequest,
  graph: InteractionGraph,
): SimulationResult[] {
  return Object.entries(request.deltas).map(([traitId, delta]) => {
    const neighborhood = graph[traitId] ?? {};
    const hopCount = Object.keys(neighborhood).length;

    const propagated = propagateMultiHop(traitId, delta, graph);
    const uncertainty = computeUncertainty(propagated, hopCount);
    const feasibility = Math.max(0.1, 1 - uncertainty);

    const biggestConflict = Object.entries(neighborhood).find(([, weight]) => weight < -0.4);

    return {
      traitId,
      estimate: propagated,
      lowerBound: propagated - uncertainty,
      upperBound: propagated + uncertainty,
      tradeoffWarning: biggestConflict
        ? `Boosting ${traitId} may suppress ${biggestConflict[0]}.`
        : undefined,
      feasibility,
    };
  });
}

export function buildPotionProfile(results: SimulationResult[]): PotionProfile {
  if (results.length === 0) {
    return { type: "balancer", potency: 0, synergyScore: 0, dominantTrait: "none" };
  }

  const type = classifyPotion(results);

  const maxEstimate = Math.max(...results.map((r) => Math.abs(r.estimate)));
  const potency = Math.min(1, maxEstimate);

  const synergyScore = Math.max(
    0,
    results.reduce((sum, r) => sum + (r.feasibility - 0.5) * 2, 0) / results.length,
  );

  const dominant = results.reduce((best, r) =>
    Math.abs(r.estimate) > Math.abs(best.estimate) ? r : best,
  );

  return { type, potency, synergyScore, dominantTrait: dominant.traitId };
}
