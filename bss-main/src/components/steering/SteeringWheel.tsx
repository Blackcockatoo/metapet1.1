'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import {
  R as SEED_RED,
  K as SEED_BLACK,
  B as SEED_BLUE,
} from '@/lib/qr-messaging/crypto';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { CopyLinkButton } from '@/components/CopyLinkButton';
import { CompassNav } from './CompassNav';
import { NetworkView } from './NetworkView';
import { GeometryView } from './GeometryView';
import { WheelModeSelector } from './WheelModeSelector';
import type { SteeringMode, SteeringColor, DataSource, SteeringViewProps } from './types';
import { NAVIGATION_TARGETS } from './types';
import { getPacketHashParam } from '@/lib/moss60/packetIcons';

// MossPrimeSeed canonical strings (from the original calculator)
const SEED_STRINGS = {
  red: SEED_RED.join(''),
  blue: SEED_BLUE.join(''),
  black: SEED_BLACK.join(''),
};

export function SteeringWheel() {
  const router = useRouter();
  const genome = useStore(state => state.genome);

  const [mode, setMode] = useState<SteeringMode>('compass');
  const [color, setColor] = useState<SteeringColor>('red');
  const [dataSource, setDataSource] = useState<DataSource>('seed');
  const [selectedFeature, setSelectedFeature] = useState(0);

  const hasGenome = genome !== null;

  // Build number strings from either seed or live genome
  const numberStrings = useMemo(() => {
    if (dataSource === 'pet' && genome) {
      return {
        red: genome.red60.join(''),
        blue: genome.blue60.join(''),
        black: genome.black60.join(''),
      };
    }
    return SEED_STRINGS;
  }, [dataSource, genome]);

  const handleFeatureSelect = useCallback((position: number) => {
    setSelectedFeature(position);
  }, []);

  const handleFeatureActivate = useCallback((position: number) => {
    setSelectedFeature(position);
    const target = NAVIGATION_TARGETS[position];
    if (target) {
      if (target.route === '/strand-packets') {
        const anchor = color === 'red' ? '#red60-packet' : color === 'blue' ? '#blue60-packet' : '#black60-packet';
        router.push(`${target.route}${anchor}`);
        return;
      }
      if (target.route.startsWith('http')) {
        window.location.href = target.route;
        return;
      }
      router.push(target.route);
    }
  }, [color, router]);

  // Shared props for all views
  const viewProps: SteeringViewProps = {
    color,
    numberStrings,
    selectedFeature,
    onFeatureSelect: handleFeatureSelect,
    onFeatureActivate: handleFeatureActivate,
  };

  const selectedTarget = NAVIGATION_TARGETS[selectedFeature];
  const showStrandPacketsNote = mode === 'network' || selectedTarget?.route === '/strand-packets';
  const activePacketHash = color === 'red' ? 'red60-packet' : color === 'blue' ? 'blue60-packet' : 'black60-packet';
  const activePacketChamber = numberStrings[color].slice(0, 5);

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-2xl mx-auto">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-zinc-100">Navigator</h1>
        <p className="text-sm text-zinc-300 mt-1">
          Explore the MOSS60 universe
        </p>
      </div>

      <WheelModeSelector
        mode={mode}
        onModeChange={setMode}
        color={color}
        onColorChange={setColor}
        dataSource={dataSource}
        onDataSourceChange={setDataSource}
        hasGenome={hasGenome}
      />

      {mode === 'compass' && <CompassNav {...viewProps} />}
      {mode === 'network' && <NetworkView {...viewProps} />}
      {mode === 'geometry' && <GeometryView {...viewProps} />}

      {selectedTarget && (
        <div className="w-full max-w-lg flex items-center justify-between rounded-lg border border-zinc-600 bg-zinc-900/80 px-4 py-2">
          <span className="text-sm font-medium text-zinc-200">{selectedTarget.label}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-300 font-mono">{selectedTarget.route}</span>
            {selectedTarget.route === '/strand-packets' ? (
              <>
                <Link
                  href={`/strand-packets?${getPacketHashParam(color)}=${activePacketChamber}#${activePacketHash}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open
                </Link>
                <CopyLinkButton
                  getUrl={() => {
                    const url = new URL('/strand-packets', window.location.origin);
                    url.hash = activePacketHash;
                    url.searchParams.set(getPacketHashParam(color), activePacketChamber);
                    return url.toString();
                  }}
                  idleLabel="Copy"
                  copiedLabel="Copied"
                  announceLabel={`${color} packet deep link copied`}
                  toastDetail={`Chamber seed ${activePacketChamber}`}
                  className="border-slate-700 text-slate-200 hover:border-slate-500 hover:text-white"
                />
              </>
            ) : null}
          </div>
        </div>
      )}

      <div className="w-full max-w-lg rounded-lg border border-slate-700 bg-slate-950/70 p-3">
        <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Packet legend</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-100">
            <span className="font-semibold">Red</span> {'->'} <span className="font-mono">#red60-packet</span>
          </div>
          <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-100">
            <span className="font-semibold">Blue</span> {'->'} <span className="font-mono">#blue60-packet</span>
          </div>
          <div className="rounded-lg border border-slate-500/30 bg-slate-500/10 px-3 py-2 text-xs text-slate-100">
            <span className="font-semibold">Black</span> {'->'} <span className="font-mono">#black60-packet</span>
          </div>
        </div>
      </div>

      {showStrandPacketsNote && (
        <div className="w-full max-w-lg rounded-lg border border-cyan-500/30 bg-cyan-950/30 p-3 text-center">
          <p className="text-xs text-cyan-200">
            <span className="font-semibold">Strand Packets:</span> Selecting this node opens the triad packet page and jumps directly to the {color} anchor for the active steering color.
          </p>
        </div>
      )}

      {/* Sequence info footer */}
      <div className="p-3 bg-zinc-900 rounded-lg max-w-lg text-center border border-zinc-700/70">
        <p className="text-xs text-zinc-200 font-mono truncate">
          {numberStrings[color].substring(0, 40)}...
        </p>
        <p className="text-xs text-zinc-400 mt-1">
          {dataSource === 'seed' ? 'MossPrimeSeed' : 'Pet Genome'} &middot; {color} &middot; 60-digit base-{dataSource === 'seed' ? '10' : '7'}
        </p>
      </div>
    </div>
  );
}
