/**
 * Astrogenetics Types
 * Cosmic birth charts and meta-horoscope system for pets
 */

import { MOSS_BLACK_STRAND, MOSS_BLUE_STRAND, MOSS_RED_STRAND } from '@/lib/moss60/strandSequences';

// Astrolabe sequences - 60 digit master sequences
export const ASTROLABE_RED = MOSS_RED_STRAND;
export const ASTROLABE_BLUE = MOSS_BLUE_STRAND;
export const ASTROLABE_BLACK = MOSS_BLACK_STRAND;

// Birth epoch - cosmic origin point
export const BIRTH_EPOCH = new Date('1989-10-13T07:06:00+10:00');
export const MS_PER_DAY = 86400000;

// Planetary data
export interface Planet {
  name: string;
  symbol: string;
  period: number; // days for one complete orbit
  trait: string;
}

export const PLANETS: Planet[] = [
  { name: 'Sun', symbol: '\u2609', period: 365.2422, trait: 'Vitality' },
  { name: 'Moon', symbol: '\u263D', period: 27.321661, trait: 'Mood' },
  { name: 'Mercury', symbol: '\u263F', period: 87.969, trait: 'Learning' },
  { name: 'Venus', symbol: '\u2640', period: 224.701, trait: 'Social' },
  { name: 'Mars', symbol: '\u2642', period: 686.98, trait: 'Energy' },
  { name: 'Jupiter', symbol: '\u2643', period: 4332.589, trait: 'Luck' },
  { name: 'Saturn', symbol: '\u2644', period: 10759.22, trait: 'Growth' },
];

// Cosmic Gates - cyclic states that affect breeding and events
export const GATES = [
  'New Moon (Seed Gate)',
  'First Quarter (Friction Gate)',
  'Full Moon (Amplify Gate)',
  'Last Quarter (Cut Gate)',
  'Lunar Eclipse (Shadow Gate)',
  'Solar Eclipse (Shadow Gate)',
  'Mercury Station (Rx begins)',
  'Mercury Retrograde',
  'Mercury Station (Direct)',
  'Super Full Moon (Amplify Gate)',
  'Nodes Alignment',
] as const;

export type Gate = (typeof GATES)[number];

// Runes associated with each gate
export interface RuneEffect {
  name: string;
  effect: string;
}

export const RUNES: Record<Gate, RuneEffect> = {
  'New Moon (Seed Gate)': { name: 'Fehu', effect: 'Echo \u00D73 - Triple first reward' },
  'First Quarter (Friction Gate)': { name: 'Thurisaz', effect: 'XOR(Red,Blue) - Hybrid vigor' },
  'Full Moon (Amplify Gate)': { name: 'Wunjo', effect: 'Mirror parent traits' },
  'Last Quarter (Cut Gate)': { name: 'Isa', effect: 'Hold best stats' },
  'Lunar Eclipse (Shadow Gate)': { name: 'Hagalaz', effect: "9's complement - Inverse" },
  'Solar Eclipse (Shadow Gate)': { name: 'Hagalaz', effect: 'Shadow form unlocked' },
  'Mercury Station (Rx begins)': { name: 'Ansuz', effect: 'Chaos mode - Shuffle traits' },
  'Mercury Retrograde': { name: 'Ansuz', effect: 'Rotate indices' },
  'Mercury Station (Direct)': { name: 'Ansuz', effect: 'Restore order' },
  'Super Full Moon (Amplify Gate)': { name: 'Wunjo', effect: 'Legendary potential' },
  'Nodes Alignment': { name: 'Raidho', effect: 'Journey begins' },
};

// Planetary position with modifier
export interface PlanetaryPosition {
  name: string;
  symbol: string;
  angle: number;
  modifier: number;
  trait: string;
}

// Physical traits from RED sequence
export interface AstroPhysicalTraits {
  size: string;
  colorHue: number;
  pattern: string;
  limbs: number;
  accent: string;
}

// Personality traits from BLUE sequence
export interface AstroPersonalityTraits {
  sociability: string;
  energy: number;
  intelligence: string;
  stability: number;
  affection: number;
}

// Hidden traits from BLACK sequence
export interface AstroLatentTraits {
  mutationChance: number;
  rareTrait: string;
  evolutionPath: string;
  shinyVariant: boolean;
  secretAbility: string;
}

// Complete birth chart
export interface BirthChart {
  birthTime: Date;
  days: number;
  lucasIndex: number;
  gate: Gate;
  rune: RuneEffect;
  sequences: {
    red: string;
    blue: string;
    black: string;
  };
  traits: {
    physical: AstroPhysicalTraits;
    personality: AstroPersonalityTraits;
    latent: AstroLatentTraits;
  };
  planets: PlanetaryPosition[];
}

// Fortune levels for horoscopes
export type FortuneLevel = 'stellar' | 'calm' | 'tension';

// Daily horoscope
export interface DailyHoroscope {
  date: Date;
  gate: Gate;
  rune: RuneEffect;
  resonance: number;
  fortuneLevel: FortuneLevel;
  effects: string[];
}

// Growth Readiness Score state
export interface GRSState {
  happiness: number; // -3 to +3
  activity: number; // 0-9
  neglected: boolean;
  socialScore: number; // 0-1
  predictability: number; // 0-1
  challenge: number; // 0-1
}

export interface GRSResult {
  score: number;
  status: 'EVOLVE' | 'GROW' | 'REST';
}

// Breeding result preview
export interface BreedingPreview {
  breedTime: Date;
  gate: Gate;
  rune: RuneEffect;
  babyLucasIndex: number;
  sequences: {
    red: string;
    blue: string;
    black: string;
  };
  physicalTraits: AstroPhysicalTraits;
}

// Astrogenetics store state
export interface AstrogeneticsState {
  birthChart: BirthChart | null;
  currentHoroscope: DailyHoroscope | null;
  grs: GRSResult | null;
  lastBreedingPreview: BreedingPreview | null;
}
