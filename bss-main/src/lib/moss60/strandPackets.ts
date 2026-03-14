import {
  BLUE60_AXES,
  BLUE60_CHAMBERS,
  BLUE60_CONDENSED_PALETTE,
  BLUE60_CORE_ANCHOR,
  BLUE60_CORRECTED_STRAND,
  BLUE60_PALETTE,
  BLUE60_PROFILE,
  BLUE60_STATS,
} from '@/lib/moss60/blue60Packet';
import { MOSS_BLACK_STRAND, MOSS_BLUE_STRAND, MOSS_RED_STRAND } from '@/lib/moss60/strandSequences';

export type StrandPacketKey = 'red' | 'blue' | 'black';

export interface StrandPacketScaffold {
  readonly key: StrandPacketKey;
  readonly label: string;
  readonly strand: string;
  readonly accent: string;
  readonly status: 'scaffold' | 'full';
  readonly summary: string;
  readonly archetype: string;
  readonly element: string;
  readonly themes: readonly string[];
  readonly condensedPalette: readonly { name: string; hex: string }[];
  readonly abilities: readonly string[];
  readonly weaknesses: readonly string[];
  readonly evolution: readonly string[];
  readonly stats: readonly { label: string; value: number }[];
}

export interface FullStrandPacket extends StrandPacketScaffold {
  readonly status: 'full';
  readonly coreAnchor: string;
  readonly chambers: readonly {
    positionLabel: string;
    name: string;
    pentad: string;
    function: string;
    color: string;
  }[];
  readonly axes: readonly {
    from: string;
    to: string;
    title: string;
    meaning: string;
  }[];
  readonly palette: readonly {
    name: string;
    hex: string;
    phase: string;
  }[];
  readonly condensedPalette: readonly { name: string; hex: string }[];
  readonly stats: readonly { label: string; value: number }[];
  readonly profile: {
    genomeId: string;
    speciesClass: string;
    element: string;
    temperament: string;
    nature: string;
    summary: string;
    bondStyle: string;
    preferred: readonly string[];
    dislikes: readonly string[];
    body: readonly string[];
    aura: readonly string[];
    abilities: readonly string[];
    weaknesses: readonly string[];
    evolution: readonly string[];
    cleanRead: readonly string[];
    styleNote: string;
  };
}

export const STRAND_PACKET_SCAFFOLDS: Record<StrandPacketKey, StrandPacketScaffold> = {
  red: {
    key: 'red',
    label: 'Red-60 ignition packet',
    strand: MOSS_RED_STRAND,
    accent: '#EF4444',
    status: 'scaffold',
    summary: 'Reserved for ignition, pressure, and combat-forward packet mapping.',
    archetype: 'Ignition Vanguard',
    element: 'Fire / Signal / Kinetic',
    themes: ['heat', 'drive', 'impact', 'charge', 'territory'],
    condensedPalette: [
      { name: 'Ember Core', hex: '#C81E1E' },
      { name: 'Solar Rush', hex: '#F97316' },
      { name: 'Flare Gold', hex: '#FBBF24' },
      { name: 'Pressure Rose', hex: '#FB7185' },
      { name: 'Ash Alloy', hex: '#7C2D12' },
    ],
    abilities: ['Ignition Burst', 'Rush Coil', 'Territory Flare', 'Momentum Fang'],
    weaknesses: ['drawn-out attrition', 'cold pattern traps', 'reflection-heavy defenders'],
    evolution: ['Red Spark', 'Heat Runner', 'Forge Sentinel', 'Solar Vanguard'],
    stats: [
      { label: 'Attack Pressure', value: 96 },
      { label: 'Agility', value: 85 },
      { label: 'Chaos Tolerance', value: 88 },
      { label: 'Defense / Stability', value: 61 },
    ],
  },
  blue: {
    key: 'blue',
    label: 'Blue-60 corrected packet',
    strand: MOSS_BLUE_STRAND,
    accent: '#125DFF',
    status: 'full',
    summary: 'Full sapphire crownwheel packet with oracle lore and palette system.',
    archetype: 'Oracle Lattice Companion',
    element: 'Signal / Water / Aether',
    themes: ['pattern', 'reflection', 'forecasting', 'stability', 'trust'],
    condensedPalette: BLUE60_CONDENSED_PALETTE,
    abilities: BLUE60_PROFILE.abilities,
    weaknesses: BLUE60_PROFILE.weaknesses,
    evolution: BLUE60_PROFILE.evolution,
    stats: BLUE60_STATS,
  },
  black: {
    key: 'black',
    label: 'Black-60 shadow packet',
    strand: MOSS_BLACK_STRAND,
    accent: '#64748B',
    status: 'scaffold',
    summary: 'Reserved for shadow, void, and latent mutation packet mapping.',
    archetype: 'Umbra Archive Familiar',
    element: 'Void / Earth / Memory',
    themes: ['concealment', 'entropy', 'memory', 'drift', 'mutation'],
    condensedPalette: [
      { name: 'Void Slate', hex: '#0F172A' },
      { name: 'Obsidian Veil', hex: '#1E293B' },
      { name: 'Eclipse Smoke', hex: '#475569' },
      { name: 'Echo Silver', hex: '#94A3B8' },
      { name: 'Abyss Bloom', hex: '#312E81' },
    ],
    abilities: ['Null Veil', 'Archive Bite', 'Echo Shed', 'Mutation Wake'],
    weaknesses: ['bright burst reveal', 'wide-area cleansing fields', 'sustained direct pressure'],
    evolution: ['Black Cinder', 'Shade Familiar', 'Vault Warden', 'Umbra Seraph'],
    stats: [
      { label: 'Mystic Sense', value: 91 },
      { label: 'Defense / Stability', value: 84 },
      { label: 'Curiosity', value: 79 },
      { label: 'Attack Pressure', value: 57 },
    ],
  },
};

export const BLUE_STRAND_PACKET: FullStrandPacket = {
  ...STRAND_PACKET_SCAFFOLDS.blue,
  status: 'full',
  strand: BLUE60_CORRECTED_STRAND,
  coreAnchor: BLUE60_CORE_ANCHOR,
  chambers: BLUE60_CHAMBERS,
  axes: BLUE60_AXES,
  palette: BLUE60_PALETTE,
  condensedPalette: BLUE60_CONDENSED_PALETTE,
  stats: BLUE60_STATS,
  profile: BLUE60_PROFILE,
};

export const RED_STRAND_PACKET: FullStrandPacket = {
  ...STRAND_PACKET_SCAFFOLDS.red,
  status: 'full',
  coreAnchor: '#E23A2D',
  chambers: [
    { positionLabel: '12', name: 'Spark Mouth', pentad: '11303', function: 'hot start, appetite, first strike ignition', color: '#B91C1C' },
    { positionLabel: '1', name: 'Rush Coil', pentad: '14914', function: 'charge vector, velocity choice, pursuit line', color: '#D9462C' },
    { positionLabel: '2', name: 'Flare Array', pentad: '93585', function: 'signal blaze, dominance display, pressure bloom', color: '#F97316' },
    { positionLabel: '3', name: 'Forge Hinge', pentad: '38954', function: 'impact pivot, recoil reset, furnace restraint', color: '#EA580C' },
    { positionLabel: '4', name: 'Rib Furnace', pentad: '37787', function: 'core heat lift, breath power, body drive', color: '#FB923C' },
    { positionLabel: '5', name: 'Armor Clamp', pentad: '74590', function: 'combat posture, brace, hold-the-line stance', color: '#C2410C' },
    { positionLabel: '6', name: 'Ember Mirror', pentad: '99707', function: 'heat reflection, threat reading, aggression check', color: '#FBBF24' },
    { positionLabel: '7', name: 'Pounce Rail', pentad: '96196', function: 'burst leap, closing distance, kill-shot timing', color: '#FB7185' },
    { positionLabel: '8', name: 'Brand Key', pentad: '17525', function: 'marking, allegiance code, target lock imprint', color: '#F87171' },
    { positionLabel: '9', name: 'War Echo', pentad: '72156', function: 'battle memory, pattern exploitation, next-hit read', color: '#FDBA74' },
    { positionLabel: '10', name: 'Solar Bridge', pentad: '73323', function: 'crown heat to body force, command signal', color: '#F59E0B' },
    { positionLabel: '11', name: 'Ash Seal', pentad: '36510', function: 'spent-burn closure, scar memory, victory mark', color: '#7C2D12' },
  ],
  axes: [
    { from: 'Spark Mouth', to: 'Ember Mirror', title: 'Impulse meets control', meaning: 'Temper axis.' },
    { from: 'Rush Coil', to: 'Pounce Rail', title: 'Pursuit meets strike', meaning: 'Predator axis.' },
    { from: 'Flare Array', to: 'Brand Key', title: 'Display meets claim', meaning: 'Dominance axis.' },
    { from: 'Forge Hinge', to: 'War Echo', title: 'Impact meets memory', meaning: 'Combat-learning axis.' },
    { from: 'Rib Furnace', to: 'Solar Bridge', title: 'Body heat meets command', meaning: 'Authority axis.' },
    { from: 'Armor Clamp', to: 'Ash Seal', title: 'Defense meets aftermath', meaning: 'Survival axis.' },
  ],
  palette: [
    { name: 'Spark Mouth', hex: '#B91C1C', phase: 'Ignition / appetite' },
    { name: 'Rush Coil', hex: '#D9462C', phase: 'Acceleration / pursuit' },
    { name: 'Flare Array', hex: '#F97316', phase: 'Dominance / flare' },
    { name: 'Forge Hinge', hex: '#EA580C', phase: 'Impact / reset' },
    { name: 'Rib Furnace', hex: '#FB923C', phase: 'Embodiment / drive' },
    { name: 'Armor Clamp', hex: '#C2410C', phase: 'Brace / armor' },
    { name: 'Ember Mirror', hex: '#FBBF24', phase: 'Reading / heat reflection' },
    { name: 'Pounce Rail', hex: '#FB7185', phase: 'Closing / strike' },
    { name: 'Brand Key', hex: '#F87171', phase: 'Claim / mark' },
    { name: 'War Echo', hex: '#FDBA74', phase: 'Memory / adaptation' },
    { name: 'Solar Bridge', hex: '#F59E0B', phase: 'Command / force projection' },
    { name: 'Ash Seal', hex: '#7C2D12', phase: 'Afterglow / closure' },
  ],
  condensedPalette: STRAND_PACKET_SCAFFOLDS.red.condensedPalette,
  stats: [
    { label: 'Attack Pressure', value: 96 },
    { label: 'Agility', value: 85 },
    { label: 'Chaos Tolerance', value: 88 },
    { label: 'Defense / Stability', value: 61 },
    { label: 'Mystic Sense', value: 44 },
    { label: 'Pattern Recognition', value: 69 },
  ],
  profile: {
    genomeId: 'Red-60 / Ignition Vanguard Variant',
    speciesClass: 'Solar Fang Companion',
    element: 'Fire / Signal / Kinetic',
    temperament: 'Bold, immediate, territorial, momentum-hungry',
    nature: 'Vanguard-Hunter',
    summary: 'A body becoming a weapon, then learning how to focus its heat into command.',
    bondStyle: 'It bonds through challenge, earned respect, and proving you can handle its heat without flinching.',
    preferred: ['competitive games', 'sprints', 'strong rhythms', 'warm light', 'clear objectives'],
    dislikes: ['hesitation loops', 'cold inactivity', 'indirect commands', 'smothering restraint'],
    body: ['blade-like silhouette', 'heated chest core', 'crest or horned flare lines', 'muscular leap geometry', 'scar or brand motifs'],
    aura: ['ember halo', 'sun-orange body heat', 'gold spark trails', 'ash-red cooling edge'],
    abilities: STRAND_PACKET_SCAFFOLDS.red.abilities,
    weaknesses: STRAND_PACKET_SCAFFOLDS.red.weaknesses,
    evolution: STRAND_PACKET_SCAFFOLDS.red.evolution,
    cleanRead: ['Top = ignition', 'Right side = embodiment and force', 'Bottom = targeting and adaptation', 'Left side = command and aftermath'],
    styleNote: 'Use a furnace-red body, gold furnace seams, hot orange motion trails, and darker ash metal shadows to keep the packet aggressive but readable.',
  },
};

export const BLACK_STRAND_PACKET: FullStrandPacket = {
  ...STRAND_PACKET_SCAFFOLDS.black,
  status: 'full',
  coreAnchor: '#51606F',
  chambers: [
    { positionLabel: '12', name: 'Void Seed', pentad: '01123', function: 'silent birth, shadow onset, hidden pulse', color: '#0F172A' },
    { positionLabel: '1', name: 'Grave Coil', pentad: '58314', function: 'stealth direction, shadow turn, retreat line', color: '#1E293B' },
    { positionLabel: '2', name: 'Archive Bloom', pentad: '59437', function: 'memory flare, concealed pattern recall, latent reveal', color: '#334155' },
    { positionLabel: '3', name: 'Null Hinge', pentad: '07741', function: 'blank pivot, silence reset, disappearance point', color: '#475569' },
    { positionLabel: '4', name: 'Vault Spine', pentad: '56178', function: 'buried strength, old weight, skeletal structure', color: '#64748B' },
    { positionLabel: '5', name: 'Shade Clamp', pentad: '53819', function: 'containment, reserve, pressure held in dark', color: '#1F2937' },
    { positionLabel: '6', name: 'Night Mirror', pentad: '09987', function: 'concealed reflection, fear reading, echo return', color: '#94A3B8' },
    { positionLabel: '7', name: 'Drift Vector', pentad: '52796', function: 'phase shift, evasive slide, mutation path', color: '#312E81' },
    { positionLabel: '8', name: 'Crypt Key', pentad: '51673', function: 'sealed trait access, hidden route unlock, dormant trigger', color: '#4338CA' },
    { positionLabel: '9', name: 'Umbra Echo', pentad: '03369', function: 'future through residue, omen pulse, void forecast', color: '#6366F1' },
    { positionLabel: '10', name: 'Abyss Bridge', pentad: '54932', function: 'memory to body bridge, unseen authority', color: '#475569' },
    { positionLabel: '11', name: 'Cinder Return', pentad: '57291', function: 'shadow closure, archive seal, dormant identity', color: '#111827' },
  ],
  axes: [
    { from: 'Void Seed', to: 'Night Mirror', title: 'Silence meets reflection', meaning: 'Identity-shadow axis.' },
    { from: 'Grave Coil', to: 'Drift Vector', title: 'Stealth meets mutation', meaning: 'Evasion axis.' },
    { from: 'Archive Bloom', to: 'Crypt Key', title: 'Memory meets access', meaning: 'Archive axis.' },
    { from: 'Null Hinge', to: 'Umbra Echo', title: 'Absence meets omen', meaning: 'Divination axis.' },
    { from: 'Vault Spine', to: 'Abyss Bridge', title: 'Weight meets unseen command', meaning: 'Authority axis.' },
    { from: 'Shade Clamp', to: 'Cinder Return', title: 'Containment meets dormancy', meaning: 'Preservation axis.' },
  ],
  palette: [
    { name: 'Void Seed', hex: '#0F172A', phase: 'Silence / emergence' },
    { name: 'Grave Coil', hex: '#1E293B', phase: 'Stealth / direction' },
    { name: 'Archive Bloom', hex: '#334155', phase: 'Memory / flare' },
    { name: 'Null Hinge', hex: '#475569', phase: 'Reset / vanishing point' },
    { name: 'Vault Spine', hex: '#64748B', phase: 'Embodiment / reserve' },
    { name: 'Shade Clamp', hex: '#1F2937', phase: 'Containment / pressure' },
    { name: 'Night Mirror', hex: '#94A3B8', phase: 'Reflection / omen read' },
    { name: 'Drift Vector', hex: '#312E81', phase: 'Phase drift / mutation' },
    { name: 'Crypt Key', hex: '#4338CA', phase: 'Unlock / dormant access' },
    { name: 'Umbra Echo', hex: '#6366F1', phase: 'Prophecy / residue forecast' },
    { name: 'Abyss Bridge', hex: '#475569', phase: 'Authority / hidden bridge' },
    { name: 'Cinder Return', hex: '#111827', phase: 'Dormancy / sealed return' },
  ],
  condensedPalette: STRAND_PACKET_SCAFFOLDS.black.condensedPalette,
  stats: [
    { label: 'Mystic Sense', value: 91 },
    { label: 'Defense / Stability', value: 84 },
    { label: 'Curiosity', value: 79 },
    { label: 'Attack Pressure', value: 57 },
    { label: 'Pattern Recognition', value: 87 },
    { label: 'Chaos Tolerance', value: 72 },
  ],
  profile: {
    genomeId: 'Black-60 / Umbra Archive Variant',
    speciesClass: 'Umbra Archive Familiar',
    element: 'Void / Earth / Memory',
    temperament: 'Quiet, watchful, patient, mutation-aware',
    nature: 'Archivist-Seer',
    summary: 'A shadow becoming memory, then using memory to move unseen through change.',
    bondStyle: 'It bonds slowly through secrecy, consistency, and proving you can hold what it reveals without breaking trust.',
    preferred: ['dim spaces', 'slow study', 'echoing rooms', 'secret routes', 'long observation'],
    dislikes: ['floodlights', 'careless exposure', 'forced noise', 'constant interruption'],
    body: ['obsidian shell contours', 'vault-like chest mark', 'pale eye pinlights', 'shadow seam geometry', 'crescent or archive sigils'],
    aura: ['smoke-slate drift', 'deep indigo edge', 'silver residue sparks', 'near-black calm field'],
    abilities: STRAND_PACKET_SCAFFOLDS.black.abilities,
    weaknesses: STRAND_PACKET_SCAFFOLDS.black.weaknesses,
    evolution: STRAND_PACKET_SCAFFOLDS.black.evolution,
    cleanRead: ['Top = emergence from silence', 'Right side = embodiment and concealment', 'Bottom = mutation and unlocking', 'Left side = omen and sealed return'],
    styleNote: 'Use layered charcoal, slate, indigo, and silver residue glows so the packet feels archival and spectral instead of flat dark mode.',
  },
};

export const FULL_STRAND_PACKETS: Record<StrandPacketKey, FullStrandPacket> = {
  red: RED_STRAND_PACKET,
  blue: BLUE_STRAND_PACKET,
  black: BLACK_STRAND_PACKET,
};
