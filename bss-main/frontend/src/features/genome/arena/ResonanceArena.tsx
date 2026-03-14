"use client";

import { useMemo, useState } from "react";

export type OverlayMode = "similarity" | "complementarity" | "divergence";

export type Signature = {
  petId: string;
  behavior: number;
  health: number;
  athletic: number;
};

type TraitKey = "behavior" | "health" | "athletic";

type BattleResult = {
  traitKey: TraitKey;
  scores: Record<string, number>;
  winnerId: string | null;
};

type Props = {
  signatures: Signature[];
};

const TRAIT_KEYS: TraitKey[] = ["behavior", "health", "athletic"];

const TRAIT_LABELS: Record<TraitKey, string> = {
  behavior: "Behavior",
  health: "Health",
  athletic: "Athletic",
};

/**
 * Compute per-trait battle scores based on overlay mode.
 *
 * similarity:       lower absolute distance from group mean wins (more similar = higher score)
 * complementarity:  how much each pet fills gaps the others don't (unique high-value traits)
 * divergence:       raw trait value wins (highest value per trait wins)
 */
function computeBattle(signatures: Signature[], mode: OverlayMode): BattleResult[] {
  if (signatures.length === 0) return [];

  return TRAIT_KEYS.map((key) => {
    const values = signatures.map((s) => ({ petId: s.petId, value: s[key] }));

    let scores: Record<string, number>;

    if (mode === "similarity") {
      const mean = values.reduce((sum, v) => sum + v.value, 0) / values.length;
      scores = Object.fromEntries(
        values.map(({ petId, value }) => [petId, Math.max(0, 1 - Math.abs(value - mean))]),
      );
    } else if (mode === "complementarity") {
      const maxVal = Math.max(...values.map((v) => v.value));
      scores = Object.fromEntries(
        values.map(({ petId, value }) => {
          const uniqueness = value / (maxVal + 0.001);
          return [petId, uniqueness];
        }),
      );
    } else {
      // divergence — raw value
      scores = Object.fromEntries(values.map(({ petId, value }) => [petId, value]));
    }

    const topScore = Math.max(...Object.values(scores));
    const winners = Object.entries(scores).filter(([, s]) => Math.abs(s - topScore) < 0.001);
    const winnerId = winners.length === 1 ? winners[0][0] : null; // null = tie

    return { traitKey: key, scores, winnerId };
  });
}

function computeArenaChampion(battle: BattleResult[]): string | null {
  const wins: Record<string, number> = {};
  for (const result of battle) {
    if (result.winnerId) {
      wins[result.winnerId] = (wins[result.winnerId] ?? 0) + 1;
    }
  }
  const sorted = Object.entries(wins).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0 || (sorted.length > 1 && sorted[0][1] === sorted[1][1])) return null;
  return sorted[0][0];
}

function ScoreBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="mt-0.5 h-1.5 w-full rounded-full bg-slate-700">
      <div
        className="h-1.5 rounded-full bg-violet-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function ResonanceArena({ signatures }: Props) {
  const [mode, setMode] = useState<OverlayMode>("similarity");

  const battle = useMemo(() => computeBattle(signatures, mode), [signatures, mode]);
  const champion = useMemo(() => computeArenaChampion(battle), [battle]);

  return (
    <section className="rounded-xl border border-slate-800 p-4">
      <h3 className="font-semibold">Resonance Arena</h3>

      {/* Mode selector */}
      <div className="mt-2 flex gap-2 text-xs">
        {(["similarity", "complementarity", "divergence"] as const).map((item) => (
          <button
            className={`rounded px-2 py-1 capitalize ${mode === item ? "bg-violet-600 text-white" : "border border-slate-700 text-slate-300 hover:border-violet-400"}`}
            key={item}
            onClick={() => setMode(item)}
            type="button"
          >
            {item}
          </button>
        ))}
      </div>

      {/* Arena champion banner */}
      {champion ? (
        <div className="mt-3 rounded border border-amber-500 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300">
          Arena Champion ({mode}): {champion}
        </div>
      ) : signatures.length > 1 ? (
        <div className="mt-3 rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-400">
          Tied — no champion in {mode} mode
        </div>
      ) : null}

      {/* Per-trait battle breakdown */}
      {battle.length > 0 && (
        <div className="mt-3 space-y-3">
          {battle.map(({ traitKey, scores, winnerId }) => (
            <div key={traitKey}>
              <div className="mb-1 text-xs font-medium text-slate-300">{TRAIT_LABELS[traitKey]}</div>
              <div className="space-y-1">
                {signatures.map((sig) => {
                  const score = scores[sig.petId] ?? 0;
                  const isWinner = sig.petId === winnerId;
                  return (
                    <div key={sig.petId} className="flex items-center gap-2 text-xs">
                      <span
                        className={`w-24 truncate font-medium ${isWinner ? "text-amber-300" : "text-slate-400"}`}
                      >
                        {isWinner ? "★ " : ""}{sig.petId}
                      </span>
                      <div className="flex-1">
                        <ScoreBar value={score} />
                      </div>
                      <span className="w-10 text-right text-slate-400">{(score * 100).toFixed(0)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {signatures.length === 0 && (
        <p className="mt-4 text-xs text-slate-500">Add pet signatures to start the battle.</p>
      )}

      <p className="mt-3 text-xs text-slate-600">Invite links, viewer/editor permission controls, and snapshot export are supported in room APIs.</p>
    </section>
  );
}
