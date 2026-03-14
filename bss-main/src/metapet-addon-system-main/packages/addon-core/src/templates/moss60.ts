import type { AddonTemplate } from "../types";

export const moss60SovereignWingsTemplate: AddonTemplate = {
  id: "moss60-sovereign-wings",
  collection: "moss60",
  name: "Sovereign Wings",
  slug: "sovereign-wings",
  category: "wings",
  rarity: "legendary",
  editionLimit: {
    policy: "capped",
    maxEditions: 60
  },
  metadataModel: {
    tags: ["moss60", "auralia", "flight", "ceremonial"],
    fields: [
      {
        key: "plumage",
        label: "Plumage Finish",
        valueType: "enum",
        required: true,
        allowedValues: ["obsidian", "moon-silver", "sun-gold"]
      },
      {
        key: "span",
        label: "Wing Span",
        valueType: "number",
        required: true
      }
    ]
  },
  previewText: "Prestige ceremonial wings that frame Auralia with formal flight posture and collector-grade presence."
};

export const moss60MaskTemplate: AddonTemplate = {
  id: "moss60-mask",
  collection: "moss60",
  name: "Ritual Mask",
  slug: "mask",
  category: "mask",
  rarity: "epic",
  editionLimit: {
    policy: "capped",
    maxEditions: 240
  },
  metadataModel: {
    tags: ["moss60", "auralia", "identity", "ritual"],
    fields: [
      {
        key: "finish",
        label: "Finish",
        valueType: "enum",
        required: true,
        allowedValues: ["porcelain", "carbon", "glass"]
      },
      {
        key: "crest",
        label: "Crest Mark",
        valueType: "string",
        required: true
      }
    ]
  },
  previewText: "A ceremonial face-slot piece for identity-driven drops, coded with ritual markings and event prestige."
};

export const moss60AuraTemplate: AddonTemplate = {
  id: "moss60-aura",
  collection: "moss60",
  name: "Ambient Aura",
  slug: "aura",
  category: "aura",
  rarity: "rare",
  editionLimit: {
    policy: "capped",
    maxEditions: 600
  },
  metadataModel: {
    tags: ["moss60", "auralia", "ambient", "effect"],
    fields: [
      {
        key: "colorway",
        label: "Colorway",
        valueType: "enum",
        required: true,
        allowedValues: ["verdant", "ember", "tide"]
      },
      {
        key: "pulse",
        label: "Pulse Level",
        valueType: "number",
        required: true
      }
    ]
  },
  previewText: "A foundational aura layer for broad drops, event rewards, and low-friction ceremonial preview moments."
};

export const moss60AuraOfSentienceTemplate: AddonTemplate = {
  id: "moss60-aura-of-sentience",
  collection: "moss60",
  name: "Aura of Sentience",
  slug: "aura-of-sentience",
  category: "aura",
  rarity: "epic",
  editionLimit: {
    policy: "capped",
    maxEditions: 180
  },
  metadataModel: {
    tags: ["moss60", "auralia", "radiant", "sentience"],
    fields: [
      {
        key: "halo_mode",
        label: "Halo Mode",
        valueType: "enum",
        required: true,
        allowedValues: ["crown", "orbit", "burst"]
      },
      {
        key: "spark_density",
        label: "Spark Density",
        valueType: "number",
        required: true
      }
    ]
  },
  previewText: "Luminous rings and sparkles that frame Auralia with a conscious, celebratory field."
};

export const moss60ChronoShiftGogglesTemplate: AddonTemplate = {
  id: "moss60-chrono-shift-goggles",
  collection: "moss60",
  name: "Chrono-Shift Goggles",
  slug: "chrono-shift-goggles",
  category: "mask",
  rarity: "legendary",
  editionLimit: {
    policy: "capped",
    maxEditions: 90
  },
  metadataModel: {
    tags: ["moss60", "auralia", "phase", "temporal"],
    fields: [
      {
        key: "lens_phase",
        label: "Lens Phase",
        valueType: "enum",
        required: true,
        allowedValues: ["echo", "split", "prism"]
      },
      {
        key: "offset_ms",
        label: "Offset Window",
        valueType: "number",
        required: true
      }
    ]
  },
  previewText: "Twin temporal lenses that let Auralia wear a phase-shifted headpiece without widening the core schema."
};

export const moss60PhoenixWingsTemplate: AddonTemplate = {
  id: "moss60-phoenix-wings",
  collection: "moss60",
  name: "Phoenix Wings",
  slug: "phoenix-wings",
  category: "wings",
  rarity: "legendary",
  editionLimit: {
    policy: "capped",
    maxEditions: 72
  },
  metadataModel: {
    tags: ["moss60", "auralia", "impact", "ascension"],
    fields: [
      {
        key: "feather_aspect",
        label: "Feather Aspect",
        valueType: "enum",
        required: true,
        allowedValues: ["ember", "solar", "molten"]
      },
      {
        key: "shock_ring_scale",
        label: "Shock Ring Scale",
        valueType: "number",
        required: true
      }
    ]
  },
  previewText: "Impact-driven ceremonial wings that burst outward with recoil and fire-lit motion."
};

export const moss60GravityWellGauntletTemplate: AddonTemplate = {
  id: "moss60-gravity-well-gauntlet",
  collection: "moss60",
  name: "Gravity Well Gauntlet",
  slug: "gravity-well-gauntlet",
  category: "weapon",
  rarity: "rare",
  editionLimit: {
    policy: "capped",
    maxEditions: 240
  },
  metadataModel: {
    tags: ["moss60", "auralia", "kinetic", "orbital"],
    fields: [
      {
        key: "orbit_mode",
        label: "Orbit Mode",
        valueType: "enum",
        required: true,
        allowedValues: ["tight", "balanced", "wide"]
      },
      {
        key: "spin_charge",
        label: "Spin Charge",
        valueType: "number",
        required: true
      }
    ]
  },
  previewText: "A ceremonial kinetic gauntlet that projects an orbital rig and momentum trails beside Auralia."
};

export const moss60CrystalHeartHarnessTemplate: AddonTemplate = {
  id: "moss60-crystal-heart-harness",
  collection: "moss60",
  name: "Crystal Heart Harness",
  slug: "crystal-heart-harness",
  category: "bodywear",
  rarity: "rare",
  editionLimit: {
    policy: "capped",
    maxEditions: 200
  },
  metadataModel: {
    tags: ["moss60", "auralia", "growth", "crystal"],
    fields: [
      {
        key: "vein_pattern",
        label: "Vein Pattern",
        valueType: "enum",
        required: true,
        allowedValues: ["heart", "branch", "halo"]
      },
      {
        key: "bloom_scale",
        label: "Bloom Scale",
        valueType: "number",
        required: true
      }
    ]
  },
  previewText: "Living crystalline bodywear that breathes, blooms, and lights the torso with regenerative veins."
};

export const moss60StarlightMantleTemplate: AddonTemplate = {
  id: "moss60-starlight-mantle",
  collection: "moss60",
  name: "Starlight Mantle",
  slug: "starlight-mantle",
  category: "back_attachment",
  rarity: "epic",
  editionLimit: {
    policy: "capped",
    maxEditions: 160
  },
  metadataModel: {
    tags: ["moss60", "auralia", "flow", "cosmic"],
    fields: [
      {
        key: "constellation_set",
        label: "Constellation Set",
        valueType: "enum",
        required: true,
        allowedValues: ["veil", "drift", "tide"]
      },
      {
        key: "mist_length",
        label: "Mist Length",
        valueType: "number",
        required: true
      }
    ]
  },
  previewText: "A drifting mantle of starlit mist that hangs behind Auralia with slow-flow ribbon motion."
};

export const moss60EchoingVoidOrbTemplate: AddonTemplate = {
  id: "moss60-echoing-void-orb",
  collection: "moss60",
  name: "Echoing Void Orb",
  slug: "echoing-void-orb",
  category: "companion",
  rarity: "rare",
  editionLimit: {
    policy: "capped",
    maxEditions: 220
  },
  metadataModel: {
    tags: ["moss60", "auralia", "phase", "echo"],
    fields: [
      {
        key: "ring_profile",
        label: "Ring Profile",
        valueType: "enum",
        required: true,
        allowedValues: ["soft", "cathedral", "fracture"]
      },
      {
        key: "echo_depth",
        label: "Echo Depth",
        valueType: "number",
        required: true
      }
    ]
  },
  previewText: "A temporal companion orb that listens for cracks in stable time and answers with layered echoes."
};

export const moss60PrismChimeFamiliarTemplate: AddonTemplate = {
  id: "moss60-prism-chime-familiar",
  collection: "moss60",
  name: "Prism-Chime Familiar",
  slug: "prism-chime-familiar",
  category: "companion",
  rarity: "legendary",
  editionLimit: {
    policy: "capped",
    maxEditions: 96
  },
  metadataModel: {
    tags: ["moss60", "auralia", "radiant", "familiar"],
    fields: [
      {
        key: "facet_tone",
        label: "Facet Tone",
        valueType: "enum",
        required: true,
        allowedValues: ["solar", "candle", "choir"]
      },
      {
        key: "chime_count",
        label: "Chime Count",
        valueType: "number",
        required: true
      }
    ]
  },
  previewText: "A prism familiar of light and chimes that hovers beside Auralia with celebratory glints."
};

export const moss60ResonanceAmplifierTemplate: AddonTemplate = {
  id: "moss60-resonance-amplifier",
  collection: "moss60",
  name: "Resonance Amplifier",
  slug: "resonance-amplifier",
  category: "aura",
  rarity: "uncommon",
  editionLimit: {
    policy: "capped",
    maxEditions: 420
  },
  metadataModel: {
    tags: ["moss60", "auralia", "impact", "sound"],
    fields: [
      {
        key: "wave_shape",
        label: "Wave Shape",
        valueType: "enum",
        required: true,
        allowedValues: ["drum", "flare", "stack"]
      },
      {
        key: "pulse_rate",
        label: "Pulse Rate",
        valueType: "number",
        required: true
      }
    ]
  },
  previewText: "An impact aura that turns force into visible wave pulses around Auralia's body."
};

export const moss60DreamWeaverCircletTemplate: AddonTemplate = {
  id: "moss60-dream-weaver-circlet",
  collection: "moss60",
  name: "Dream Weaver Circlet",
  slug: "dream-weaver-circlet",
  category: "headwear",
  rarity: "uncommon",
  editionLimit: {
    policy: "capped",
    maxEditions: 360
  },
  metadataModel: {
    tags: ["moss60", "auralia", "flow", "dream"],
    fields: [
      {
        key: "stream_pattern",
        label: "Stream Pattern",
        valueType: "enum",
        required: true,
        allowedValues: ["ripple", "mist", "braid"]
      },
      {
        key: "drift_level",
        label: "Drift Level",
        valueType: "number",
        required: true
      }
    ]
  },
  previewText: "A flowing circlet that wraps Auralia in dream-mist currents and slow wave motion."
};

export const moss60SeraphicPendantFieldTemplate: AddonTemplate = {
  id: "moss60-seraphic-pendant-field",
  collection: "moss60",
  name: "Seraphic Pendant Field",
  slug: "seraphic-pendant-field",
  category: "bodywear",
  rarity: "mythic",
  editionLimit: {
    policy: "capped",
    maxEditions: 24
  },
  metadataModel: {
    tags: ["moss60", "auralia", "transcendent", "sacred"],
    fields: [
      {
        key: "mandala_state",
        label: "Mandala State",
        valueType: "enum",
        required: true,
        allowedValues: ["sealed", "ascending", "cathedral"]
      },
      {
        key: "authority_level",
        label: "Authority Level",
        valueType: "number",
        required: true
      }
    ]
  },
  previewText: "A transcendent pendant field that unfolds sacred geometry across Auralia with restrained ceremonial motion."
};

export const moss60SpectralTressesTemplate: AddonTemplate = {
  id: "moss60-spectral-tresses",
  collection: "moss60",
  name: "Spectral Tresses",
  slug: "spectral-tresses",
  category: "hair",
  rarity: "rare",
  editionLimit: {
    policy: "capped",
    maxEditions: 300
  },
  metadataModel: {
    tags: ["moss60", "auralia", "hair", "luminous"],
    fields: [
      {
        key: "shade",
        label: "Shade",
        valueType: "enum",
        required: true,
        allowedValues: ["silver", "opal", "eclipse"]
      },
      {
        key: "length",
        label: "Length",
        valueType: "number",
        required: true
      }
    ]
  },
  previewText: "Luminous hair strands that flow with a spectral shimmer, catching light like spun moonthread."
};

export const moss60SolarisCrownManeTemplate: AddonTemplate = {
  id: "moss60-solaris-crown-mane",
  collection: "moss60",
  name: "Solaris Crown Mane",
  slug: "solaris-crown-mane",
  category: "hair",
  rarity: "epic",
  editionLimit: {
    policy: "capped",
    maxEditions: 150
  },
  metadataModel: {
    tags: ["moss60", "auralia", "hair", "solar", "radiant"],
    fields: [
      {
        key: "intensity",
        label: "Solar Intensity",
        valueType: "enum",
        required: true,
        allowedValues: ["dawn", "zenith", "corona"]
      },
      {
        key: "reach",
        label: "Reach",
        valueType: "number",
        required: true
      }
    ]
  },
  previewText: "A radiant solar mane that flares from Auralia's crown with kinetic light and a corona arc."
};

export const moss60SigilVeilTemplate: AddonTemplate = {
  id: "moss60-sigil-veil",
  collection: "moss60",
  name: "Sigil Veil",
  slug: "sigil-veil",
  category: "tattoo",
  rarity: "uncommon",
  editionLimit: {
    policy: "capped",
    maxEditions: 500
  },
  metadataModel: {
    tags: ["moss60", "auralia", "tattoo", "sigil", "geometric"],
    fields: [
      {
        key: "glyph_set",
        label: "Glyph Set",
        valueType: "enum",
        required: true,
        allowedValues: ["ward", "cipher", "bloom"]
      },
      {
        key: "coverage",
        label: "Coverage",
        valueType: "number",
        required: true
      }
    ]
  },
  previewText: "Geometric sigil marks that glow beneath the skin surface, pulsing in synchronized sequences."
};

export const moss60LunarCircuitMarksTemplate: AddonTemplate = {
  id: "moss60-lunar-circuit-marks",
  collection: "moss60",
  name: "Lunar Circuit Marks",
  slug: "lunar-circuit-marks",
  category: "tattoo",
  rarity: "rare",
  editionLimit: {
    policy: "capped",
    maxEditions: 280
  },
  metadataModel: {
    tags: ["moss60", "auralia", "tattoo", "circuit", "bioluminescent"],
    fields: [
      {
        key: "trace_map",
        label: "Trace Map",
        valueType: "enum",
        required: true,
        allowedValues: ["crescent", "node", "arc"]
      },
      {
        key: "luminance",
        label: "Luminance",
        valueType: "number",
        required: true
      }
    ]
  },
  previewText: "Moon-phase circuit lines that trace Auralia's limb contours in bioluminescent blue."
};

export const moss60EclipseDropsTemplate: AddonTemplate = {
  id: "moss60-eclipse-drops",
  collection: "moss60",
  name: "Eclipse Drops",
  slug: "eclipse-drops",
  category: "jewelry",
  rarity: "uncommon",
  editionLimit: {
    policy: "capped",
    maxEditions: 480
  },
  metadataModel: {
    tags: ["moss60", "auralia", "jewelry", "earring", "eclipse"],
    fields: [
      {
        key: "gem_type",
        label: "Gem Type",
        valueType: "enum",
        required: true,
        allowedValues: ["obsidian", "moonstone", "garnet"]
      },
      {
        key: "pair_spacing",
        label: "Pair Spacing",
        valueType: "number",
        required: true
      }
    ]
  },
  previewText: "Crescent earring drops that catch ambient light and swing with a soft prismatic scatter."
};

export const moss60OracleRingTemplate: AddonTemplate = {
  id: "moss60-oracle-ring",
  collection: "moss60",
  name: "Oracle Ring",
  slug: "oracle-ring",
  category: "jewelry",
  rarity: "rare",
  editionLimit: {
    policy: "capped",
    maxEditions: 200
  },
  metadataModel: {
    tags: ["moss60", "auralia", "jewelry", "ring", "scrying"],
    fields: [
      {
        key: "facet_cut",
        label: "Facet Cut",
        valueType: "enum",
        required: true,
        allowedValues: ["trillion", "hexagon", "star"]
      },
      {
        key: "resonance",
        label: "Resonance",
        valueType: "number",
        required: true
      }
    ]
  },
  previewText: "A singular faceted ring piece that projects a miniature scrying field from the wearer's hand."
};

export const moss60VoidCrownTemplate: AddonTemplate = {
  id: "moss60-void-crown",
  collection: "moss60",
  name: "Void Crown",
  slug: "void-crown",
  category: "headwear",
  rarity: "epic",
  editionLimit: {
    policy: "capped",
    maxEditions: 120
  },
  metadataModel: {
    tags: ["moss60", "auralia", "crown", "void", "dark"],
    fields: [
      {
        key: "spire_count",
        label: "Spire Count",
        valueType: "number",
        required: true
      },
      {
        key: "void_depth",
        label: "Void Depth",
        valueType: "enum",
        required: true,
        allowedValues: ["deep", "abyss", "null"]
      }
    ]
  },
  previewText: "A crown of compressed void matter with tall dark spires that absorb light at their tips."
};

export const moss60PrismBeretTemplate: AddonTemplate = {
  id: "moss60-prism-beret",
  collection: "moss60",
  name: "Prism Beret",
  slug: "prism-beret",
  category: "headwear",
  rarity: "uncommon",
  editionLimit: {
    policy: "capped",
    maxEditions: 400
  },
  metadataModel: {
    tags: ["moss60", "auralia", "hat", "prism", "light"],
    fields: [
      {
        key: "weave",
        label: "Weave",
        valueType: "enum",
        required: true,
        allowedValues: ["cosmos", "opal", "smoked"]
      },
      {
        key: "tilt",
        label: "Tilt",
        valueType: "number",
        required: true
      }
    ]
  },
  previewText: "A softly tilted beret woven from prismatic light-reactive thread with slow color drift."
};
