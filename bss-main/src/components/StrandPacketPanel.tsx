'use client';

import { useEffect, useMemo, useState } from 'react';

import { CopyLinkButton } from '@/components/CopyLinkButton';
import { PacketIcon, getPacketHashParam } from '@/lib/moss60/packetIcons';
import type { FullStrandPacket } from '@/lib/moss60/strandPackets';

interface StrandPacketPanelProps {
  readonly packet: FullStrandPacket;
  readonly compact?: boolean;
  readonly sectionId?: string;
  readonly persistKey?: string;
}

export function StrandPacketPanel({ packet, compact = false, sectionId, persistKey }: StrandPacketPanelProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const activeChamber = packet.chambers[activeIndex];
  const chamberCount = packet.chambers.length;
  const chamberParamKey = getPacketHashParam(persistKey ?? packet.key);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncChamberFromUrl = () => {
      if (sectionId && window.location.hash && window.location.hash !== `#${sectionId}`) return;
      const chamber = new URLSearchParams(window.location.search).get(chamberParamKey);
      if (!chamber) return;
      const nextIndex = packet.chambers.findIndex((entry) => entry.pentad === chamber);
      if (nextIndex >= 0) {
        setActiveIndex(nextIndex);
      }
    };

    syncChamberFromUrl();
    window.addEventListener('hashchange', syncChamberFromUrl);
    window.addEventListener('popstate', syncChamberFromUrl);

    return () => {
      window.removeEventListener('hashchange', syncChamberFromUrl);
      window.removeEventListener('popstate', syncChamberFromUrl);
    };
  }, [chamberParamKey, packet.chambers, sectionId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sectionId && window.location.hash && window.location.hash !== `#${sectionId}`) return;

    const url = new URL(window.location.href);
    if (sectionId) {
      url.hash = sectionId;
    }
    url.searchParams.set(chamberParamKey, activeChamber.pentad);
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    window.dispatchEvent(new CustomEvent('strand-packet-chamber-change', {
      detail: {
        sectionId: sectionId ?? `${packet.key}60-packet`,
        packetKey: packet.key,
        chamber: {
          positionLabel: activeChamber.positionLabel,
          pentad: activeChamber.pentad,
          name: activeChamber.name,
        },
      },
    }));
  }, [activeChamber.name, activeChamber.pentad, activeChamber.positionLabel, chamberParamKey, packet.key, sectionId]);

  const wheelGeometry = useMemo(() => {
    const center = 210;
    const outerRadius = 170;
    const innerRadius = 104;
    const labelRadius = 138;

    const polar = (radius: number, angle: number) => ({
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius,
    });

    const sectorPath = (index: number) => {
      const startAngle = -Math.PI / 2 + (index * Math.PI * 2) / chamberCount;
      const endAngle = -Math.PI / 2 + ((index + 1) * Math.PI * 2) / chamberCount;
      const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;
      const p1 = polar(outerRadius, startAngle);
      const p2 = polar(outerRadius, endAngle);
      const p3 = polar(innerRadius, endAngle);
      const p4 = polar(innerRadius, startAngle);

      return `M ${p1.x} ${p1.y} A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${p4.x} ${p4.y} Z`;
    };

    return packet.chambers.map((chamber, index) => {
      const angle = -Math.PI / 2 + ((index + 0.5) * Math.PI * 2) / chamberCount;
      return {
        chamber,
        path: sectorPath(index),
        labelPoint: polar(labelRadius, angle),
        spokePoint: polar(outerRadius + 10, angle),
      };
    });
  }, [chamberCount, packet.chambers]);

  const renderIllustration = () => {
    if (packet.key === 'red') {
      return (
        <svg viewBox="0 0 180 120" className="h-24 w-36 transition-transform duration-700 ease-out group-hover:scale-105 group-hover:-rotate-1 motion-safe:animate-[packetFloat_5s_ease-in-out_infinite] motion-reduce:transform-none motion-reduce:transition-none" aria-hidden="true">
          <defs>
            <linearGradient id="red-packet-crest" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F97316" />
              <stop offset="100%" stopColor="#B91C1C" />
            </linearGradient>
          </defs>
          <circle cx="90" cy="60" r="50" fill="rgba(249,115,22,0.16)" />
          <path d="M32 84 L64 34 L86 58 L108 28 L148 82" fill="none" stroke="url(#red-packet-crest)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M55 92 Q89 68 126 92" fill="none" stroke="#FBBF24" strokeWidth="5" strokeLinecap="round" />
          <circle cx="90" cy="58" r="11" fill="#FBBF24" />
        </svg>
      );
    }

    if (packet.key === 'blue') {
      return (
        <svg viewBox="0 0 180 120" className="h-24 w-36 transition-transform duration-700 ease-out group-hover:scale-105 group-hover:rotate-3 motion-safe:animate-[packetFloat_5.4s_ease-in-out_infinite] motion-reduce:transform-none motion-reduce:transition-none" aria-hidden="true">
          <defs>
            <linearGradient id="blue-packet-halo" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1293FF" />
              <stop offset="100%" stopColor="#6157FC" />
            </linearGradient>
          </defs>
          <circle cx="90" cy="60" r="44" fill="none" stroke="url(#blue-packet-halo)" strokeWidth="7" />
          <circle cx="90" cy="60" r="22" fill="rgba(18,147,255,0.18)" stroke="#86B2D7" strokeWidth="3" />
          {Array.from({ length: 12 }).map((_, index) => {
            const angle = (-90 + index * 30) * (Math.PI / 180);
            const x1 = 90 + Math.cos(angle) * 30;
            const y1 = 60 + Math.sin(angle) * 30;
            const x2 = 90 + Math.cos(angle) * 52;
            const y2 = 60 + Math.sin(angle) * 52;
            return <line key={index} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#15B4A2" strokeWidth="2.5" strokeLinecap="round" />;
          })}
          <circle cx="90" cy="60" r="8" fill="#E2E8F0" />
        </svg>
      );
    }

    return (
      <svg viewBox="0 0 180 120" className="h-24 w-36 transition-transform duration-700 ease-out group-hover:scale-105 group-hover:rotate-1 motion-safe:animate-[packetFloat_5.8s_ease-in-out_infinite] motion-reduce:transform-none motion-reduce:transition-none" aria-hidden="true">
        <defs>
          <linearGradient id="black-packet-veil" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#94A3B8" />
            <stop offset="100%" stopColor="#312E81" />
          </linearGradient>
        </defs>
        <ellipse cx="90" cy="62" rx="48" ry="28" fill="rgba(71,85,105,0.18)" stroke="url(#black-packet-veil)" strokeWidth="4" />
        <path d="M48 76 Q90 16 132 76" fill="none" stroke="#64748B" strokeWidth="6" strokeLinecap="round" />
        <path d="M60 78 Q90 42 120 78" fill="none" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" />
        <circle cx="90" cy="62" r="7" fill="#E2E8F0" />
      </svg>
    );
  };

  const renderCenterGlyph = () => {
    const glyphClassName = 'origin-center transition-transform duration-700 ease-out group-hover:scale-110 motion-safe:animate-[packetPulse_3.6s_ease-in-out_infinite] motion-reduce:transform-none motion-reduce:transition-none';
    return <PacketIcon packet={packet.key} className={glyphClassName} size={packet.key === 'black' ? 24 : 26} color={packet.key === 'red' ? '#FBBF24' : '#E2E8F0'} strokeWidth={2.2} />;
  };

  return (
    <section
      id={sectionId}
      className={`${compact ? 'mt-0' : 'mt-8'} group scroll-mt-20 overflow-hidden rounded-[2rem] border text-slate-100 shadow-[0_24px_90px_rgba(6,17,45,0.65)]`}
      style={{
        borderColor: `${packet.coreAnchor}33`,
        background: `radial-gradient(circle at top, ${packet.coreAnchor}47, rgba(2,6,23,0.95) 38%, rgba(2,6,23,1) 100%)`,
      }}
    >
      <style jsx>{`
        @keyframes packetFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        @keyframes packetPulse {
          0%, 100% { transform: scale(1); opacity: 0.92; }
          50% { transform: scale(1.08); opacity: 1; }
        }
      `}</style>
      <div className="border-b px-5 py-5 md:px-7" style={{ borderColor: `${packet.coreAnchor}26`, backgroundColor: 'rgba(2,6,23,0.35)' }}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.34em] text-slate-300/80">{packet.label}</p>
            <h2 className="text-2xl font-semibold text-white md:text-3xl">{packet.profile.speciesClass}</h2>
            <p className="max-w-3xl text-sm leading-6 text-slate-300 md:text-base">{packet.profile.summary}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 lg:justify-end">
            <div className="hidden rounded-2xl border border-white/10 bg-slate-950/35 p-2 md:block">
              {renderIllustration()}
            </div>
            <div className="rounded-2xl border px-4 py-3 text-right" style={{ borderColor: `${packet.coreAnchor}26`, backgroundColor: 'rgba(2,6,23,0.45)' }}>
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Core Anchor</p>
              <div className="mt-2 flex items-center gap-3 lg:justify-end">
                <span className="h-6 w-6 rounded-full border border-white/20" style={{ backgroundColor: packet.coreAnchor }} />
                <span className="font-mono text-sm text-slate-100">{packet.coreAnchor}</span>
              </div>
            </div>
            {sectionId ? (
              <CopyLinkButton
                getUrl={() => {
                  const url = new URL(`${window.location.origin}${window.location.pathname}`);
                  if (sectionId) {
                    url.hash = sectionId;
                  }
                  url.searchParams.set(chamberParamKey, activeChamber.pentad);
                  return url.toString();
                }}
                idleLabel="Copy Link"
                copiedLabel="Link Copied"
                announceLabel={`${packet.label} ${activeChamber.name} link copied`}
                toastDetail={`Chamber ${activeChamber.positionLabel} - ${activeChamber.pentad}`}
                className="px-4 py-2 text-slate-100"
                style={{ borderColor: `${packet.coreAnchor}55`, backgroundColor: `${packet.coreAnchor}1a` }}
              />
            ) : null}
          </div>
        </div>
      </div>

      <div className={`grid gap-6 p-5 md:p-7 ${compact ? '2xl:grid-cols-[1.08fr,0.92fr]' : 'xl:grid-cols-[1.18fr,0.82fr]'}`}>
        <div className="space-y-6">
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/35 p-4 md:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">12-Chamber Crownwheel</p>
                <h3 className="mt-1 text-lg font-semibold text-white">Wheel map for the strand packet</h3>
              </div>
              <div className="rounded-full border border-white/10 bg-slate-950/55 px-3 py-1.5 font-mono text-xs text-slate-300">
                {packet.strand}
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr),280px]">
              <div className="mx-auto w-full max-w-[420px]">
                <svg viewBox="0 0 420 420" className="h-auto w-full">
                  <defs>
                    <radialGradient id={`packet-core-${packet.key}`} cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor={packet.coreAnchor} />
                      <stop offset="58%" stopColor={`${packet.coreAnchor}52`} />
                      <stop offset="100%" stopColor={`${packet.coreAnchor}00`} />
                    </radialGradient>
                  </defs>

                  <circle cx="210" cy="210" r="194" fill={`url(#packet-core-${packet.key})`} opacity="0.65" />
                  <circle cx="210" cy="210" r="176" fill="none" stroke="rgba(215,181,97,0.6)" strokeWidth="1.2" />
                  <circle cx="210" cy="210" r="110" fill="none" stroke="rgba(148,163,184,0.28)" strokeWidth="1" />

                  {wheelGeometry.map(({ chamber, path, labelPoint, spokePoint }, index) => {
                    const active = index === activeIndex;
                    return (
                      <g key={chamber.name}>
                        <path
                          d={path}
                          fill={active ? `${chamber.color}55` : `${chamber.color}22`}
                          stroke={active ? 'rgba(215,181,97,0.95)' : 'rgba(215,181,97,0.26)'}
                          strokeWidth={active ? 2.2 : 1}
                          className="cursor-pointer transition-all duration-300"
                          onClick={() => setActiveIndex(index)}
                        />
                        <line
                          x1="210"
                          y1="210"
                          x2={spokePoint.x}
                          y2={spokePoint.y}
                          stroke={active ? 'rgba(186,230,253,0.7)' : 'rgba(186,230,253,0.16)'}
                          strokeWidth={active ? 1.5 : 1}
                        />
                        <text x={labelPoint.x} y={labelPoint.y - 8} fill="#f8fafc" fontSize="12" fontWeight="700" textAnchor="middle">
                          {chamber.positionLabel}
                        </text>
                        <text x={labelPoint.x} y={labelPoint.y + 8} fill={active ? '#e0f2fe' : '#cbd5e1'} fontSize="10" textAnchor="middle">
                          {chamber.pentad}
                        </text>
                      </g>
                    );
                  })}

                  <circle cx="210" cy="210" r="74" fill="rgba(2,6,23,0.86)" stroke="rgba(215,181,97,0.55)" strokeWidth="1.3" />
                  <foreignObject x="196" y="196" width="28" height="28">
                    <div className="flex h-full w-full items-center justify-center">
                      {renderCenterGlyph()}
                    </div>
                  </foreignObject>
                  <text x="210" y="191" fill="#e2e8f0" fontSize="12" textAnchor="middle">{activeChamber.name}</text>
                  <text x="210" y="230" fill="#ffffff" fontSize="28" fontWeight="700" textAnchor="middle">{activeChamber.pentad}</text>
                  <text x="210" y="250" fill="#7dd3fc" fontSize="11" textAnchor="middle">{activeChamber.positionLabel} o'clock</text>
                </svg>
              </div>

              <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/60 p-4">
                <p className="text-[11px] uppercase tracking-[0.26em] text-slate-400">Active chamber</p>
                <h4 className="mt-2 text-xl font-semibold text-white">{activeChamber.name}</h4>
                <p className="mt-1 font-mono text-sm text-slate-200">{activeChamber.positionLabel} - {activeChamber.pentad}</p>
                <p className="mt-3 text-sm leading-6 text-slate-300">{activeChamber.function}</p>

                <div className="mt-5 rounded-2xl border border-white/10 bg-slate-900/65 p-3">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Clean read</p>
                  <div className="mt-3 space-y-2 text-sm text-slate-300">
                    {packet.profile.cleanRead.map(line => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={`grid gap-6 ${compact ? 'xl:grid-cols-1' : 'xl:grid-cols-[1fr,0.92fr]'}`}>
            <article className="rounded-[1.5rem] border border-white/10 bg-slate-950/35 p-4 md:p-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Structural axes</p>
              <div className="mt-4 grid gap-3">
                {packet.axes.map(axis => (
                  <div key={`${axis.from}-${axis.to}`} className="rounded-2xl border border-slate-800 bg-slate-950/65 p-4">
                    <p className="font-medium text-slate-100">{axis.from} <span className="text-slate-500">&harr;</span> {axis.to}</p>
                    <p className="mt-1 text-sm text-slate-300">{axis.title}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{axis.meaning}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[1.5rem] border border-white/10 bg-slate-950/35 p-4 md:p-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Condensed palette</p>
              <div className="mt-4 grid gap-3">
                {packet.condensedPalette.map(entry => (
                  <div key={entry.name} className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/65 p-3">
                    <span className="h-12 w-12 rounded-2xl border border-white/15" style={{ backgroundColor: entry.hex }} />
                    <div>
                      <p className="text-sm font-medium text-white">{entry.name}</p>
                      <p className="font-mono text-xs text-slate-400">{entry.hex}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-2xl border border-amber-300/10 bg-[linear-gradient(135deg,rgba(215,181,97,0.08),rgba(8,47,73,0.2))] p-4 text-sm leading-6 text-slate-300">
                {packet.profile.styleNote}
              </div>
            </article>
          </div>
        </div>

        <div className="space-y-6">
          <article className="rounded-[1.5rem] border border-white/10 bg-slate-950/35 p-4 md:p-5">
            <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">12-step progression</p>
            <div className="mt-4 space-y-3">
              {packet.palette.map(entry => (
                <div key={entry.name} className="rounded-2xl border border-slate-800 bg-slate-950/65 p-3">
                  <div className="flex items-center gap-3">
                    <span className="h-10 w-10 rounded-xl border border-white/15" style={{ backgroundColor: entry.hex }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-medium text-white">{entry.name}</p>
                        <p className="font-mono text-xs text-slate-200">{entry.hex}</p>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{entry.phase}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[1.5rem] border border-white/10 bg-slate-950/35 p-4 md:p-5">
            <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Genome trait sheet</p>
            <h3 className="mt-2 text-xl font-semibold text-white">{packet.profile.genomeId}</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <KeyStat label="Species class" value={packet.profile.speciesClass} />
              <KeyStat label="Element" value={packet.profile.element} />
              <KeyStat label="Temperament" value={packet.profile.temperament} />
              <KeyStat label="Nature" value={packet.profile.nature} />
            </div>

            <div className="mt-5 space-y-3">
              {packet.stats.map(stat => (
                <div key={stat.label}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.14em] text-slate-400">
                    <span>{stat.label}</span>
                    <span className="font-mono text-slate-200">{stat.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800">
                    <div className="h-full rounded-full" style={{ width: `${stat.value}%`, background: `linear-gradient(90deg, ${packet.condensedPalette[0]?.hex ?? packet.coreAnchor}, ${packet.coreAnchor}, ${packet.condensedPalette[1]?.hex ?? packet.coreAnchor})` }} />
                  </div>
                </div>
              ))}
            </div>

            <PacketList title="Preferred" items={packet.profile.preferred} className="mt-5" />
            <PacketList title="Dislikes" items={packet.profile.dislikes} className="mt-5" />
            <PacketList title="Physical phenotype" items={packet.profile.body} className="mt-5" />
            <PacketList title="Aura" items={packet.profile.aura} className="mt-5" />
            <PacketList title="Signature abilities" items={packet.profile.abilities} className="mt-5" />
            <PacketList title="Weakness profile" items={packet.profile.weaknesses} className="mt-5" />
            <PacketList title="Evolution line" items={packet.profile.evolution} className="mt-5" />

            <div className="mt-5 rounded-2xl border border-white/10 bg-slate-900/70 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Bond style</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{packet.profile.bondStyle}</p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

function KeyStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/65 p-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm leading-6 text-slate-200">{value}</p>
    </div>
  );
}

function PacketList({ title, items, className = '' }: { title: string; items: readonly string[]; className?: string }) {
  return (
    <div className={className}>
      <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map(item => (
          <span key={item} className="rounded-full border border-sky-300/10 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-200">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
