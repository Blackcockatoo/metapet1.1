import type {
  ComfortState,
  ExpandedEmotionalState,
  GuardianAIMode,
} from "../../shared/auralia/guardianBehavior";

export type MetaPetMoodSvgId =
  | "01_happy"
  | "02_sad"
  | "03_angry"
  | "04_surprised"
  | "05_sleepy"
  | "06_love"
  | "07_cool"
  | "08_king"
  | "09_angel"
  | "10_thinking"
  | "11_evil"
  | "12_energetic"
  | "13_confused"
  | "14_shocked"
  | "15_proud"
  | "16_shy"
  | "17_bored"
  | "18_star"
  | "19_ninja"
  | "20_frozen"
  | "21_fire"
  | "22_ghost"
  | "23_rich"
  | "24_sick"
  | "25_dead"
  | "26_happy_gold"
  | "27_mysterious";

type MoodVisual = {
  label: string;
  src: string;
};

type MoodStageTheme = {
  frame: string;
  glow: string;
  haze: string;
  ring: string;
  orbCore: string;
  orbShell: string;
  orbAura: string;
  particleColors: [string, string, string];
  motion: "steady" | "pulse" | "flicker" | "drift" | "spark";
  eyeIris: string;
  eyeSecondary: string;
  pupilScale: number;
  glowBoost: number;
  audioCue: {
    degrees: number[];
    velocity: number;
    gapMs: number;
  };
  audioTimbre?: {
    waveform: OscillatorType;
    overtoneWaveform?: OscillatorType;
    overtoneGain?: number;
    detune?: number;
    filterFrequency?: number;
  };
};

type MetaPetMoodVisualInput = {
  emotion?: ExpandedEmotionalState | null;
  comfortSource?: ComfortState["source"] | null;
  aiMode?: GuardianAIMode | null;
  mood?: number;
  energy?: number;
  health?: number;
  bond?: number;
  annoyanceLevel?: number;
};

const basePath = "/metapet_svgs/metapet_svgs";

export const METAPET_MOOD_SVGS: Record<MetaPetMoodSvgId, MoodVisual> = {
  "01_happy": { label: "Happy", src: `${basePath}/01_happy.svg` },
  "02_sad": { label: "Sad", src: `${basePath}/02_sad.svg` },
  "03_angry": { label: "Angry", src: `${basePath}/03_angry.svg` },
  "04_surprised": { label: "Surprised", src: `${basePath}/04_surprised.svg` },
  "05_sleepy": { label: "Sleepy", src: `${basePath}/05_sleepy.svg` },
  "06_love": { label: "Love", src: `${basePath}/06_love.svg` },
  "07_cool": { label: "Cool", src: `${basePath}/07_cool.svg` },
  "08_king": { label: "King", src: `${basePath}/08_king.svg` },
  "09_angel": { label: "Angel", src: `${basePath}/09_angel.svg` },
  "10_thinking": { label: "Thinking", src: `${basePath}/10_thinking.svg` },
  "11_evil": { label: "Evil", src: `${basePath}/11_evil.svg` },
  "12_energetic": { label: "Energetic", src: `${basePath}/12_energetic.svg` },
  "13_confused": { label: "Confused", src: `${basePath}/13_confused.svg` },
  "14_shocked": { label: "Shocked", src: `${basePath}/14_shocked.svg` },
  "15_proud": { label: "Proud", src: `${basePath}/15_proud.svg` },
  "16_shy": { label: "Shy", src: `${basePath}/16_shy.svg` },
  "17_bored": { label: "Bored", src: `${basePath}/17_bored.svg` },
  "18_star": { label: "Star", src: `${basePath}/18_star.svg` },
  "19_ninja": { label: "Ninja", src: `${basePath}/19_ninja.svg` },
  "20_frozen": { label: "Frozen", src: `${basePath}/20_frozen.svg` },
  "21_fire": { label: "Fire", src: `${basePath}/21_fire.svg` },
  "22_ghost": { label: "Ghost", src: `${basePath}/22_ghost.svg` },
  "23_rich": { label: "Rich", src: `${basePath}/23_rich.svg` },
  "24_sick": { label: "Sick", src: `${basePath}/24_sick.svg` },
  "25_dead": { label: "Dead", src: `${basePath}/25_dead.svg` },
  "26_happy_gold": {
    label: "Golden Happy",
    src: `${basePath}/26_happy_gold.svg`,
  },
  "27_mysterious": {
    label: "Mysterious",
    src: `${basePath}/27_mysterious.svg`,
  },
};

export const METAPET_STAGE_THEMES: Record<MetaPetMoodSvgId, MoodStageTheme> = {
  "01_happy": { frame: "rgba(250,204,21,0.30)", glow: "rgba(251,191,36,0.24)", haze: "rgba(253,224,71,0.12)", ring: "#facc15", orbCore: "#173b7a", orbShell: "#2f5cb2", orbAura: "rgba(251,191,36,0.22)", particleColors: ["#fde047", "#38bdf8", "#f59e0b"], motion: "steady", eyeIris: "#fde047", eyeSecondary: "#38bdf8", pupilScale: 1.05, glowBoost: 0.12, audioCue: { degrees: [0, 2, 4], velocity: 0.24, gapMs: 150 }, audioTimbre: { waveform: "triangle", overtoneWaveform: "sine", overtoneGain: 0.12, filterFrequency: 2600 } },
  "02_sad": { frame: "rgba(96,165,250,0.24)", glow: "rgba(59,130,246,0.18)", haze: "rgba(148,163,184,0.10)", ring: "#60a5fa", orbCore: "#1e2f57", orbShell: "#35538b", orbAura: "rgba(96,165,250,0.16)", particleColors: ["#60a5fa", "#94a3b8", "#cbd5e1"], motion: "drift", eyeIris: "#93c5fd", eyeSecondary: "#cbd5e1", pupilScale: 0.88, glowBoost: -0.12, audioCue: { degrees: [0, 1, 0], velocity: 0.18, gapMs: 220 }, audioTimbre: { waveform: "sine", overtoneWaveform: "triangle", overtoneGain: 0.08, filterFrequency: 1400 } },
  "03_angry": { frame: "rgba(248,113,113,0.28)", glow: "rgba(239,68,68,0.22)", haze: "rgba(251,146,60,0.10)", ring: "#f87171", orbCore: "#4a1820", orbShell: "#7f1d1d", orbAura: "rgba(248,113,113,0.20)", particleColors: ["#f87171", "#fb923c", "#facc15"], motion: "flicker", eyeIris: "#f87171", eyeSecondary: "#fb923c", pupilScale: 0.84, glowBoost: 0.02, audioCue: { degrees: [4, 2, 1], velocity: 0.24, gapMs: 110 }, audioTimbre: { waveform: "sawtooth", overtoneWaveform: "square", overtoneGain: 0.18, detune: 8, filterFrequency: 1800 } },
  "04_surprised": { frame: "rgba(251,191,36,0.28)", glow: "rgba(34,211,238,0.18)", haze: "rgba(253,224,71,0.10)", ring: "#fbbf24", orbCore: "#3b2a0d", orbShell: "#7c4a10", orbAura: "rgba(34,211,238,0.18)", particleColors: ["#fbbf24", "#22d3ee", "#fde68a"], motion: "spark", eyeIris: "#fef08a", eyeSecondary: "#22d3ee", pupilScale: 1.16, glowBoost: 0.16, audioCue: { degrees: [5, 6, 4], velocity: 0.22, gapMs: 100 } },
  "05_sleepy": { frame: "rgba(129,140,248,0.24)", glow: "rgba(99,102,241,0.18)", haze: "rgba(165,180,252,0.10)", ring: "#818cf8", orbCore: "#111c3d", orbShell: "#312e81", orbAura: "rgba(129,140,248,0.18)", particleColors: ["#818cf8", "#a5b4fc", "#c4b5fd"], motion: "drift", eyeIris: "#a5b4fc", eyeSecondary: "#c4b5fd", pupilScale: 0.8, glowBoost: -0.18, audioCue: { degrees: [0, 4], velocity: 0.14, gapMs: 320 } },
  "06_love": { frame: "rgba(244,114,182,0.28)", glow: "rgba(236,72,153,0.22)", haze: "rgba(251,207,232,0.10)", ring: "#f472b6", orbCore: "#4a1836", orbShell: "#9d174d", orbAura: "rgba(244,114,182,0.20)", particleColors: ["#f472b6", "#f9a8d4", "#fef3c7"], motion: "pulse", eyeIris: "#f9a8d4", eyeSecondary: "#fde68a", pupilScale: 1.08, glowBoost: 0.1, audioCue: { degrees: [0, 2, 5], velocity: 0.22, gapMs: 170 } },
  "07_cool": { frame: "rgba(34,211,238,0.26)", glow: "rgba(6,182,212,0.18)", haze: "rgba(56,189,248,0.08)", ring: "#22d3ee", orbCore: "#0f2541", orbShell: "#155e75", orbAura: "rgba(34,211,238,0.18)", particleColors: ["#22d3ee", "#38bdf8", "#cbd5e1"], motion: "steady", eyeIris: "#67e8f9", eyeSecondary: "#cbd5e1", pupilScale: 0.96, glowBoost: 0.02, audioCue: { degrees: [0, 3], velocity: 0.16, gapMs: 180 } },
  "08_king": { frame: "rgba(234,179,8,0.32)", glow: "rgba(217,119,6,0.24)", haze: "rgba(254,240,138,0.12)", ring: "#eab308", orbCore: "#35240c", orbShell: "#a16207", orbAura: "rgba(234,179,8,0.22)", particleColors: ["#eab308", "#f59e0b", "#fde68a"], motion: "pulse", eyeIris: "#fde047", eyeSecondary: "#f59e0b", pupilScale: 1.02, glowBoost: 0.16, audioCue: { degrees: [0, 4, 6], velocity: 0.26, gapMs: 140 } },
  "09_angel": { frame: "rgba(255,255,255,0.30)", glow: "rgba(196,181,253,0.18)", haze: "rgba(191,219,254,0.10)", ring: "#f8fafc", orbCore: "#25345f", orbShell: "#c4b5fd", orbAura: "rgba(255,255,255,0.20)", particleColors: ["#f8fafc", "#c4b5fd", "#bfdbfe"], motion: "drift", eyeIris: "#f8fafc", eyeSecondary: "#c4b5fd", pupilScale: 0.94, glowBoost: 0.18, audioCue: { degrees: [0, 3, 5], velocity: 0.2, gapMs: 180 } },
  "10_thinking": { frame: "rgba(148,163,184,0.24)", glow: "rgba(100,116,139,0.18)", haze: "rgba(148,163,184,0.08)", ring: "#94a3b8", orbCore: "#1f2937", orbShell: "#475569", orbAura: "rgba(148,163,184,0.16)", particleColors: ["#94a3b8", "#64748b", "#cbd5e1"], motion: "steady", eyeIris: "#cbd5e1", eyeSecondary: "#94a3b8", pupilScale: 0.9, glowBoost: -0.02, audioCue: { degrees: [0, 2], velocity: 0.14, gapMs: 210 } },
  "11_evil": { frame: "rgba(192,38,211,0.28)", glow: "rgba(168,85,247,0.20)", haze: "rgba(126,34,206,0.10)", ring: "#d946ef", orbCore: "#220f36", orbShell: "#6b21a8", orbAura: "rgba(217,70,239,0.18)", particleColors: ["#d946ef", "#a855f7", "#22d3ee"], motion: "flicker", eyeIris: "#e879f9", eyeSecondary: "#22d3ee", pupilScale: 0.82, glowBoost: 0.08, audioCue: { degrees: [6, 3, 1], velocity: 0.22, gapMs: 120 } },
  "12_energetic": { frame: "rgba(45,212,191,0.28)", glow: "rgba(16,185,129,0.22)", haze: "rgba(253,224,71,0.10)", ring: "#2dd4bf", orbCore: "#0d3a3d", orbShell: "#0f766e", orbAura: "rgba(45,212,191,0.20)", particleColors: ["#2dd4bf", "#22c55e", "#fde047"], motion: "spark", eyeIris: "#5eead4", eyeSecondary: "#fde047", pupilScale: 1.12, glowBoost: 0.14, audioCue: { degrees: [0, 2, 4, 6], velocity: 0.24, gapMs: 95 } },
  "13_confused": { frame: "rgba(250,204,21,0.24)", glow: "rgba(168,85,247,0.18)", haze: "rgba(148,163,184,0.10)", ring: "#c084fc", orbCore: "#312747", orbShell: "#6d28d9", orbAura: "rgba(192,132,252,0.16)", particleColors: ["#c084fc", "#facc15", "#94a3b8"], motion: "spark", eyeIris: "#d8b4fe", eyeSecondary: "#facc15", pupilScale: 0.92, glowBoost: 0.04, audioCue: { degrees: [1, 4, 2], velocity: 0.18, gapMs: 130 } },
  "14_shocked": { frame: "rgba(251,146,60,0.28)", glow: "rgba(248,113,113,0.22)", haze: "rgba(253,186,116,0.10)", ring: "#fb923c", orbCore: "#3f1d12", orbShell: "#c2410c", orbAura: "rgba(251,146,60,0.18)", particleColors: ["#fb923c", "#f87171", "#fde68a"], motion: "flicker", eyeIris: "#fdba74", eyeSecondary: "#f87171", pupilScale: 1.18, glowBoost: 0.1, audioCue: { degrees: [6, 5, 3], velocity: 0.24, gapMs: 90 } },
  "15_proud": { frame: "rgba(245,158,11,0.28)", glow: "rgba(250,204,21,0.20)", haze: "rgba(254,240,138,0.10)", ring: "#f59e0b", orbCore: "#39240a", orbShell: "#b45309", orbAura: "rgba(245,158,11,0.18)", particleColors: ["#f59e0b", "#fde047", "#fef3c7"], motion: "pulse", eyeIris: "#fde68a", eyeSecondary: "#f59e0b", pupilScale: 1, glowBoost: 0.14, audioCue: { degrees: [0, 3, 6], velocity: 0.22, gapMs: 140 } },
  "16_shy": { frame: "rgba(244,114,182,0.20)", glow: "rgba(192,132,252,0.16)", haze: "rgba(251,207,232,0.10)", ring: "#f9a8d4", orbCore: "#41223a", orbShell: "#9d4edd", orbAura: "rgba(249,168,212,0.16)", particleColors: ["#f9a8d4", "#c084fc", "#fbcfe8"], motion: "drift", eyeIris: "#fbcfe8", eyeSecondary: "#c084fc", pupilScale: 0.86, glowBoost: 0, audioCue: { degrees: [0, 2], velocity: 0.13, gapMs: 230 } },
  "17_bored": { frame: "rgba(100,116,139,0.24)", glow: "rgba(71,85,105,0.18)", haze: "rgba(148,163,184,0.08)", ring: "#94a3b8", orbCore: "#1e293b", orbShell: "#334155", orbAura: "rgba(100,116,139,0.14)", particleColors: ["#64748b", "#94a3b8", "#cbd5e1"], motion: "steady", eyeIris: "#94a3b8", eyeSecondary: "#64748b", pupilScale: 0.82, glowBoost: -0.14, audioCue: { degrees: [0], velocity: 0.1, gapMs: 250 } },
  "18_star": { frame: "rgba(250,204,21,0.30)", glow: "rgba(96,165,250,0.20)", haze: "rgba(255,255,255,0.10)", ring: "#fde047", orbCore: "#251a4f", orbShell: "#7c3aed", orbAura: "rgba(253,224,71,0.20)", particleColors: ["#fde047", "#60a5fa", "#f8fafc"], motion: "spark", eyeIris: "#fef08a", eyeSecondary: "#60a5fa", pupilScale: 1.14, glowBoost: 0.16, audioCue: { degrees: [0, 4, 6, 4], velocity: 0.24, gapMs: 100 } },
  "19_ninja": { frame: "rgba(74,222,128,0.22)", glow: "rgba(20,184,166,0.16)", haze: "rgba(15,23,42,0.10)", ring: "#4ade80", orbCore: "#0b1a1d", orbShell: "#14532d", orbAura: "rgba(74,222,128,0.14)", particleColors: ["#4ade80", "#14b8a6", "#1f2937"], motion: "drift", eyeIris: "#86efac", eyeSecondary: "#14b8a6", pupilScale: 0.8, glowBoost: 0.02, audioCue: { degrees: [5, 2, 0], velocity: 0.18, gapMs: 110 } },
  "20_frozen": { frame: "rgba(125,211,252,0.26)", glow: "rgba(56,189,248,0.20)", haze: "rgba(191,219,254,0.10)", ring: "#7dd3fc", orbCore: "#0f2033", orbShell: "#1d4ed8", orbAura: "rgba(125,211,252,0.18)", particleColors: ["#7dd3fc", "#bfdbfe", "#e0f2fe"], motion: "drift", eyeIris: "#bfdbfe", eyeSecondary: "#e0f2fe", pupilScale: 0.76, glowBoost: -0.08, audioCue: { degrees: [0, 0, 2], velocity: 0.12, gapMs: 260 } },
  "21_fire": { frame: "rgba(249,115,22,0.30)", glow: "rgba(239,68,68,0.24)", haze: "rgba(251,146,60,0.12)", ring: "#f97316", orbCore: "#431407", orbShell: "#c2410c", orbAura: "rgba(249,115,22,0.22)", particleColors: ["#f97316", "#ef4444", "#facc15"], motion: "flicker", eyeIris: "#fb923c", eyeSecondary: "#ef4444", pupilScale: 0.8, glowBoost: 0.06, audioCue: { degrees: [4, 6, 2], velocity: 0.24, gapMs: 100 } },
  "22_ghost": { frame: "rgba(196,181,253,0.24)", glow: "rgba(129,140,248,0.18)", haze: "rgba(226,232,240,0.08)", ring: "#c4b5fd", orbCore: "#1b1e3f", orbShell: "#6366f1", orbAura: "rgba(196,181,253,0.16)", particleColors: ["#c4b5fd", "#a5b4fc", "#e2e8f0"], motion: "drift", eyeIris: "#ddd6fe", eyeSecondary: "#a5b4fc", pupilScale: 0.78, glowBoost: -0.04, audioCue: { degrees: [0, 5], velocity: 0.12, gapMs: 260 } },
  "23_rich": { frame: "rgba(234,179,8,0.34)", glow: "rgba(251,191,36,0.24)", haze: "rgba(253,224,71,0.14)", ring: "#fbbf24", orbCore: "#3a2506", orbShell: "#ca8a04", orbAura: "rgba(251,191,36,0.24)", particleColors: ["#fbbf24", "#fde047", "#f8fafc"], motion: "pulse", eyeIris: "#fef08a", eyeSecondary: "#f8fafc", pupilScale: 1.08, glowBoost: 0.2, audioCue: { degrees: [0, 4, 6, 3], velocity: 0.28, gapMs: 120 } },
  "24_sick": { frame: "rgba(132,204,22,0.22)", glow: "rgba(74,222,128,0.16)", haze: "rgba(163,230,53,0.08)", ring: "#84cc16", orbCore: "#1a2a12", orbShell: "#4d7c0f", orbAura: "rgba(132,204,22,0.14)", particleColors: ["#84cc16", "#bef264", "#86efac"], motion: "drift", eyeIris: "#bef264", eyeSecondary: "#86efac", pupilScale: 0.82, glowBoost: -0.1, audioCue: { degrees: [1, 0], velocity: 0.12, gapMs: 240 } },
  "25_dead": { frame: "rgba(148,163,184,0.20)", glow: "rgba(71,85,105,0.16)", haze: "rgba(15,23,42,0.12)", ring: "#64748b", orbCore: "#111827", orbShell: "#374151", orbAura: "rgba(100,116,139,0.10)", particleColors: ["#475569", "#64748b", "#94a3b8"], motion: "steady", eyeIris: "#94a3b8", eyeSecondary: "#475569", pupilScale: 0.72, glowBoost: -0.22, audioCue: { degrees: [0], velocity: 0.08, gapMs: 320 } },
  "26_happy_gold": { frame: "rgba(250,204,21,0.36)", glow: "rgba(245,158,11,0.26)", haze: "rgba(253,224,71,0.16)", ring: "#facc15", orbCore: "#30210a", orbShell: "#d97706", orbAura: "rgba(250,204,21,0.24)", particleColors: ["#facc15", "#fde047", "#f8fafc"], motion: "pulse", eyeIris: "#fde047", eyeSecondary: "#f8fafc", pupilScale: 1.14, glowBoost: 0.22, audioCue: { degrees: [0, 2, 4, 6], velocity: 0.28, gapMs: 110 } },
  "27_mysterious": { frame: "rgba(168,85,247,0.28)", glow: "rgba(59,130,246,0.18)", haze: "rgba(192,132,252,0.10)", ring: "#c084fc", orbCore: "#1f1238", orbShell: "#6d28d9", orbAura: "rgba(168,85,247,0.18)", particleColors: ["#c084fc", "#60a5fa", "#22d3ee"], motion: "drift", eyeIris: "#d8b4fe", eyeSecondary: "#60a5fa", pupilScale: 0.9, glowBoost: 0.08, audioCue: { degrees: [0, 3, 1], velocity: 0.18, gapMs: 170 } },
};

const EMOTION_VARIANTS: Record<ExpandedEmotionalState, MetaPetMoodSvgId> = {
  serene: "01_happy",
  calm: "07_cool",
  curious: "27_mysterious",
  playful: "12_energetic",
  contemplative: "10_thinking",
  affectionate: "06_love",
  restless: "13_confused",
  yearning: "16_shy",
  overwhelmed: "14_shocked",
  withdrawn: "22_ghost",
  ecstatic: "26_happy_gold",
  melancholic: "02_sad",
  mischievous: "19_ninja",
  protective: "09_angel",
  transcendent: "18_star",
};

function clampMetric(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }
  return Math.max(0, Math.min(100, value));
}

export function getMetaPetMoodVisual({
  emotion,
  comfortSource,
  aiMode,
  mood,
  energy,
  health,
  bond,
  annoyanceLevel,
}: MetaPetMoodVisualInput) {
  const safeMood = clampMetric(mood, 50);
  const safeEnergy = clampMetric(energy, 50);
  const safeHealth = clampMetric(health, 80);
  const safeBond = clampMetric(bond, 50);
  const safeAnnoyance = clampMetric(annoyanceLevel, 0);

  let id: MetaPetMoodSvgId;

  if (safeHealth <= 4 || safeMood <= 2) {
    id = "25_dead";
  } else if (safeHealth < 18 || comfortSource === "distressed") {
    id = safeEnergy < 20 ? "24_sick" : "21_fire";
  } else if (aiMode === "dreaming" && safeMood < 35) {
    id = "22_ghost";
  } else if (aiMode === "dreaming" || safeEnergy < 20) {
    id = "05_sleepy";
  } else if (safeAnnoyance > 72) {
    id = "03_angry";
  } else if (emotion) {
    id = EMOTION_VARIANTS[emotion];
  } else if (safeMood >= 80) {
    id = safeBond > 85 ? "26_happy_gold" : "01_happy";
  } else if (safeMood >= 60) {
    id = safeEnergy >= 60 ? "12_energetic" : "07_cool";
  } else if (safeMood >= 40) {
    id = "10_thinking";
  } else {
    id = "02_sad";
  }

  if (id === "26_happy_gold" && safeBond > 92) {
    id = "23_rich";
  }

  if (emotion === "serene" && safeBond > 88) {
    id = "15_proud";
  }

  if (emotion === "calm" && safeEnergy < 35) {
    id = "17_bored";
  }

  if (emotion === "curious" && safeEnergy > 78) {
    id = "18_star";
  }

  if (emotion === "playful" && safeMood > 90) {
    id = "01_happy";
  }

  if (emotion === "contemplative" && safeBond < 35) {
    id = "27_mysterious";
  }

  if (emotion === "yearning" && safeMood < 30) {
    id = "02_sad";
  }

  if (emotion === "overwhelmed" && safeAnnoyance > 55) {
    id = "21_fire";
  }

  if (emotion === "withdrawn" && safeEnergy < 28) {
    id = safeMood < 25 ? "20_frozen" : "22_ghost";
  }

  if (emotion === "mischievous" && safeBond > 70) {
    id = "19_ninja";
  }

  if (emotion === "protective" && safeBond > 75) {
    id = safeBond > 90 ? "08_king" : "15_proud";
  }

  if (emotion === "protective" && safeHealth < 35) {
    id = "08_king";
  }

  if (emotion === "restless" && safeAnnoyance > 35) {
    id = "14_shocked";
  }

  if (emotion === "restless" && safeEnergy > 72) {
    id = "04_surprised";
  }

  if (emotion === "transcendent" && safeBond > 85) {
    id = "09_angel";
  }

  const visual = METAPET_MOOD_SVGS[id];
  return { id, ...visual };
}

export function getMetaPetMoodStageTheme(id: MetaPetMoodSvgId) {
  const theme = METAPET_STAGE_THEMES[id];
  if (theme.audioTimbre) return theme;

  const fallbackByMotion = {
    steady: { waveform: 'triangle' as OscillatorType, overtoneWaveform: 'sine' as OscillatorType, overtoneGain: 0.12, filterFrequency: 2200 },
    pulse: { waveform: 'triangle' as OscillatorType, overtoneWaveform: 'sine' as OscillatorType, overtoneGain: 0.16, filterFrequency: 2600 },
    flicker: { waveform: 'sawtooth' as OscillatorType, overtoneWaveform: 'square' as OscillatorType, overtoneGain: 0.18, detune: 7, filterFrequency: 1700 },
    drift: { waveform: 'sine' as OscillatorType, overtoneWaveform: 'triangle' as OscillatorType, overtoneGain: 0.08, filterFrequency: 1500 },
    spark: { waveform: 'square' as OscillatorType, overtoneWaveform: 'triangle' as OscillatorType, overtoneGain: 0.14, detune: 4, filterFrequency: 2400 },
  };

  return {
    ...theme,
    audioTimbre: fallbackByMotion[theme.motion],
  };
}

export function getMetaPetMoodThemeFromVitals(vitals: {
  mood: number;
  energy: number;
  hunger: number;
  hygiene: number;
}) {
  const visual = getMetaPetMoodVisual({
    mood: vitals.mood,
    energy: vitals.energy,
    health: (vitals.hygiene + vitals.energy) / 2,
    bond: (vitals.mood + vitals.hygiene) / 2,
    annoyanceLevel: Math.max(0, 100 - vitals.mood),
  });

  return {
    visual,
    stage: getMetaPetMoodStageTheme(visual.id),
  };
}
