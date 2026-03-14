'use client';

import Link from 'next/link';
import { Copy } from 'lucide-react';

import { CopyLinkButton } from '@/components/CopyLinkButton';
import { PacketIcon, getPacketIconColorClass } from '@/lib/moss60/packetIcons';
import { STRAND_PACKET_SCAFFOLDS } from '@/lib/moss60/strandPackets';

interface StrandPacketDeckProps {
  readonly activeBlueMatch?: boolean;
  readonly onOpenBluePacket?: () => void;
  readonly showPageLink?: boolean;
  readonly hashLinks?: boolean;
}

export function StrandPacketDeck({
  activeBlueMatch = false,
  onOpenBluePacket,
  showPageLink = false,
  hashLinks = false,
}: StrandPacketDeckProps) {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {Object.values(STRAND_PACKET_SCAFFOLDS).map(packet => {
        const isBlue = packet.key === 'blue';

        return (
          <article
            key={packet.key}
            className="rounded-xl border bg-slate-950/60 p-4"
            style={{
              borderColor: `${packet.accent}55`,
              boxShadow: isBlue && activeBlueMatch ? `0 0 28px ${packet.accent}22` : undefined,
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">{packet.key} strand</p>
                <h3 className="mt-2 inline-flex items-center gap-2 text-base font-semibold text-white"><PacketIcon packet={packet.key} className={`h-4 w-4 ${getPacketIconColorClass(packet.key)}`} />{packet.label}</h3>
              </div>
              <span
                className="rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]"
                style={{
                  borderColor: `${packet.accent}66`,
                  color: packet.accent,
                  backgroundColor: `${packet.accent}12`,
                }}
              >
                {packet.status === 'full' ? 'Live' : 'Coming soon'}
              </span>
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-300">{packet.summary}</p>

            <div className="mt-4 rounded-lg border border-slate-800 bg-black/20 p-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Strand</div>
              <div className="mt-2 break-all font-mono text-xs text-slate-300">{packet.strand}</div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {isBlue ? (
                <>
                  {onOpenBluePacket ? (
                    <button
                      type="button"
                      onClick={onOpenBluePacket}
                      className="rounded-full border px-3 py-1.5 text-xs font-semibold transition"
                      style={{
                        borderColor: `${packet.accent}66`,
                        color: '#dbeafe',
                        backgroundColor: `${packet.accent}18`,
                      }}
                    >
                      <PacketIcon packet={packet.key} className={`h-4 w-4 ${getPacketIconColorClass(packet.key)}`} /><span>Open packet</span>
                    </button>
                  ) : null}
                  {showPageLink ? (
                    <>
                      <Link
                        href={hashLinks ? `/strand-packets#${packet.key}60-packet` : '/strand-packets'}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        View triad page
                      </Link>
                      <CopyLinkButton
                        getUrl={() => `${window.location.origin}/strand-packets#${packet.key}60-packet`}
                        announceLabel={`${packet.label} link copied`}
                        toastDetail={`${packet.key.toUpperCase()} packet anchor ready to share`}
                        className="border-slate-700 text-slate-200 hover:border-slate-500 hover:text-white"
                      />
                    </>
                  ) : null}
                </>
              ) : (
                <>
                  <span className="rounded-full border border-slate-800 px-3 py-1.5 text-xs text-zinc-400">
                    Scaffold ready for packet buildout
                  </span>
                  {showPageLink ? (
                    <>
                      <Link
                        href={hashLinks ? `/strand-packets#${packet.key}60-packet` : '/strand-packets'}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
                      >
                        <PacketIcon packet={packet.key} className={`h-4 w-4 ${getPacketIconColorClass(packet.key)}`} />
                        View packet
                      </Link>
                      <CopyLinkButton
                        getUrl={() => `${window.location.origin}/strand-packets#${packet.key}60-packet`}
                        announceLabel={`${packet.label} link copied`}
                        toastDetail={`${packet.key.toUpperCase()} packet anchor ready to share`}
                        className="border-slate-700 text-slate-200 hover:border-slate-500 hover:text-white"
                      />
                    </>
                  ) : null}
                </>
              )}
            </div>

            {isBlue && activeBlueMatch ? (
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-200/80">
                Active genome match
              </p>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
