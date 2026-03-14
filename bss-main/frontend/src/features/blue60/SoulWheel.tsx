"use client";

import { useEffect, useMemo, useRef } from "react";
import type { BlueNode, BlueState, BlueGenome, Harmonics } from "./types";
import {
  NODE_TRAITS,
  GOLD_SPINE_PAIRS,
  CYCLE_PAIRS,
  CYCLE_COLORS,
  GOLD_SPINE_SET,
} from "./graph";
import { computeLiveHarmonics } from "./engine";
import { useBlue60Store } from "./store";

// ─── Geometry ─────────────────────────────────────────────────────────────────

const CX = 150;
const CY = 150;
const NODE_RING_R = 108; // radius at which node circles sit
const NODE_CIRCLE_R = 13; // radius of each node circle

/** Cartesian position of node k on the decagon (node 0 at top). */
function nodePos(node: BlueNode): [number, number] {
  const angleDeg = -90 + node * 36;
  const rad = (angleDeg * Math.PI) / 180;
  return [CX + NODE_RING_R * Math.cos(rad), CY + NODE_RING_R * Math.sin(rad)];
}

// Precompute all 10 positions once
const NODE_POSITIONS = Array.from(
  { length: 10 },
  (_, i) => nodePos(i as BlueNode),
) as [number, number][];

// ─── SVG helpers ──────────────────────────────────────────────────────────────

function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number,
): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/**
 * SVG arc path descriptor.
 * sweep = 1 → clockwise, 0 → counter-clockwise
 */
function describeArc(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
  sweep = 1,
): string {
  const s = polarToCartesian(cx, cy, r, startDeg);
  const e = polarToCartesian(cx, cy, r, endDeg);
  const span = Math.abs(endDeg - startDeg);
  const largeArc = span > 180 ? 1 : 0;
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} ${sweep} ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function HarmonicRings({ h }: { h: Harmonics }) {
  // Rings sit inside the node ring (radii 60–90)
  return (
    <g>
      {/* m0 — stable body field: full ring */}
      <circle
        cx={CX}
        cy={CY}
        r={72}
        fill="none"
        stroke="#818cf8"
        strokeOpacity={0.12 + h.m0 * 0.50}
        strokeWidth={3 + h.m0 * 5}
      />

      {/* m1 — clockwise chiral: right-half arc (top → bottom, CW) */}
      <path
        d={describeArc(CX, CY, 85, -90, 90, 1)}
        fill="none"
        stroke="#22d3ee"
        strokeLinecap="round"
        strokeOpacity={0.15 + h.m1 * 0.60}
        strokeWidth={2 + h.m1 * 4}
      />

      {/* m2 — opposition / split: two short opposing arcs */}
      <path
        d={describeArc(CX, CY, 64, -40, 40, 1)}
        fill="none"
        stroke="#f472b6"
        strokeLinecap="round"
        strokeOpacity={0.15 + h.m2 * 0.55}
        strokeWidth={2 + h.m2 * 3}
      />
      <path
        d={describeArc(CX, CY, 64, 140, 220, 1)}
        fill="none"
        stroke="#f472b6"
        strokeLinecap="round"
        strokeOpacity={0.15 + h.m2 * 0.55}
        strokeWidth={2 + h.m2 * 3}
      />

      {/* m3 — counter-clockwise: left-half arc (bottom → top, CCW) */}
      <path
        d={describeArc(CX, CY, 85, 90, -90, 0)}
        fill="none"
        stroke="#7c3aed"
        strokeLinecap="round"
        strokeOpacity={0.15 + h.m3 * 0.60}
        strokeWidth={2 + h.m3 * 4}
      />
    </g>
  );
}

function GoldSpineEdges({ spineCharge }: { spineCharge: number }) {
  const chargeNorm = Math.min(1, spineCharge / 20);
  return (
    <g>
      {GOLD_SPINE_PAIRS.map(([a, b]) => {
        const [ax, ay] = NODE_POSITIONS[a];
        const [bx, by] = NODE_POSITIONS[b];
        return (
          <line
            key={`spine-${a}-${b}`}
            x1={ax}
            y1={ay}
            x2={bx}
            y2={by}
            stroke="#fbbf24"
            strokeOpacity={0.18 + chargeNorm * 0.65}
            strokeWidth={1.2 + chargeNorm * 1.5}
          />
        );
      })}
    </g>
  );
}

function PathTrail({ lastPath }: { lastPath: BlueNode[] }) {
  const trail = lastPath.slice(-7);
  if (trail.length < 2) return null;

  return (
    <g>
      {trail.slice(0, -1).map((from, i) => {
        const to = trail[i + 1];
        const [ax, ay] = NODE_POSITIONS[from];
        const [bx, by] = NODE_POSITIONS[to];
        const isSpine = GOLD_SPINE_SET.has(`${from}-${to}`);
        const opacity = ((i + 1) / (trail.length - 1)) * 0.35;
        return (
          <line
            key={`trail-${i}`}
            x1={ax}
            y1={ay}
            x2={bx}
            y2={by}
            stroke={isSpine ? "#fbbf24" : "#94a3b8"}
            strokeOpacity={opacity}
            strokeWidth={isSpine ? 1.5 : 1}
            strokeDasharray={isSpine ? "none" : "3 3"}
          />
        );
      })}
    </g>
  );
}

function CycleArrows({ currentCycle }: { currentCycle: BlueState["currentCycle"] }) {
  if (currentCycle === "none") return null;
  const pairs = CYCLE_PAIRS[currentCycle];
  const color = CYCLE_COLORS[currentCycle];
  const markerId = `arrow-${currentCycle}`;

  return (
    <g>
      <defs>
        <marker
          id={markerId}
          markerWidth={7}
          markerHeight={7}
          refX={3.5}
          refY={3.5}
          orient="auto"
        >
          <path d="M0,0 L7,3.5 L0,7 Z" fill={color} opacity={0.75} />
        </marker>
      </defs>
      {pairs.map(([a, b]) => {
        const [ax, ay] = NODE_POSITIONS[a];
        const [bx, by] = NODE_POSITIONS[b];
        // Shorten line so arrowhead doesn't overlap the node circle
        const dx = bx - ax;
        const dy = by - ay;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const shrink = (NODE_CIRCLE_R + 4) / dist;
        return (
          <line
            key={`cycle-${a}-${b}`}
            x1={ax + dx * shrink}
            y1={ay + dy * shrink}
            x2={bx - dx * shrink}
            y2={by - dy * shrink}
            stroke={color}
            strokeOpacity={0.70}
            strokeWidth={1.5}
            markerEnd={`url(#${markerId})`}
          />
        );
      })}
    </g>
  );
}

function NodeCircles({ activeNode }: { activeNode: BlueNode }) {
  return (
    <g>
      {(Array.from({ length: 10 }, (_, i) => i as BlueNode)).map((node) => {
        const [x, y] = NODE_POSITIONS[node];
        const trait = NODE_TRAITS[node];
        const isActive = node === activeNode;

        return (
          <g key={node}>
            {/* Outer glow ring for active node */}
            {isActive && (
              <circle
                cx={x}
                cy={y}
                r={NODE_CIRCLE_R + 7}
                fill="none"
                stroke={trait.color}
                strokeOpacity={0.35}
                strokeWidth={2}
              />
            )}
            {/* Node circle */}
            <circle
              cx={x}
              cy={y}
              r={NODE_CIRCLE_R}
              fill={isActive ? trait.color : "#0f172a"}
              stroke={isActive ? trait.color : "#334155"}
              strokeWidth={isActive ? 2 : 1}
            />
            {/* Node index label */}
            <text
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={9}
              fontWeight={isActive ? "bold" : "normal"}
              fill={isActive ? "#000" : "#64748b"}
            >
              {node}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function CenterReadout({
  state,
}: {
  state: BlueState;
}) {
  const { activeNode, macroRole, currentCycle, resonance } = state;
  const trait = NODE_TRAITS[activeNode];

  const macroLabel: Record<BlueState["macroRole"], string> = {
    VOID: "Void",
    BRIDGE: "Bridge",
    EVEN: "Form",
    ODD: "Spirit",
  };

  const cycleLabel: Record<string, string> = {
    c1: "Sovereignty",
    c2: "Curiosity",
    c3: "Coronation",
  };

  const cycleColor = currentCycle !== "none" ? CYCLE_COLORS[currentCycle] : "#64748b";

  return (
    <g>
      {/* Resonance pulse ring */}
      <circle
        cx={CX}
        cy={CY}
        r={28 + resonance * 8}
        fill="none"
        stroke={trait.color}
        strokeOpacity={resonance * 0.25}
        strokeWidth={1}
      />
      {/* Macro role label */}
      <text
        x={CX}
        y={CY - 10}
        textAnchor="middle"
        fontSize={15}
        fontWeight="bold"
        fill="#e2e8f0"
      >
        {macroLabel[macroRole]}
      </text>
      {/* Microstate name */}
      <text
        x={CX}
        y={CY + 7}
        textAnchor="middle"
        fontSize={8.5}
        fill="#64748b"
      >
        {trait.name}
      </text>
      {/* Active cycle */}
      {currentCycle !== "none" && (
        <text
          x={CX}
          y={CY + 22}
          textAnchor="middle"
          fontSize={8}
          fill={cycleColor}
        >
          {cycleLabel[currentCycle]}
        </text>
      )}
    </g>
  );
}

// ─── Soul Wheel (connected to store) ─────────────────────────────────────────

export function SoulWheel() {
  const { petState: state, genome, tick, crownEventPending, clearCrownEvent } = useBlue60Store();

  const harmonics = useMemo(
    () => computeLiveHarmonics(state, genome),
    [state, genome],
  );

  // Auto-tick on a 1.2 s interval (adjustable)
  const tickRef = useRef(tick);
  tickRef.current = tick;
  useEffect(() => {
    const id = setInterval(() => tickRef.current(), 1200);
    return () => clearInterval(id);
  }, []);

  // Crown event flash (could drive audio / confetti externally)
  useEffect(() => {
    if (!crownEventPending) return;
    const id = setTimeout(clearCrownEvent, 2000);
    return () => clearTimeout(id);
  }, [crownEventPending, clearCrownEvent]);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Crown event banner */}
      {crownEventPending && (
        <div className="animate-pulse rounded border border-amber-400 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300">
          ◆ Crownwheel event — full spine loop completed
        </div>
      )}

      {/* SVG soul wheel */}
      <svg
        viewBox="0 0 300 300"
        width={300}
        height={300}
        className="drop-shadow-lg"
        aria-label="Blue-60 Soul Wheel"
      >
        {/* Background */}
        <circle cx={CX} cy={CY} r={NODE_RING_R + 22} fill="#020617" />

        {/* Layer order: harmonics → spine → trail → cycle arrows → nodes → center */}
        <HarmonicRings h={harmonics} />
        <GoldSpineEdges spineCharge={state.spineCharge} />
        <PathTrail lastPath={state.lastPath} />
        <CycleArrows currentCycle={state.currentCycle} />
        <NodeCircles activeNode={state.activeNode} />
        <CenterReadout state={state} />
      </svg>

      {/* Status row */}
      <div className="flex gap-4 text-xs text-slate-400">
        <span>
          <span className="text-amber-400">Spine</span> {Math.floor(state.spineCharge)}
        </span>
        <span>·</span>
        <span>
          <span className="text-pink-400">Bridge</span> {Math.floor(state.bridgeCharge)}
        </span>
        <span>·</span>
        <span>
          <span className="text-violet-400">Res</span> {(state.resonance * 100).toFixed(0)}%
        </span>
        <span>·</span>
        <span className="capitalize">{NODE_TRAITS[state.activeNode].behaviour}</span>
      </div>

      {/* Harmonic values */}
      <div className="flex gap-3 text-xs text-slate-500">
        <span>m0 <span className="text-indigo-400">{(harmonics.m0 * 100).toFixed(0)}%</span></span>
        <span>m1 <span className="text-cyan-400">{(harmonics.m1 * 100).toFixed(0)}%</span></span>
        <span>m2 <span className="text-pink-400">{(harmonics.m2 * 100).toFixed(0)}%</span></span>
        <span>m3 <span className="text-violet-400">{(harmonics.m3 * 100).toFixed(0)}%</span></span>
      </div>
    </div>
  );
}

// ─── Presentational variant (no store, for Storybook / testing) ───────────────

type SoulWheelStaticProps = {
  state: BlueState;
  genome: BlueGenome;
};

export function SoulWheelStatic({ state, genome }: SoulWheelStaticProps) {
  const harmonics = useMemo(
    () => computeLiveHarmonics(state, genome),
    [state, genome],
  );

  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox="0 0 300 300" width={300} height={300} className="drop-shadow-lg">
        <circle cx={CX} cy={CY} r={NODE_RING_R + 22} fill="#020617" />
        <HarmonicRings h={harmonics} />
        <GoldSpineEdges spineCharge={state.spineCharge} />
        <PathTrail lastPath={state.lastPath} />
        <CycleArrows currentCycle={state.currentCycle} />
        <NodeCircles activeNode={state.activeNode} />
        <CenterReadout state={state} />
      </svg>
      <div className="flex gap-4 text-xs text-slate-400">
        <span><span className="text-amber-400">Spine</span> {Math.floor(state.spineCharge)}</span>
        <span>·</span>
        <span className="capitalize">{NODE_TRAITS[state.activeNode].behaviour}</span>
      </div>
    </div>
  );
}
