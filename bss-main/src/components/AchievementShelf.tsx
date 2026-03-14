"use client";

import { useEffect, useRef, useState } from "react";
import { ACHIEVEMENT_CATALOG } from "@/lib/progression/types";
import { useStore } from "@/lib/store";
import { Trophy, Lock } from "lucide-react";

const ESSENCE_REWARD_PER_ACHIEVEMENT = 25;
// Achievement catalog entries here do not include points. When points are introduced, map points -> essence 1:1.

export function AchievementShelf() {
  const achievements = useStore((s) => s.achievements);
  const applyReward = useStore((s) => s.applyReward);
  const awardedIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const awardedIds = awardedIdsRef.current;
    if (!initializedRef.current) {
      achievements.forEach((entry) => awardedIds.add(entry.id));
      initializedRef.current = true;
      return;
    }
    const newlyUnlocked = achievements.filter(
      (entry) => !awardedIds.has(entry.id),
    );

    if (newlyUnlocked.length > 0) {
      const essenceDelta =
        newlyUnlocked.length * ESSENCE_REWARD_PER_ACHIEVEMENT;
      applyReward({ essenceDelta, source: "achievement" });
      newlyUnlocked.forEach((entry) => awardedIds.add(entry.id));

      const firstName =
        ACHIEVEMENT_CATALOG.find((c) => c.id === newlyUnlocked[0].id)?.title ??
        "Achievement";
      const extra =
        newlyUnlocked.length > 1 ? ` (+${newlyUnlocked.length - 1} more)` : "";
      setToast(`${firstName}${extra} unlocked! +${essenceDelta} Essence`);
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [achievements, applyReward]);

  return (
    <div className="space-y-4">
      {/* Achievement unlock toast */}
      {toast && (
        <div className="fixed top-6 inset-x-4 z-[200] flex justify-center pointer-events-none">
          <div className="animate-toast-in flex items-center gap-2 rounded-2xl border border-amber-500/50 bg-amber-950/95 px-4 py-3 shadow-2xl text-sm font-medium text-amber-100 max-w-sm">
            <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
            {toast}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-[26px] border border-amber-400/15 bg-amber-400/6 p-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-amber-200/75">
            Milestones
          </p>
          <h2 className="mt-2 flex items-center gap-2 text-xl font-semibold text-white">
            <Trophy className="h-5 w-5 text-amber-300" />
            Achievements
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-300">
            Progress rewards genuine care, exploration, and scientific curiosity
            across the companion experience.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-zinc-200">
          <span className="font-semibold text-white">
            {achievements.length}/{ACHIEVEMENT_CATALOG.length}
          </span>{" "}
          unlocked
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {ACHIEVEMENT_CATALOG.map((item) => {
          const earned = achievements.find((a) => a.id === item.id);
          return (
            <div
              key={item.id}
              className={`rounded-[24px] border p-5 transition ${
                earned
                  ? "border-amber-400/40 bg-[linear-gradient(180deg,rgba(251,191,36,0.14),rgba(255,255,255,0.04))] shadow-lg shadow-amber-500/10"
                  : "border-white/10 bg-white/5 text-zinc-400"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  {earned ? (
                    <Trophy className="w-4 h-4 text-amber-300" />
                  ) : (
                    <Lock className="w-4 h-4 text-zinc-500" />
                  )}
                  {item.title}
                </div>
                <span
                  className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${earned ? "border-amber-400/30 bg-amber-400/10 text-amber-100" : "border-white/10 bg-white/5 text-zinc-500"}`}
                >
                  {earned ? "Unlocked" : "Locked"}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-zinc-300">
                {item.description}
              </p>
              {earned && earned.earnedAt && (
                <p className="mt-3 rounded-2xl border border-white/10 bg-white/6 px-3 py-2 text-xs text-amber-100">
                  Earned {new Date(earned.earnedAt).toLocaleString()}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
