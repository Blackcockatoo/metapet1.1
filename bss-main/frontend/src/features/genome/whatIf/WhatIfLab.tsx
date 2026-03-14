"use client";

import { useEffect, useMemo, useState } from "react";
import type { SimulationResult } from "../../../../../shared/contracts/genomeResonance";
import {
  type SavedScenario,
  listSavedScenarios,
  saveScenario,
} from "../data/genomePersistenceClient";

export type TraitControl = {
  id: string;
  label: string;
  baseline: number;
};

type PotionType = "stimulant" | "inhibitor" | "balancer" | "catalyst";

type PotionProfile = {
  type: PotionType;
  potency: number;
  synergyScore: number;
  dominantTrait: string;
};

const POTION_META: Record<PotionType, { label: string; color: string; description: string }> = {
  stimulant: {
    label: "Stimulant",
    color: "text-emerald-400 border-emerald-500 bg-emerald-500/10",
    description: "Boosts multiple traits above baseline.",
  },
  inhibitor: {
    label: "Inhibitor",
    color: "text-rose-400 border-rose-500 bg-rose-500/10",
    description: "Suppresses trait expression across the network.",
  },
  balancer: {
    label: "Balancer",
    color: "text-sky-400 border-sky-500 bg-sky-500/10",
    description: "Stabilizes trait interactions with minimal net shift.",
  },
  catalyst: {
    label: "Catalyst",
    color: "text-amber-400 border-amber-500 bg-amber-500/10",
    description: "Amplifies divergence — some traits spike, others drop.",
  },
};

function derivePotionProfile(results: SimulationResult[]): PotionProfile | null {
  if (results.length === 0) return null;

  const netEffect = results.reduce((sum, r) => sum + r.estimate, 0);
  const spread = Math.max(...results.map((r) => r.estimate)) - Math.min(...results.map((r) => r.estimate));

  let type: PotionType;
  if (spread > 0.6) type = "catalyst";
  else if (netEffect > 0.15) type = "stimulant";
  else if (netEffect < -0.15) type = "inhibitor";
  else type = "balancer";

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

type Props = {
  controls: TraitControl[];
  onSimulate: (deltas: Record<string, number>) => Promise<SimulationResult[]>;
  onResults?: (results: SimulationResult[]) => void;
};

export function WhatIfLab({ controls, onSimulate, onResults }: Props) {
  const baseline = useMemo(
    () =>
      controls.reduce<Record<string, number>>(
        (acc, c) => ({ ...acc, [c.id]: c.baseline }),
        {},
      ),
    [controls],
  );
  const [values, setValues] = useState<Record<string, number>>(baseline);
  const [results, setResults] = useState<SimulationResult[]>([]);
  const [saved, setSaved] = useState<SavedScenario[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const potionProfile = useMemo(() => derivePotionProfile(results), [results]);

  useEffect(() => {
    listSavedScenarios()
      .then(setSaved)
      .catch(() => setError("Failed to load saved scenarios."));
  }, []);

  async function run() {
    setError(null);
    setIsRunning(true);

    try {
      const deltas = Object.fromEntries(
        Object.entries(values).map(([id, value]) => [id, value - baseline[id]]),
      );
      const nextResults = await onSimulate(deltas);
      setResults(nextResults);
      onResults?.(nextResults);
    } catch (error) {
      setResults([]);
      onResults?.([]);
      setError(error instanceof Error ? error.message : "Simulation failed.");
    } finally {
      setIsRunning(false);
    }
  }

  function reset() {
    setValues(baseline);
    setResults([]);
    onResults?.([]);
  }

  async function persistScenario() {
    setError(null);
    const optimistic: SavedScenario = {
      id: `optimistic-${saved.length + 1}`,
      name: `Scenario ${saved.length + 1}`,
      controls: values,
      sharedToken: "pending",
      updatedAt: new Date().toISOString(),
    };
    const previous = saved;
    setSaved([...previous, optimistic]);

    try {
      const persisted = await saveScenario(optimistic.name, values);
      setSaved([...previous, persisted]);
    } catch {
      setSaved(previous);
      setError("Scenario save failed and was rolled back.");
    }
  }

  return (
    <section className="rounded-xl border border-slate-800 p-4">
      <h3 className="font-semibold">Alchemist Lab — What-If</h3>

      {/* Trait sliders */}
      <div className="mt-3 space-y-3">
        {controls.map((control) => (
          <label className="block text-xs" key={control.id}>
            <span className="flex justify-between">
              <span>{control.label}</span>
              <span className="text-slate-400">{values[control.id].toFixed(2)}</span>
            </span>
            <input
              className="mt-1 w-full accent-violet-500"
              max={1}
              min={0}
              onChange={(event) =>
                setValues((state) => ({
                  ...state,
                  [control.id]: Number(event.target.value),
                }))
              }
              step={0.01}
              type="range"
              value={values[control.id]}
            />
          </label>
        ))}
      </div>

      {/* Action buttons */}
      <div className="mt-3 flex gap-2 text-xs">
        <button
          className="rounded bg-indigo-500 px-3 py-1 text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isRunning}
          onClick={run}
          type="button"
        >
          {isRunning ? "Brewing..." : "Brew Potion"}
        </button>
        <button
          className="rounded border border-slate-700 px-3 py-1 text-slate-300 hover:border-slate-500"
          onClick={reset}
          type="button"
        >
          Reset
        </button>
        <button
          className="rounded border border-slate-700 px-3 py-1 text-slate-300 hover:border-slate-500"
          onClick={persistScenario}
          type="button"
        >
          Save scenario
        </button>
      </div>

      {/* Potion profile panel */}
      {potionProfile && (
        <div className={`mt-4 rounded border px-3 py-2 text-xs ${POTION_META[potionProfile.type].color}`}>
          <div className="flex items-center justify-between">
            <span className="font-semibold">
              Potion Type: {POTION_META[potionProfile.type].label}
            </span>
            <span>Potency {(potionProfile.potency * 100).toFixed(0)}%</span>
          </div>
          <p className="mt-0.5 text-slate-400">{POTION_META[potionProfile.type].description}</p>
          <div className="mt-1.5 flex gap-4">
            <span>Synergy: {(potionProfile.synergyScore * 100).toFixed(0)}%</span>
            <span>Dominant: {potionProfile.dominantTrait}</span>
          </div>
          {/* Potency bar */}
          <div className="mt-2 h-1.5 w-full rounded-full bg-slate-700">
            <div
              className="h-1.5 rounded-full bg-current opacity-70"
              style={{ width: `${(potionProfile.potency * 100).toFixed(0)}%` }}
            />
          </div>
        </div>
      )}

      {/* Simulation results */}
      <ul className="mt-4 space-y-2 text-xs">
        {results.map((result) => (
          <li
            className="rounded border border-slate-700 p-2"
            key={result.traitId}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{result.traitId}</span>
              <span className="text-slate-400">Feasibility {(result.feasibility * 100).toFixed(0)}%</span>
            </div>
            <div className="mt-0.5 text-slate-300">
              Estimate: {result.estimate.toFixed(2)}{" "}
              <span className="text-slate-500">
                [{result.lowerBound.toFixed(2)} – {result.upperBound.toFixed(2)}]
              </span>
            </div>
            {/* Estimate bar */}
            <div className="mt-1.5 h-1 w-full rounded-full bg-slate-700">
              <div
                className={`h-1 rounded-full ${result.estimate >= 0 ? "bg-violet-500" : "bg-rose-500"}`}
                style={{ width: `${Math.min(100, Math.abs(result.estimate) * 100).toFixed(0)}%` }}
              />
            </div>
            {result.tradeoffWarning ? (
              <div className="mt-1 text-amber-300">Tradeoff: {result.tradeoffWarning}</div>
            ) : null}
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs text-slate-500">Saved scenarios: {saved.length}</p>
      {saved.at(-1)?.sharedToken && saved.at(-1)?.sharedToken !== "pending" ? (
        <p className="mt-1 text-xs text-slate-500">
          Share token: {saved.at(-1)?.sharedToken}
        </p>
      ) : null}
      {error ? <p className="mt-1 text-xs text-rose-400">{error}</p> : null}
    </section>
  );
}
