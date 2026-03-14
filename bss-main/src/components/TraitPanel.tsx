"use client";

import { memo, type ComponentType, useEffect, useState } from "react";

import { useStore } from "@/lib/store";
import { MOSS_BLUE_STRAND } from "@/lib/moss60/strandSequences";
import {
  Sparkles,
  Palette,
  Brain,
  Zap,
  Orbit,
  Link2,
  Ban,
  Dna,
  Info,
  Fingerprint,
  Binary,
  BookMarked,
} from "lucide-react";
import { PacketIcon, getPacketIconColorClass } from "@/lib/moss60/packetIcons";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { StrandPacketDeck } from "./StrandPacketDeck";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Blue60Packet } from "./time-calculator/Blue60Packet";
import { GenomeSignalRing } from "./GenomeSignalRing";

type GeneticsPresetId = "single" | "multi" | "polygenic";

interface GeneticsLocus {
  id: string;
  name: string;
  alleles: [string, string];
  dominant: string;
  dominantExplanation: string;
  recessive: string;
  recessiveExplanation: string;
  effect: string;
}

interface PunnettData {
  title: string;
  parentA: string[];
  parentB: string[];
  cells: string[][];
}

interface GeneticsPreset {
  id: GeneticsPresetId;
  label: string;
  description: string;
  loci: GeneticsLocus[];
  punnett: PunnettData;
  phenotypeNotes: string[];
}

const GENETICS_PRESETS: GeneticsPreset[] = [
  {
    id: "single",
    label: "Single-Trait",
    description: "One locus, two alleles, clear dominant/recessive outcomes.",
    loci: [
      {
        id: "fur-shimmer",
        name: "Fur Shimmer",
        alleles: ["S", "s"],
        dominant: "S (Shimmer coat)",
        dominantExplanation:
          "Adds reflective sheen to the coat under bright light.",
        recessive: "s (Matte coat)",
        recessiveExplanation:
          "No shimmer; coat appears velvety in diffuse light.",
        effect: "Controls how light interacts with the top coat layer.",
      },
    ],
    punnett: {
      title: "Shimmer coat (S) vs matte coat (s)",
      parentA: ["S", "s"],
      parentB: ["S", "s"],
      cells: [
        ["SS", "Ss"],
        ["Ss", "ss"],
      ],
    },
    phenotypeNotes: [
      "75% chance of shimmer highlight on the mane.",
      "25% chance of matte-only coat with softer gradients.",
    ],
  },
  {
    id: "multi",
    label: "Multi-Trait",
    description: "Two loci with independent assortment for classroom practice.",
    loci: [
      {
        id: "eye-glow",
        name: "Eye Glow",
        alleles: ["G", "g"],
        dominant: "G (Radiant eyes)",
        dominantExplanation: "Iridescent glow visible in low light scenes.",
        recessive: "g (Standard eyes)",
        recessiveExplanation: "Eyes match body palette without glow.",
        effect: "Adjusts pupil bloom intensity in creature render.",
      },
      {
        id: "crest-shape",
        name: "Crest Shape",
        alleles: ["C", "c"],
        dominant: "C (Crown crest)",
        dominantExplanation: "Tall crest with pointed silhouette.",
        recessive: "c (Leaf crest)",
        recessiveExplanation: "Rounded crest with softer edges.",
        effect: "Changes head outline and ear framing.",
      },
    ],
    punnett: {
      title: "Radiant eyes (G) sample cross",
      parentA: ["G", "g"],
      parentB: ["G", "g"],
      cells: [
        ["GG", "Gg"],
        ["Gg", "gg"],
      ],
    },
    phenotypeNotes: [
      "If at least one G, eyes glow during nighttime animations.",
      "C allele makes crest appear taller by ~12%.",
      "Recessive combo keeps a rounded silhouette and calmer eye highlights.",
    ],
  },
  {
    id: "polygenic",
    label: "Polygenic",
    description: "Multiple loci blending together for continuous traits.",
    loci: [
      {
        id: "scale-density",
        name: "Scale Density",
        alleles: ["D1", "d1"],
        dominant: "D1 (Dense scales)",
        dominantExplanation: "Adds extra scale layers for a textured look.",
        recessive: "d1 (Sparse scales)",
        recessiveExplanation: "Fewer scales, smoother body gradient.",
        effect: "Modulates surface texture richness.",
      },
      {
        id: "tail-length",
        name: "Tail Length",
        alleles: ["T1", "t1"],
        dominant: "T1 (Long tail)",
        dominantExplanation: "Longer tail with added sway animation frames.",
        recessive: "t1 (Short tail)",
        recessiveExplanation: "Compact tail with tighter movements.",
        effect: "Controls tail segment count.",
      },
      {
        id: "pattern-contrast",
        name: "Pattern Contrast",
        alleles: ["P1", "p1"],
        dominant: "P1 (High contrast)",
        dominantExplanation:
          "Strong contrast between primary and secondary markings.",
        recessive: "p1 (Soft contrast)",
        recessiveExplanation: "Subtle transitions between markings.",
        effect: "Adjusts pattern color range.",
      },
    ],
    punnett: {
      title: "Pattern contrast (P1) sample cross",
      parentA: ["P1", "p1"],
      parentB: ["P1", "p1"],
      cells: [
        ["P1P1", "P1p1"],
        ["P1p1", "p1p1"],
      ],
    },
    phenotypeNotes: [
      "Polygenic blend shifts overall silhouette and texture intensity.",
      "Higher dominant allele count nudges contrast and tail length upward.",
      "Recessive-heavy outcomes produce softer gradients and compact motion.",
    ],
  },
];

export const TraitPanel = memo(function TraitPanel() {
  const traits = useStore((s) => s.traits);
  const genome = useStore((s) => s.genome);
  const [presetId, setPresetId] = useState<GeneticsPresetId>("single");
  const [showPredictions, setShowPredictions] = useState(true);
  const [activeTab, setActiveTab] = useState<"traits" | "genetics" | "lore">(
    "traits",
  );
  const [showBlueLore, setShowBlueLore] = useState(false);

  useEffect(() => {
    const openPacketLore = () => {
      setActiveTab("lore");
      requestAnimationFrame(() => {
        document.getElementById("blue60-packet-entry")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    };

    const handleHash = () => {
      if (window.location.hash === "#blue60-packet") {
        openPacketLore();
      }
    };

    handleHash();
    window.addEventListener("hashchange", handleHash);
    window.addEventListener("open-blue60-packet", openPacketLore);

    return () => {
      window.removeEventListener("hashchange", handleHash);
      window.removeEventListener("open-blue60-packet", openPacketLore);
    };
  }, []);

  if (!traits || !genome) {
    return (
      <div className="rounded-[24px] border border-white/10 bg-white/5 py-8 text-center text-zinc-400">
        Loading genome...
      </div>
    );
  }

  const { physical, personality, latent, elementWeb } = traits;
  const activePreset =
    GENETICS_PRESETS.find((preset) => preset.id === presetId) ??
    GENETICS_PRESETS[0];
  const blueSequence = genome.blue60.join("");
  const isCorrectedBlue60 = blueSequence === MOSS_BLUE_STRAND;

  return (
    <div className="space-y-6">
      <Tabs
        value={activeTab}
        onValueChange={(value) =>
          setActiveTab(value as "traits" | "genetics" | "lore")
        }
      >
        <TabsList className="grid w-full grid-cols-3 rounded-[24px] border border-white/10 bg-white/6 p-1 backdrop-blur-sm">
          <TabsTrigger
            value="traits"
            className="rounded-2xl py-2.5 text-xs sm:text-sm"
          >
            Traits
          </TabsTrigger>
          <TabsTrigger
            value="genetics"
            className="rounded-2xl py-2.5 text-xs sm:text-sm"
          >
            Genetics
          </TabsTrigger>
          <TabsTrigger
            value="lore"
            className={`rounded-2xl py-2.5 text-xs sm:text-sm ${
              isCorrectedBlue60 && activeTab !== "lore"
                ? "border border-sky-400/60 bg-sky-500/10 text-sky-100 shadow-[0_0_24px_rgba(14,165,233,0.18)]"
                : ""
            }`}
          >
            Blue-60 Lore
          </TabsTrigger>
        </TabsList>

        <TabsContent value="traits" className="mt-6 space-y-6">
          {/* Physical Traits */}
          <section className="space-y-4 rounded-[28px] border border-pink-400/10 bg-pink-400/5 p-5">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Palette className="w-5 h-5 text-pink-400" />
              Physical Traits
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <TraitCard label="Body Type" value={physical.bodyType} />
              <TraitCard label="Pattern" value={physical.pattern} />
              <TraitCard label="Texture" value={physical.texture} />
              <TraitCard label="Size" value={`${physical.size.toFixed(2)}x`} />
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/6 p-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-zinc-400">Colors:</span>
                <div
                  className="h-8 w-8 rounded-xl border border-white/15"
                  style={{ backgroundColor: physical.primaryColor }}
                  title={physical.primaryColor}
                />
                <div
                  className="h-8 w-8 rounded-xl border border-white/15"
                  style={{ backgroundColor: physical.secondaryColor }}
                  title={physical.secondaryColor}
                />
              </div>
            </div>
            {physical.features.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {physical.features.map((feat, i) => (
                  <span
                    key={i}
                    className="rounded-full border border-pink-400/25 bg-pink-400/10 px-3 py-1 text-xs text-pink-100"
                  >
                    {feat}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Personality Traits */}
          <section className="space-y-4 rounded-[28px] border border-sky-400/10 bg-sky-400/5 p-5">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Brain className="w-5 h-5 text-blue-400" />
              Personality
            </h3>
            <div className="space-y-3 rounded-[22px] border border-white/10 bg-white/6 p-4">
              <div className="text-sm">
                <span className="text-zinc-400">Temperament:</span>{" "}
                <span className="text-white font-medium">
                  {personality.temperament}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <StatMini label="Energy" value={personality.energy} />
                <StatMini label="Social" value={personality.social} />
                <StatMini label="Curiosity" value={personality.curiosity} />
                <StatMini label="Affection" value={personality.affection} />
                <StatMini label="Playfulness" value={personality.playfulness} />
                <StatMini label="Loyalty" value={personality.loyalty} />
              </div>
            </div>
            {personality.quirks.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs text-zinc-400">Quirks:</div>
                <div className="flex flex-wrap gap-2">
                  {personality.quirks.map((quirk, i) => (
                    <span
                      key={i}
                      className="rounded-full border border-sky-400/25 bg-sky-400/10 px-3 py-1 text-xs text-sky-100"
                    >
                      {quirk}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Latent Traits */}
          <section className="space-y-4 rounded-[28px] border border-violet-400/10 bg-violet-400/5 p-5">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Sparkles className="w-5 h-5 text-purple-400" />
              Hidden Potential
            </h3>
            <div className="space-y-3 rounded-[22px] border border-white/10 bg-white/6 p-4 text-sm">
              <div>
                <span className="text-zinc-400">Evolution Path:</span>{" "}
                <span className="text-purple-300 font-medium">
                  {latent.evolutionPath}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <StatMini
                  label="Physical"
                  value={latent.potential.physical}
                  color="red"
                />
                <StatMini
                  label="Mental"
                  value={latent.potential.mental}
                  color="blue"
                />
                <StatMini
                  label="Social"
                  value={latent.potential.social}
                  color="green"
                />
              </div>
            </div>
            {latent.rareAbilities.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs text-zinc-400 flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Rare Abilities:
                </div>
                <div className="flex flex-wrap gap-2">
                  {latent.rareAbilities.map((ability, i) => (
                    <span
                      key={i}
                      className="rounded-full border border-violet-400/25 bg-violet-400/10 px-3 py-1 text-xs font-medium text-violet-100"
                    >
                      {ability}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Element Web */}
          <section className="space-y-4 rounded-[28px] border border-amber-400/15 bg-amber-400/6 p-5">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Orbit className="w-5 h-5 text-amber-300" />
              Element Web
            </h3>
            <div className="grid gap-3 lg:grid-cols-[1fr,0.9fr]">
              <div className="rounded-[24px] border border-white/10 bg-white/6 p-3">
                <GenomeSignalRing
                  redDigits={genome.red60}
                  blackDigits={genome.black60}
                  blueDigits={genome.blue60}
                  variant="dial"
                />
              </div>
              <div className="space-y-3 text-sm">
                <MetricRow
                  label="Residue Coverage"
                  value={`${Math.round(elementWeb.coverage * 100)}%`}
                />
                <div className="grid grid-cols-2 gap-2">
                  <MetricPill
                    icon={Orbit}
                    label="Frontier Affinity"
                    value={elementWeb.frontierAffinity}
                    color="amber"
                  />
                  <MetricPill
                    icon={Link2}
                    label="Bridge Count"
                    value={elementWeb.bridgeCount}
                    color="cyan"
                  />
                  <MetricPill
                    icon={Ban}
                    label="Void Drift"
                    value={elementWeb.voidDrift}
                    color="rose"
                  />
                  <MetricPill
                    icon={Sparkles}
                    label="Active Residues"
                    value={elementWeb.usedResidues.length}
                    color="purple"
                  />
                </div>
                <div className="space-y-2 text-xs text-zinc-300">
                  <DetailLine
                    label="Frontier Slots"
                    value={formatResidues(elementWeb.frontierSlots)}
                  />
                  <DetailLine
                    label="Bridge Slots"
                    value={formatResidues(elementWeb.pairSlots)}
                  />
                  <DetailLine
                    label="Void Slots Hit"
                    value={formatResidues(elementWeb.voidSlotsHit)}
                  />
                </div>
              </div>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="genetics" className="mt-6">
          {/* Genetics Classroom */}
          <section className="space-y-4 rounded-[28px] border border-violet-400/12 bg-violet-400/5 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                <Dna className="w-5 h-5 text-purple-300" />
                Genetics Classroom
              </h3>
              <div className="flex items-center gap-2 text-xs text-zinc-300">
                <span>Show predictions</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={showPredictions}
                  onClick={() => setShowPredictions((prev) => !prev)}
                  className={`relative h-6 w-11 rounded-full transition ${showPredictions ? "bg-purple-500" : "bg-white/15"}`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${showPredictions ? "left-5" : "left-1"}`}
                  />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {GENETICS_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setPresetId(preset.id)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    presetId === preset.id
                      ? "border-purple-400 bg-purple-500/20 text-purple-100"
                      : "border-white/10 bg-white/6 text-zinc-300 hover:border-purple-400/60 hover:text-purple-100"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-400">{activePreset.description}</p>
            <p className="text-[10px] text-zinc-600 leading-relaxed">
              These are real Mendelian genetics concepts — the same principles
              Gregor Mendel discovered with pea plants in the 1860s, now applied
              to your companion&apos;s genome.
            </p>

            <div className="grid gap-3 md:grid-cols-2">
              {activePreset.loci.map((locus) => (
                <div
                  key={locus.id}
                  className="space-y-2 rounded-[24px] border border-white/10 bg-white/6 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {locus.name}
                      </div>
                      <div className="text-xs text-zinc-400">
                        Alleles: {locus.alleles.join(" / ")}
                      </div>
                    </div>
                    <span className="text-[11px] uppercase tracking-wide text-purple-300">
                      Locus
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-zinc-300">
                    <HoverDetail
                      label="Dominant"
                      value={locus.dominant}
                      description={locus.dominantExplanation}
                    />
                    <HoverDetail
                      label="Recessive"
                      value={locus.recessive}
                      description={locus.recessiveExplanation}
                    />
                    <div className="text-zinc-400">
                      Effect:{" "}
                      <span className="text-zinc-200">{locus.effect}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {showPredictions && (
              <div className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
                <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
                  <div className="text-xs uppercase tracking-wide text-zinc-400 mb-2">
                    Punnett-square prediction
                  </div>
                  <div className="text-sm font-semibold text-white mb-3">
                    {activePreset.punnett.title}
                  </div>
                  <div className="overflow-x-auto">
                    <div
                      className="grid gap-1"
                      style={{
                        gridTemplateColumns: `repeat(${activePreset.punnett.parentA.length + 1}, minmax(48px, 1fr))`,
                      }}
                    >
                      <div className="text-xs text-zinc-400 flex items-center justify-center">
                        ×
                      </div>
                      {activePreset.punnett.parentA.map((allele) => (
                        <div
                          key={allele}
                          className="text-xs text-purple-200 font-semibold flex items-center justify-center"
                        >
                          {allele}
                        </div>
                      ))}
                      {activePreset.punnett.parentB.map(
                        (parentAllele, rowIndex) => (
                          <div
                            key={`${parentAllele}-${rowIndex}`}
                            className="contents"
                          >
                            <div className="text-xs text-purple-200 font-semibold flex items-center justify-center">
                              {parentAllele}
                            </div>
                            {activePreset.punnett.cells[rowIndex].map(
                              (cell, cellIndex) => (
                                <div
                                  key={`${parentAllele}-${cellIndex}`}
                                  className="rounded-xl border border-white/10 bg-white/6 py-2 text-center text-xs text-white"
                                >
                                  {cell}
                                </div>
                              ),
                            )}
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-3 rounded-[24px] border border-white/10 bg-white/6 p-4">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-zinc-400">
                      Phenotype changes on the creature
                    </div>
                    <ul className="mt-2 space-y-1 text-sm text-zinc-200">
                      {activePreset.phenotypeNotes.map((note) => (
                        <li key={note} className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-purple-400" />
                          <span>{note}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-[22px] border border-white/10 bg-white/6 p-4 text-xs text-zinc-300">
                    <div className="text-[11px] uppercase tracking-wide text-zinc-400 mb-1">
                      Current phenotype snapshot
                    </div>
                    <div className="grid gap-2">
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Body Type</span>
                        <span className="text-white">{physical.bodyType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Pattern</span>
                        <span className="text-white">{physical.pattern}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Texture</span>
                        <span className="text-white">{physical.texture}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Primary Color</span>
                        <span className="text-white">
                          {physical.primaryColor}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </TabsContent>

        <TabsContent value="lore" className="mt-6 space-y-4">
          <section
            id="blue60-packet-entry"
            className="rounded-[28px] border border-sky-500/20 bg-[linear-gradient(135deg,rgba(2,6,23,0.84),rgba(8,47,73,0.6),rgba(14,116,144,0.2))] p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.26em] text-sky-200/75">
                  Packet status
                </p>
                <h3 className="mt-2 text-lg font-semibold text-white">
                  Blue-60 corrected strand lore overlay
                </h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                  Open the full packet for the crownwheel map, palette
                  progression, and Oracle Lattice Companion profile. This layer
                  is narrative-only and does not replace live genome decoding.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBlueLore(true)}
                className="rounded-full border border-sky-300/25 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-100 transition hover:border-sky-200/45 hover:bg-sky-500/20"
              >
                Open Blue-60 Packet
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <LoreFact
                icon={Fingerprint}
                label="Genome source"
                value={
                  isCorrectedBlue60
                    ? "Exact corrected Blue-60 strand active"
                    : "Lore layer available regardless of active genome"
                }
              />
              <LoreFact
                icon={Binary}
                label="Live Blue digits"
                value={blueSequence.slice(0, 20) + "..."}
                mono
              />
              <LoreFact
                icon={BookMarked}
                label="Packet mode"
                value="Read-only interpretive overlay"
              />
            </div>
            {isCorrectedBlue60 ? (
              <p className="mt-4 text-xs font-medium uppercase tracking-[0.22em] text-sky-200/80">
                Corrected Blue-60 match detected
              </p>
            ) : null}
          </section>

          <section className="space-y-3 rounded-[28px] border border-white/10 bg-white/5 p-5">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">
                Triad scaffolding
              </p>
              <h3 className="mt-2 flex flex-wrap items-center gap-3 text-lg font-semibold text-white">
                <span className="inline-flex items-center gap-1.5">
                  <PacketIcon
                    packet="red"
                    className={`h-4 w-4 ${getPacketIconColorClass("red")}`}
                  />
                  Red
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <PacketIcon
                    packet="blue"
                    className={`h-4 w-4 ${getPacketIconColorClass("blue")}`}
                  />
                  Blue
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <PacketIcon
                    packet="black"
                    className={`h-4 w-4 ${getPacketIconColorClass("black")}`}
                  />
                  Black
                </span>
                <span>strand packets</span>
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Blue is live now. Red and black scaffolds are wired into the UI
                so their packet shells can grow without changing the structure
                again.
              </p>
            </div>
            <StrandPacketDeck
              activeBlueMatch={isCorrectedBlue60}
              onOpenBluePacket={() => setShowBlueLore(true)}
              showPageLink
              hashLinks
            />
          </section>
        </TabsContent>
      </Tabs>

      <Dialog open={showBlueLore} onOpenChange={setShowBlueLore}>
        <DialogContent className="max-w-6xl border-sky-500/30 bg-slate-950/95 p-0 backdrop-blur-xl">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="text-sky-100">
              Blue-60 Corrected Packet
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[80vh] overflow-y-auto px-3 pb-3 sm:px-6 sm:pb-6">
            <Blue60Packet compact persistKey="blue" />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});

function LoreFact({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/6 p-3">
      <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-wide text-zinc-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div
        className={`mt-2 text-sm text-white ${mono ? "font-mono text-xs sm:text-sm" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}

interface TraitCardProps {
  label: string;
  value: string;
}

function TraitCard({ label, value }: TraitCardProps) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-white/6 p-3">
      <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </div>
      <div className="mt-2 text-sm font-medium text-white">{value}</div>
    </div>
  );
}

interface StatMiniProps {
  label: string;
  value: number;
  color?: "red" | "blue" | "green" | "zinc";
}

function StatMini({ label, value, color = "zinc" }: StatMiniProps) {
  const colorMap = {
    red: "bg-red-500",
    blue: "bg-blue-500",
    green: "bg-green-500",
    zinc: "bg-zinc-500",
  };

  return (
    <div className="space-y-1.5 rounded-[18px] border border-white/8 bg-black/10 p-2.5">
      <div className="flex justify-between items-center">
        <span className="text-zinc-400">{label}</span>
        <span className="text-white font-medium">{value}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full ${colorMap[color]} transition-all`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

interface MetricPillProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  color?: "amber" | "cyan" | "rose" | "purple";
}

function MetricPill({
  icon: Icon,
  label,
  value,
  color = "amber",
}: MetricPillProps) {
  const colorMap = {
    amber: "bg-amber-500/20 text-amber-200 border-amber-400/40",
    cyan: "bg-cyan-500/20 text-cyan-200 border-cyan-400/40",
    rose: "bg-rose-500/20 text-rose-200 border-rose-400/40",
    purple: "bg-purple-500/20 text-purple-200 border-purple-400/40",
  };

  return (
    <div
      className={`flex items-center gap-2 rounded-[20px] border px-3 py-2 ${colorMap[color]}`}
    >
      <Icon className="w-4 h-4" />
      <div>
        <div className="text-[11px] uppercase tracking-wide text-zinc-200/80">
          {label}
        </div>
        <div className="text-sm font-semibold">{value}</div>
      </div>
    </div>
  );
}

interface MetricRowProps {
  label: string;
  value: string;
}

function MetricRow({ label, value }: MetricRowProps) {
  return (
    <div className="flex items-center justify-between rounded-[20px] border border-white/10 bg-white/6 px-3 py-2">
      <span className="text-zinc-400 text-xs uppercase tracking-wide">
        {label}
      </span>
      <span className="text-white font-semibold">{value}</span>
    </div>
  );
}

interface DetailLineProps {
  label: string;
  value: string;
}

function DetailLine({ label, value }: DetailLineProps) {
  return (
    <div className="flex items-center gap-2 rounded-[18px] border border-white/8 bg-black/10 px-3 py-2">
      <span className="w-32 text-zinc-400">{label}:</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  );
}

function formatResidues(residues: number[]): string {
  if (!residues.length) {
    return "None";
  }

  return residues.join(", ");
}

interface HoverDetailProps {
  label: string;
  value: string;
  description: string;
}

function HoverDetail({ label, value, description }: HoverDetailProps) {
  return (
    <div className="flex items-center gap-1 text-zinc-300">
      <span className="text-zinc-400">{label}:</span>
      <span className="text-white">{value}</span>
      <span className="relative group inline-flex">
        <Info className="h-3.5 w-3.5 text-zinc-500" />
        <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-48 -translate-x-1/2 rounded-xl border border-white/10 bg-slate-950 p-2 text-[11px] text-zinc-200 opacity-0 shadow-xl transition group-hover:opacity-100">
          {description}
        </span>
      </span>
    </div>
  );
}
