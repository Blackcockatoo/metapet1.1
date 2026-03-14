"use client";

import { useState } from "react";
import Link from "next/link";
import {
  QrCode,
  Camera,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { QRGenerator } from "./QRGenerator";
import { QRScanner } from "./QRScanner";
import { useQRMessagingStore } from "@/lib/qr-messaging";

interface QRQuickPanelProps {
  defaultExpanded?: boolean;
}

export function QRQuickPanel({ defaultExpanded = false }: QRQuickPanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [mode, setMode] = useState<"generate" | "scan">("generate");

  const { conversations, generatedQRs, scannedQRs } = useQRMessagingStore();

  const activeConversations = Object.values(conversations).filter(
    (c) => c.handshakeState?.connected,
  ).length;

  const totalMessages = Object.values(conversations).reduce(
    (sum, c) => sum + c.messages.length,
    0,
  );

  return (
    <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(15,23,42,0.72)_22%,rgba(2,6,23,0.58))] shadow-[0_18px_60px_rgba(2,6,23,0.24)] backdrop-blur-xl">
      {/* Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => e.key === "Enter" && setExpanded(!expanded)}
        role="button"
        tabIndex={0}
        className="flex items-center justify-between p-5 transition hover:bg-white/5"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-400/90 to-emerald-400/70 shadow-inner shadow-cyan-950/30">
            <QrCode className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-cyan-200/75">
              Messaging
            </p>
            <h2 className="text-lg font-semibold text-white">QR Messaging</h2>
            <p className="text-xs text-zinc-400">
              MOSS60 encrypted communication
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Stats */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-400">
            <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1">
              {generatedQRs.length} generated
            </span>
            <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1">
              {scannedQRs.length} scanned
            </span>
            {activeConversations > 0 && (
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-emerald-300">
                {activeConversations} active
              </span>
            )}
          </div>

          {expanded ? (
            <ChevronUp className="w-5 h-5 text-zinc-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-zinc-400" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="space-y-4 border-t border-white/10 p-5">
          {/* Mode Toggle */}
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              variant={mode === "generate" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("generate")}
              className={`flex-1 gap-2 ${
                mode === "generate"
                  ? "bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <QrCode className="w-4 h-4" />
              Generate
            </Button>
            <Button
              variant={mode === "scan" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("scan")}
              className={`flex-1 gap-2 ${
                mode === "scan"
                  ? "bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <Camera className="w-4 h-4" />
              Scan
            </Button>
          </div>

          {/* Quick Tools */}
          <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
            {mode === "generate" ? (
              <QRGenerator compact />
            ) : (
              <QRScanner compact />
            )}
          </div>

          {/* Recent Activity */}
          {totalMessages > 0 && (
            <div className="rounded-[22px] border border-white/10 bg-white/6 p-3">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <MessageSquare className="w-4 h-4" />
                <span>
                  {totalMessages} messages in{" "}
                  {Object.keys(conversations).length} conversations
                </span>
              </div>
            </div>
          )}

          {/* Full Page Link */}
          <Link href="/qr-messaging" className="block">
            <Button
              variant="outline"
              className="w-full gap-2 rounded-2xl border-white/10 bg-white/5 text-zinc-200 hover:border-cyan-500/40 hover:bg-cyan-500/10 hover:text-white"
            >
              <MessageSquare className="w-4 h-4" />
              Open Full Messaging Panel
              <ExternalLink className="w-4 h-4 ml-auto" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
