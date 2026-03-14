import type { StorefrontListing } from "@/lib/storefront/types";

export type ShowcaseBand = "RED" | "ORANGE" | "YELLOW" | "GREEN" | "BLUE" | "INDIGO" | "PURPLE";
export type ShowcaseSlot = "head" | "aura" | "back" | "companion" | "body" | "weapon" | "hair" | "tattoo" | "jewelry";
export type ShowcaseFormKey = "radiant" | "meditation" | "sage" | "vigilant";
export type ShowcaseRendererKey =
  | "chronoShiftGoggles"
  | "auraOfSentience"
  | "phoenixWings"
  | "starlightMantle"
  | "prismChimeFamiliar"
  | "crystalHeartHarness"
  | "echoingVoidOrb"
  | "gravityWellGauntlet"
  | "resonanceAmplifier"
  | "dreamWeaverCirclet"
  | "seraphicPendantField"
  | "sovereignWings"
  | "ritualMask"
  | "ambientAura"
  | "spectralTresses"
  | "solarisCrownMane"
  | "sigilVeil"
  | "lunarCircuitMarks"
  | "eclipseDrops"
  | "oracleRing"
  | "voidCrown"
  | "prismBeret";

export interface AddonShowcaseMeta {
  listingId: string;
  name: string;
  band: ShowcaseBand;
  slot: ShowcaseSlot;
  emoji: string;
  fullDescription: string;
  renderer: ShowcaseRendererKey;
  defaultForm: ShowcaseFormKey;
  featured?: boolean;
}

export const showcaseForms: Record<
  ShowcaseFormKey,
  {
    name: string;
    baseColor: string;
    primaryAccent: string;
    secondaryAccent: string;
    eyeColor: string;
  }
> = {
  radiant: {
    name: "Radiant Guardian",
    baseColor: "#2c3e77",
    primaryAccent: "#f4b942",
    secondaryAccent: "#ffd700",
    eyeColor: "#f4b942"
  },
  meditation: {
    name: "Meditation Cocoon",
    baseColor: "#0d1321",
    primaryAccent: "#2dd4bf",
    secondaryAccent: "#4ecdc4",
    eyeColor: "#2dd4bf"
  },
  sage: {
    name: "Sage Luminary",
    baseColor: "#1a1f3a",
    primaryAccent: "#ffd700",
    secondaryAccent: "#f4b942",
    eyeColor: "#ffd700"
  },
  vigilant: {
    name: "Vigilant Sentinel",
    baseColor: "#1a1f3a",
    primaryAccent: "#ff6b35",
    secondaryAccent: "#ff8c42",
    eyeColor: "#ff6b35"
  }
};

export const showcaseBands: Record<ShowcaseBand, { name: string; color: string; motion: string }> = {
  RED: {
    name: "Impact",
    color: "#ef4444",
    motion: "Pulse bursts and recoil shock rings"
  },
  ORANGE: {
    name: "Kinetic",
    color: "#ff6b35",
    motion: "Fast orbital spin and kinetic trails"
  },
  YELLOW: {
    name: "Radiant",
    color: "#f59e0b",
    motion: "Celebration glints and sparkle pulses"
  },
  GREEN: {
    name: "Growth",
    color: "#10b981",
    motion: "Breathing pulses and unfurling structure"
  },
  BLUE: {
    name: "Flow",
    color: "#3b82f6",
    motion: "Drift waves, ribbons, and mist sway"
  },
  INDIGO: {
    name: "Phase",
    color: "#6b46c1",
    motion: "Shimmer echoes and time-offset afterimages"
  },
  PURPLE: {
    name: "Transcendent",
    color: "#a855f7",
    motion: "Minimal ceremonial motion with quiet authority"
  }
};

export const curatedAddonShowcaseCatalog: Record<string, AddonShowcaseMeta> = {
  "moss60-phoenix-wings": {
    listingId: "moss60-phoenix-wings",
    name: "Phoenix Wings",
    band: "RED",
    slot: "back",
    emoji: "🔥",
    fullDescription: "Wings of pure impact. They burst outward with recoil and leave shock rings that make Auralia feel ascendant.",
    renderer: "phoenixWings",
    defaultForm: "vigilant",
    featured: true
  },
  "moss60-aura-of-sentience": {
    listingId: "moss60-aura-of-sentience",
    name: "Aura of Sentience",
    band: "YELLOW",
    slot: "aura",
    emoji: "✨",
    fullDescription: "A luminous field that frames Auralia with conscious warmth, bright orbiting sparkles, and a breathing halo.",
    renderer: "auraOfSentience",
    defaultForm: "radiant",
    featured: true
  },
  "moss60-chrono-shift-goggles": {
    listingId: "moss60-chrono-shift-goggles",
    name: "Chrono-Shift Goggles",
    band: "INDIGO",
    slot: "head",
    emoji: "⏱️",
    fullDescription: "Twin temporal lenses hover over Auralia's gaze and shimmer with slight phase offsets, as if each moment is being seen twice.",
    renderer: "chronoShiftGoggles",
    defaultForm: "sage",
    featured: true
  },
  "moss60-gravity-well-gauntlet": {
    listingId: "moss60-gravity-well-gauntlet",
    name: "Gravity Well Gauntlet",
    band: "ORANGE",
    slot: "weapon",
    emoji: "🪐",
    fullDescription: "A kinetic gauntlet that spins a compact orbital rig beside Auralia and makes every gesture feel accelerated.",
    renderer: "gravityWellGauntlet",
    defaultForm: "vigilant"
  },
  "moss60-crystal-heart-harness": {
    listingId: "moss60-crystal-heart-harness",
    name: "Crystal Heart Harness",
    band: "GREEN",
    slot: "body",
    emoji: "💎",
    fullDescription: "Living crystalline bodywear breathes with Auralia and traces glowing vein lines through an organic frame.",
    renderer: "crystalHeartHarness",
    defaultForm: "meditation"
  },
  "moss60-starlight-mantle": {
    listingId: "moss60-starlight-mantle",
    name: "Starlight Mantle",
    band: "BLUE",
    slot: "back",
    emoji: "🌙",
    fullDescription: "A flowing starlit mantle trails mist and drifting points of light behind Auralia's silhouette.",
    renderer: "starlightMantle",
    defaultForm: "sage"
  },
  "moss60-echoing-void-orb": {
    listingId: "moss60-echoing-void-orb",
    name: "Echoing Void Orb",
    band: "INDIGO",
    slot: "companion",
    emoji: "◯",
    fullDescription: "A temporal companion hovers off-shoulder and broadcasts layered ring echoes that drift slightly out of sync.",
    renderer: "echoingVoidOrb",
    defaultForm: "sage"
  },
  "moss60-prism-chime-familiar": {
    listingId: "moss60-prism-chime-familiar",
    name: "Prism-Chime Familiar",
    band: "YELLOW",
    slot: "companion",
    emoji: "🔮",
    fullDescription: "A tiny luminous familiar circles Auralia with celebratory glints, prism facets, and a friendly halo.",
    renderer: "prismChimeFamiliar",
    defaultForm: "radiant"
  },
  "moss60-resonance-amplifier": {
    listingId: "moss60-resonance-amplifier",
    name: "Resonance Amplifier",
    band: "RED",
    slot: "aura",
    emoji: "📢",
    fullDescription: "An impact aura throws decisive shockwaves around Auralia and turns pulses into visible force.",
    renderer: "resonanceAmplifier",
    defaultForm: "vigilant"
  },
  "moss60-dream-weaver-circlet": {
    listingId: "moss60-dream-weaver-circlet",
    name: "Dream Weaver Circlet",
    band: "BLUE",
    slot: "head",
    emoji: "🌀",
    fullDescription: "A drifting circlet of thought-streams wraps Auralia's head in slow wave motion and misty currents.",
    renderer: "dreamWeaverCirclet",
    defaultForm: "meditation"
  },
  "moss60-seraphic-pendant-field": {
    listingId: "moss60-seraphic-pendant-field",
    name: "Seraphic Pendant Field",
    band: "PURPLE",
    slot: "body",
    emoji: "👑",
    fullDescription: "Sacred geometry unfolds from a pendant-like chest field with restrained, throne-still ceremonial motion.",
    renderer: "seraphicPendantField",
    defaultForm: "sage"
  },
  "moss60-sovereign-wings": {
    listingId: "moss60-sovereign-wings",
    name: "Sovereign Wings",
    band: "YELLOW",
    slot: "back",
    emoji: "🦅",
    fullDescription: "Prestige ceremonial wings that frame Auralia with formal flight posture, gold-tipped feathers, and a stately halo arc.",
    renderer: "sovereignWings",
    defaultForm: "sage",
    featured: false
  },
  "moss60-mask": {
    listingId: "moss60-mask",
    name: "Ritual Mask",
    band: "PURPLE",
    slot: "head",
    emoji: "🎭",
    fullDescription: "A ceremonial face piece with etched ritual markings and a crystalline crest that pulses with quiet authority.",
    renderer: "ritualMask",
    defaultForm: "meditation",
    featured: false
  },
  "moss60-aura": {
    listingId: "moss60-aura",
    name: "Ambient Aura",
    band: "GREEN",
    slot: "aura",
    emoji: "🌿",
    fullDescription: "A soft ambient field that envelops Auralia in slow-breathing teal glow with gentle orbital particles.",
    renderer: "ambientAura",
    defaultForm: "meditation",
    featured: false
  },
  "moss60-spectral-tresses": {
    listingId: "moss60-spectral-tresses",
    name: "Spectral Tresses",
    band: "BLUE",
    slot: "hair",
    emoji: "🌊",
    fullDescription: "Luminous flowing tresses that shimmer with moonthread light and wave in slow spectral motion.",
    renderer: "spectralTresses",
    defaultForm: "meditation"
  },
  "moss60-solaris-crown-mane": {
    listingId: "moss60-solaris-crown-mane",
    name: "Solaris Crown Mane",
    band: "ORANGE",
    slot: "hair",
    emoji: "☀️",
    fullDescription: "A solar mane that flares from the crown in kinetic rays, building to a corona arc at full intensity.",
    renderer: "solarisCrownMane",
    defaultForm: "vigilant"
  },
  "moss60-sigil-veil": {
    listingId: "moss60-sigil-veil",
    name: "Sigil Veil",
    band: "GREEN",
    slot: "tattoo",
    emoji: "🔺",
    fullDescription: "Geometric sigil marks etched beneath the skin that pulse in synchronized teal sequences.",
    renderer: "sigilVeil",
    defaultForm: "meditation"
  },
  "moss60-lunar-circuit-marks": {
    listingId: "moss60-lunar-circuit-marks",
    name: "Lunar Circuit Marks",
    band: "INDIGO",
    slot: "tattoo",
    emoji: "⚡",
    fullDescription: "Moon-phase circuit lines that trace limb contours in traveling bioluminescent current.",
    renderer: "lunarCircuitMarks",
    defaultForm: "sage"
  },
  "moss60-eclipse-drops": {
    listingId: "moss60-eclipse-drops",
    name: "Eclipse Drops",
    band: "PURPLE",
    slot: "jewelry",
    emoji: "🌙",
    fullDescription: "Crescent drop earrings that swing and scatter prismatic light with quiet ceremonial elegance.",
    renderer: "eclipseDrops",
    defaultForm: "sage"
  },
  "moss60-oracle-ring": {
    listingId: "moss60-oracle-ring",
    name: "Oracle Ring",
    band: "YELLOW",
    slot: "jewelry",
    emoji: "💍",
    fullDescription: "A faceted ring that projects a spinning scrying field with orbiting light particles and inner resonance.",
    renderer: "oracleRing",
    defaultForm: "radiant"
  },
  "moss60-void-crown": {
    listingId: "moss60-void-crown",
    name: "Void Crown",
    band: "PURPLE",
    slot: "head",
    emoji: "👁️",
    fullDescription: "A five-spire crown of compressed void matter with dark anti-glow halos at each tip.",
    renderer: "voidCrown",
    defaultForm: "meditation"
  },
  "moss60-prism-beret": {
    listingId: "moss60-prism-beret",
    name: "Prism Beret",
    band: "BLUE",
    slot: "head",
    emoji: "🎨",
    fullDescription: "A tilted beret of light-reactive prismatic weave that slowly cycles through the full color spectrum.",
    renderer: "prismBeret",
    defaultForm: "sage"
  }
};

export function getAddonShowcaseMeta(listing: Pick<StorefrontListing, "id" | "templateId">): AddonShowcaseMeta | undefined {
  return curatedAddonShowcaseCatalog[listing.templateId] ?? curatedAddonShowcaseCatalog[listing.id];
}

export function listSupportedShowcaseListings<T extends Pick<StorefrontListing, "id" | "templateId">>(listings: T[]): T[] {
  return listings.filter((listing) => Boolean(getAddonShowcaseMeta(listing)));
}

export function isFeaturedShowcaseListing(listing: Pick<StorefrontListing, "id" | "templateId">): boolean {
  return Boolean(getAddonShowcaseMeta(listing)?.featured);
}

export function countFeaturedShowcaseListings<T extends Pick<StorefrontListing, "id" | "templateId">>(listings: T[]): number {
  return listings.filter((listing) => isFeaturedShowcaseListing(listing)).length;
}
