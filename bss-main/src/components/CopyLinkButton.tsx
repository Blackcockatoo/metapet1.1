'use client';

import { useEffect, useId, useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface CopyLinkButtonProps {
  readonly getUrl: () => string;
  readonly idleLabel?: string;
  readonly copiedLabel?: string;
  readonly announceLabel?: string;
  readonly toastDetail?: string;
  readonly className?: string;
  readonly style?: React.CSSProperties;
}

export function CopyLinkButton({
  getUrl,
  idleLabel = 'Copy link',
  copiedLabel = 'Copied',
  announceLabel = 'Link copied',
  toastDetail,
  className = '',
  style,
}: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const toastId = useId();

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1400);
    return () => window.clearTimeout(timer);
  }, [copied]);

  useEffect(() => {
    if (!toastVisible) return;
    const timer = window.setTimeout(() => setToastVisible(false), 1600);
    return () => window.clearTimeout(timer);
  }, [toastVisible]);

  const handleCopy = async () => {
    const url = getUrl();
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setToastVisible(true);
    setAnnouncement(announceLabel);
    window.setTimeout(() => setAnnouncement(''), 1200);
  };

  return (
    <>
      <span className="sr-only" role="status" aria-live="polite">
        {announcement}
      </span>
      <button
        type="button"
        onClick={() => void handleCopy()}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:bg-white/10 ${className}`}
        style={style}
        aria-describedby={toastVisible ? toastId : undefined}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? copiedLabel : idleLabel}
      </button>
      {toastVisible ? (
        <div
          id={toastId}
          className="pointer-events-none fixed bottom-5 right-5 z-[120] rounded-2xl border border-slate-700 bg-slate-950/95 px-4 py-2.5 text-xs font-semibold text-slate-100 shadow-[0_12px_40px_rgba(2,6,23,0.45)]"
        >
          <div className="flex flex-col gap-0.5">
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-300" />
              {announceLabel}
            </span>
            {toastDetail ? <span className="pl-5 text-[10px] font-medium text-slate-400">{toastDetail}</span> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
