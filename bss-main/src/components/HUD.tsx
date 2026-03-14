'use client';

import { useStore } from '@/lib/store';
import { getMetaPetMoodThemeFromVitals } from '@/lib/metapetMoodSvgs';
import { UtensilsCrossed, Sparkles, Droplets, Zap } from 'lucide-react';
import { Button } from './ui/button';

type HUDMode = 'full' | 'simple';

interface HUDProps {
  mode?: HUDMode;
}

export function HUD({ mode = 'full' }: HUDProps) {
  const vitals = useStore(state => state.vitals);
  const feed = useStore(state => state.feed);
  const clean = useStore(state => state.clean);
  const play = useStore(state => state.play);
  const sleep = useStore(state => state.sleep);
  const moodTheme = getMetaPetMoodThemeFromVitals(vitals);

  const statBars = [
    {
      label: 'Hunger',
      value: vitals.hunger,
      icon: <UtensilsCrossed className="w-4 h-4" />,
      colorStops: [moodTheme.stage.particleColors[2], moodTheme.stage.ring],
    },
    {
      label: 'Hygiene',
      value: vitals.hygiene,
      icon: <Droplets className="w-4 h-4" />,
      colorStops: [moodTheme.stage.particleColors[1], moodTheme.stage.eyeSecondary],
    },
    {
      label: 'Mood',
      value: vitals.mood,
      icon: <Sparkles className="w-4 h-4" />,
      colorStops: [moodTheme.stage.ring, moodTheme.stage.eyeIris],
    },
    {
      label: 'Energy',
      value: vitals.energy,
      icon: <Zap className="w-4 h-4" />,
      colorStops: [moodTheme.stage.eyeSecondary, moodTheme.stage.particleColors[0]],
    },
  ];

  return (
    <div
      className="space-y-6 rounded-2xl p-3"
      style={{
        background: `linear-gradient(145deg, rgba(2,6,23,0.42), ${moodTheme.stage.haze})`,
        boxShadow: `inset 0 0 0 1px ${moodTheme.stage.frame}`,
      }}
    >
      <div className="space-y-3">
        {statBars.slice(0, mode === 'simple' ? 3 : 4).map((stat) => (
          <StatBar
            key={stat.label}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            colorStops={stat.colorStops}
            accentColor={moodTheme.stage.ring}
          />
        ))}
      </div>

      <div className="grid grid-cols-4 gap-2">
        <Button
          onClick={feed}
          title="Nourish your companion — consistent feeding builds trust and supports growth"
          className="gap-1.5 text-white border-0 shadow-lg"
          style={{ background: `linear-gradient(135deg, ${moodTheme.stage.ring}, ${moodTheme.stage.glow})` }}
        >
          <UtensilsCrossed className="w-4 h-4" />
          Feed
        </Button>
        <Button
          onClick={clean}
          title="Keep things tidy — hygiene affects mood and overall wellbeing"
          className="gap-1.5 text-white border-0 shadow-lg"
          style={{ background: `linear-gradient(135deg, ${moodTheme.stage.glow}, ${moodTheme.stage.ring})` }}
        >
          <Droplets className="w-4 h-4" />
          Clean
        </Button>
        <Button
          onClick={play}
          title="Play lifts mood and strengthens your bond — happy companions evolve faster"
          className="gap-1.5 text-white border-0 shadow-lg"
          style={{ background: `linear-gradient(135deg, ${moodTheme.stage.ring}, ${moodTheme.stage.haze})` }}
        >
          <Sparkles className="w-4 h-4" />
          Play
        </Button>
        <Button
          onClick={sleep}
          title="Rest restores energy — every living thing needs downtime to grow"
          className="gap-1.5 text-white border-0 shadow-lg"
          style={{ background: `linear-gradient(135deg, ${moodTheme.stage.haze}, ${moodTheme.stage.ring})` }}
        >
          <Zap className="w-4 h-4" />
          Sleep
        </Button>
      </div>
    </div>
  );
}

export function HUDAdvancedStats() {
  const ritualProgress = useStore(state => state.ritualProgress);
  const essence = useStore(state => state.essence);
  const lastRewardSource = useStore(state => state.lastRewardSource);
  const lastRewardAmount = useStore(state => state.lastRewardAmount);

  const rewardSourceLabel = lastRewardSource ?? '—';
  const rewardAmountLabel = `+${Math.max(0, Math.round(lastRewardAmount))}`;
  const mobileRewardLabel = `Essence ${rewardAmountLabel} (${rewardSourceLabel})`;

  return (
    <div className="space-y-3">
      <p className="text-[10px] text-zinc-600 leading-relaxed">
        Resonance and Nectar are earned through daily rituals. Essence is your lifetime care score — it grows with every genuine interaction and can never be bought.
      </p>
      <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2">
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-wide text-zinc-500">Resonance</div>
          <div className="text-cyan-300 font-mono text-sm">{ritualProgress.resonance}</div>
        </div>
        <div className="space-y-1 text-right">
          <div className="text-[10px] uppercase tracking-wide text-zinc-500">Nectar</div>
          <div className="text-amber-300 font-mono text-sm">{ritualProgress.nectar}</div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-wide text-zinc-500">Essence</div>
            <div className="text-emerald-300 font-mono text-sm">{essence}</div>
          </div>
          <div className="hidden text-right sm:block">
            <div className="text-[10px] uppercase tracking-wide text-zinc-500">Last reward</div>
            <div className="text-xs font-medium text-zinc-300">
              {rewardAmountLabel} ({rewardSourceLabel})
            </div>
          </div>
          <div className="text-xs text-zinc-300 sm:hidden">{mobileRewardLabel}</div>
        </div>
      </div>
    </div>
  );
}

interface StatBarProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  colorStops: [string, string];
  accentColor: string;
}

function getHealthState(value: number): { barColor: string; statusLabel: string; statusColor: string; pulse: boolean } {
  if (value >= 70) return { barColor: 'from-emerald-500 to-green-400',  statusLabel: 'Thriving',   statusColor: 'text-emerald-400', pulse: false };
  if (value >= 40) return { barColor: 'from-amber-400 to-yellow-400',   statusLabel: 'Steady',     statusColor: 'text-amber-400',   pulse: false };
  if (value >= 20) return { barColor: 'from-orange-500 to-amber-500',   statusLabel: 'Needs care', statusColor: 'text-orange-400',  pulse: false };
  return              { barColor: 'from-red-600 to-red-400',           statusLabel: 'Critical!',  statusColor: 'text-red-400',     pulse: true  };
}

function StatBar({ label, value, icon, colorStops, accentColor }: StatBarProps) {
  const { statusLabel, statusColor, pulse } = getHealthState(value);
  return (
    <div>
      <div className="flex items-center justify-between mb-1 text-sm">
        <div className="flex items-center gap-2 text-zinc-300">
          {icon}
          <span>{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-medium ${statusColor}${pulse ? ' animate-pulse' : ''}`}>
            {statusLabel}
          </span>
          <span className="font-bold text-white tabular-nums">
            {Math.round(value)}%
          </span>
        </div>
      </div>
      <div className="h-3 bg-zinc-800 rounded-xl overflow-hidden border" style={{ borderColor: `${accentColor}55` }}>
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${value}%`,
            background: `linear-gradient(90deg, ${colorStops[0]} 0%, ${colorStops[1]} 100%)`,
            boxShadow: `0 0 16px ${accentColor}55`,
          }}
        />
      </div>
    </div>
  );
}
