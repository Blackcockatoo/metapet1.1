"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { StrandPacketDeck } from '@/components/StrandPacketDeck';
import { StrandPacketPanel } from '@/components/StrandPacketPanel';
import { Blue60Packet } from '@/components/time-calculator/Blue60Packet';
import { PacketIcon } from '@/lib/moss60/packetIcons';
import { FULL_STRAND_PACKETS } from '@/lib/moss60/strandPackets';

type PacketSectionId = 'red60-packet' | 'blue60-packet' | 'black60-packet';

const DEFAULT_TARGETS = {
  'red60-packet': 'Chamber 12 - 11303',
  'blue60-packet': 'Chamber 12 - 01277',
  'black60-packet': 'Chamber 12 - 01123',
} as const;

export default function StrandPacketsPage() {
  const [activeSection, setActiveSection] = useState<PacketSectionId>('red60-packet');
  const [copyTargets, setCopyTargets] = useState<Record<PacketSectionId, string>>(DEFAULT_TARGETS);
  const [activeChamberNames, setActiveChamberNames] = useState<Record<PacketSectionId, string>>({
    'red60-packet': FULL_STRAND_PACKETS.red.chambers[0]?.name ?? 'Red-60',
    'blue60-packet': FULL_STRAND_PACKETS.blue.chambers[0]?.name ?? 'Blue-60',
    'black60-packet': FULL_STRAND_PACKETS.black.chambers[0]?.name ?? 'Black-60',
  });

  useEffect(() => {
    const sectionIds: PacketSectionId[] = ['red60-packet', 'blue60-packet', 'black60-packet'];
    const observers = sectionIds
      .map((id) => {
        const element = document.getElementById(id);
        if (!element) return null;

        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                setActiveSection(id);
              }
            });
          },
          { rootMargin: '-25% 0px -55% 0px', threshold: 0.2 },
        );

        observer.observe(element);
        return observer;
      })
      .filter(Boolean) as IntersectionObserver[];

    const syncHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'red60-packet' || hash === 'blue60-packet' || hash === 'black60-packet') {
        setActiveSection(hash);
      }
    };

    syncHash();
    window.addEventListener('hashchange', syncHash);

    const syncChamberDetail = (event: Event) => {
      const detail = (event as CustomEvent<{ sectionId: PacketSectionId; chamber: { positionLabel: string; pentad: string; name: string } }>).detail;
      if (!detail?.sectionId || !detail?.chamber) return;
      setCopyTargets((current) => ({
        ...current,
        [detail.sectionId]: `Chamber ${detail.chamber.positionLabel} - ${detail.chamber.pentad}`,
      }));
      setActiveChamberNames((current) => ({
        ...current,
        [detail.sectionId]: detail.chamber.name,
      }));
    };

    window.addEventListener('strand-packet-chamber-change', syncChamberDetail as EventListener);

    return () => {
      observers.forEach((observer) => observer.disconnect());
      window.removeEventListener('hashchange', syncHash);
      window.removeEventListener('strand-packet-chamber-change', syncChamberDetail as EventListener);
    };
  }, []);

  useEffect(() => {
    const nextHash = `#${activeSection}`;
    if (window.location.hash !== nextHash) {
      const { scrollX, scrollY } = window;
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${nextHash}`);
      window.scrollTo(scrollX, scrollY);
    }
  }, [activeSection]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.title = `Strand Packets - ${activeChamberNames[activeSection]}`;
    return () => {
      document.title = 'Strand Packets';
    };
  }, [activeChamberNames, activeSection]);

  const navClassName = (id: PacketSectionId, base: string, active: string) =>
    `inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${activeSection === id ? active : base}`;

  const handleNavSelect = (id: PacketSectionId) => {
    setActiveSection(id);
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(30,41,59,0.92),rgba(2,6,23,1)_58%)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.34em] text-sky-200/70">Moss-60 triad</p>
            <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">Strand Packets</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
              A dedicated triad page for the red, blue, and black packet system. Blue-60 is live now; red and black scaffolds are in place for the next packet expansions.
            </p>
          </div>
          <Link
            href="/"
            className="rounded-full border border-slate-700 bg-slate-950/60 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-sky-400/60 hover:text-white"
          >
            Back to pet
          </Link>
        </div>

        <section className="rounded-3xl border border-slate-800 bg-slate-950/45 p-4 sm:p-6">
          <div className="mb-5">
            <p className="text-[11px] uppercase tracking-[0.28em] text-zinc-500">Packet overview</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Current triad status</h2>
          </div>
          <StrandPacketDeck showPageLink={false} />
        </section>

        <nav className="sticky top-4 z-20 rounded-2xl border border-slate-800 bg-slate-950/85 p-3 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-zinc-500">Packet nav</p>
              <p className="text-sm text-slate-300">Jump between the three strand anchors.</p>
              <p className="mt-1 text-xs text-slate-500">Visible copy target: {copyTargets[activeSection]}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="#red60-packet" onClick={() => handleNavSelect('red60-packet')} onFocus={() => handleNavSelect('red60-packet')} className={navClassName('red60-packet', 'border-red-500/40 bg-red-500/10 text-red-200 hover:border-red-300 hover:text-red-100', 'border-red-300 bg-red-500/25 text-red-50 shadow-[0_0_24px_rgba(239,68,68,0.2)]')}><PacketIcon packet="red" className="h-3.5 w-3.5 shrink-0" /><span className="flex flex-col items-start leading-tight"><span className="hidden min-[420px]:inline">Red-60</span><span className="min-[420px]:hidden">Red</span><span className="hidden text-[10px] opacity-80 min-[420px]:inline">{copyTargets['red60-packet']}</span></span></Link>
              <Link href="#blue60-packet" onClick={() => handleNavSelect('blue60-packet')} onFocus={() => handleNavSelect('blue60-packet')} className={navClassName('blue60-packet', 'border-sky-500/40 bg-sky-500/10 text-sky-200 hover:border-sky-300 hover:text-sky-100', 'border-sky-300 bg-sky-500/25 text-sky-50 shadow-[0_0_24px_rgba(14,165,233,0.22)]')}><PacketIcon packet="blue" className="h-3.5 w-3.5 shrink-0" /><span className="flex flex-col items-start leading-tight"><span className="hidden min-[420px]:inline">Blue-60</span><span className="min-[420px]:hidden">Blue</span><span className="hidden text-[10px] opacity-80 min-[420px]:inline">{copyTargets['blue60-packet']}</span></span></Link>
              <Link href="#black60-packet" onClick={() => handleNavSelect('black60-packet')} onFocus={() => handleNavSelect('black60-packet')} className={navClassName('black60-packet', 'border-slate-500/40 bg-slate-500/10 text-slate-200 hover:border-slate-300 hover:text-white', 'border-slate-300 bg-slate-500/25 text-white shadow-[0_0_24px_rgba(148,163,184,0.18)]')}><PacketIcon packet="black" className="h-3.5 w-3.5 shrink-0" /><span className="flex flex-col items-start leading-tight"><span className="hidden min-[420px]:inline">Black-60</span><span className="min-[420px]:hidden">Black</span><span className="hidden text-[10px] opacity-80 min-[420px]:inline">{copyTargets['black60-packet']}</span></span></Link>
            </div>
          </div>
        </nav>

        <section className="scroll-mt-20">
          <StrandPacketPanel packet={FULL_STRAND_PACKETS.red} sectionId="red60-packet" />
        </section>

        <section className="scroll-mt-20">
          <Blue60Packet sectionId="blue60-packet" />
        </section>

        <section className="scroll-mt-20">
          <StrandPacketPanel packet={FULL_STRAND_PACKETS.black} sectionId="black60-packet" />
        </section>
      </div>
    </main>
  );
}
