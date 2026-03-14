'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VimanaMap } from './VimanaMap';
import { VimanaTetris } from './VimanaTetris';
import { BattleArena } from './BattleArena';
import { MiniGamesPanel } from './MiniGamesPanel';
import { CosmeticsPanel } from './CosmeticsPanel';
import { AchievementsPanel } from './AchievementsPanel';
import { PatternRecognitionGame } from './PatternRecognitionGame';
import { Moss60Hub } from './Moss60Hub';
import { useStore } from '@/lib/store';
import { Map, Swords, Gamepad2, Sparkles, Trophy, Shield, ChevronDown, ChevronUp, Zap } from 'lucide-react';

export function FeaturesDashboard() {
  const [activeTab, setActiveTab] = useState('vimana');
  const [fieldChallengeOpen, setFieldChallengeOpen] = useState(false);

  const vimana = useStore(s => s.vimana);
  const miniGames = useStore(s => s.miniGames);

  const discoveredCount = vimana.cells.filter(c => c.discovered).length;
  const totalCells = vimana.cells.length;
  const anomalyCount = vimana.cells.filter(c => c.anomaly && c.discovered).length;
  const resolvedCount = vimana.anomaliesResolved ?? 0;

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6 mb-6 h-auto">
          <TabsTrigger value="vimana" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 touch-manipulation">
            <Map className="w-5 h-5 sm:w-4 sm:h-4" />
            <span className="text-[10px] sm:text-sm">Explore</span>
          </TabsTrigger>
          <TabsTrigger value="battle" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 touch-manipulation">
            <Swords className="w-5 h-5 sm:w-4 sm:h-4" />
            <span className="text-[10px] sm:text-sm">Battle</span>
          </TabsTrigger>
          <TabsTrigger value="games" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 touch-manipulation">
            <Gamepad2 className="w-5 h-5 sm:w-4 sm:h-4" />
            <span className="text-[10px] sm:text-sm">Games</span>
          </TabsTrigger>
          <TabsTrigger value="cosmetics" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 touch-manipulation">
            <Sparkles className="w-5 h-5 sm:w-4 sm:h-4" />
            <span className="text-[10px] sm:text-sm">Style</span>
          </TabsTrigger>
          <TabsTrigger value="achievements" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 touch-manipulation">
            <Trophy className="w-5 h-5 sm:w-4 sm:h-4" />
            <span className="text-[10px] sm:text-sm">Rewards</span>
          </TabsTrigger>
          <TabsTrigger value="moss60" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 touch-manipulation">
            <Shield className="w-5 h-5 sm:w-4 sm:h-4" />
            <span className="text-[10px] sm:text-sm">MOSS60</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vimana" className="mt-0">
          <div className="space-y-3">
            {/* Field Intel bar */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Scans', value: vimana.scansPerformed, color: 'text-cyan-300' },
                { label: 'Discovered', value: `${discoveredCount}/${totalCells}`, color: 'text-emerald-300' },
                { label: 'Anomalies', value: anomalyCount, color: 'text-amber-300' },
                { label: 'Resolved', value: resolvedCount, color: 'text-purple-300' },
              ].map(stat => (
                <div key={stat.label} className="rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-center">
                  <p className={`text-base font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-[10px] uppercase tracking-wide text-zinc-500 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Map */}
            <div className="bg-zinc-900/80 backdrop-blur rounded-xl p-3 sm:p-6 border border-zinc-800">
              <VimanaMap />
            </div>

            {/* Field Challenge (Vimana Tetris) */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
              <button
                type="button"
                onClick={() => setFieldChallengeOpen(o => !o)}
                className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-zinc-100 hover:bg-zinc-800/60 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Field Challenge — Vimana Tetris
                  {miniGames.vimanaHighScore > 0 && (
                    <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                      Best {miniGames.vimanaHighScore.toLocaleString()}
                    </span>
                  )}
                </span>
                {fieldChallengeOpen
                  ? <ChevronUp className="w-4 h-4 text-zinc-500" />
                  : <ChevronDown className="w-4 h-4 text-zinc-500" />}
              </button>
              {fieldChallengeOpen && (
                <div className="border-t border-zinc-800 p-3">
                  <VimanaTetris />
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="battle" className="mt-0">
          <div className="bg-zinc-900/80 backdrop-blur rounded-xl p-3 sm:p-6 border border-zinc-800">
            <BattleArena />
          </div>
        </TabsContent>

        <TabsContent value="games" className="mt-0">
          <div className="bg-zinc-900/80 backdrop-blur rounded-xl p-3 sm:p-6 border border-zinc-800">
            <div className="space-y-6">
              <MiniGamesPanel />

              <div className="border-t border-zinc-700 pt-6">
                <PatternRecognitionGame />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="cosmetics" className="mt-0">
          <div className="bg-zinc-900/80 backdrop-blur rounded-xl p-3 sm:p-6 border border-zinc-800">
            <CosmeticsPanel />
          </div>
        </TabsContent>

        <TabsContent value="achievements" className="mt-0">
          <div className="bg-zinc-900/80 backdrop-blur rounded-xl p-3 sm:p-6 border border-zinc-800">
            <AchievementsPanel />
          </div>
        </TabsContent>

        <TabsContent value="moss60" className="mt-0">
          <div className="bg-zinc-900/80 backdrop-blur rounded-xl p-3 sm:p-6 border border-zinc-800">
            <Moss60Hub />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
