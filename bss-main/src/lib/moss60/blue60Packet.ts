import { MOSS_BLUE_STRAND } from '@/lib/moss60/strandSequences';

export const BLUE60_CORRECTED_STRAND = MOSS_BLUE_STRAND;

export const BLUE60_CORE_ANCHOR = '#125DFF';

export interface Blue60Chamber {
  readonly positionLabel: string;
  readonly name: string;
  readonly pentad: string;
  readonly function: string;
  readonly color: string;
}

export interface Blue60Axis {
  readonly from: string;
  readonly to: string;
  readonly title: string;
  readonly meaning: string;
}

export interface Blue60PaletteEntry {
  readonly name: string;
  readonly hex: string;
  readonly phase: string;
}

export interface Blue60Stat {
  readonly label: string;
  readonly value: number;
}

export const BLUE60_CHAMBERS: readonly Blue60Chamber[] = [
  {
    positionLabel: '12',
    name: 'Seed Gate',
    pentad: '01277',
    function: 'ignition from void, first spin-up, cold birth pulse',
    color: '#0A3BE0',
  },
  {
    positionLabel: '1',
    name: 'Turn Coil',
    pentad: '63297',
    function: 'directional intelligence, steering, orbit choice',
    color: '#6157FC',
  },
  {
    positionLabel: '2',
    name: 'Signal Bloom',
    pentad: '85893',
    function: 'pattern flare, recognition burst, halo widening',
    color: '#817CF7',
  },
  {
    positionLabel: '3',
    name: 'Void Hinge',
    pentad: '03611',
    function: 'silence point, internal pivot, reset chamber',
    color: '#0C5D82',
  },
  {
    positionLabel: '4',
    name: 'Spine Rise',
    pentad: '89671',
    function: 'vertical lift, posture, central nervous lattice',
    color: '#86B2D7',
  },
  {
    positionLabel: '5',
    name: 'Frame Lock',
    pentad: '45479',
    function: 'chassis stability, geometry brace, body coherence',
    color: '#4876E2',
  },
  {
    positionLabel: '6',
    name: 'Mirror Chamber',
    pentad: '09833',
    function: 'reflection, self-check, feedback correction',
    color: '#15B4A2',
  },
  {
    positionLabel: '7',
    name: 'Climb Vector',
    pentad: '47813',
    function: 'ascent, adaptation, evolutionary push',
    color: '#4B9885',
  },
  {
    positionLabel: '8',
    name: 'Key Weave',
    pentad: '25217',
    function: 'trait encoding, access logic, unlock pattern',
    color: '#2B748B',
  },
  {
    positionLabel: '9',
    name: 'Oracle Echo',
    pentad: '07499',
    function: 'foresight pulse, resonance, prediction loop',
    color: '#1293FF',
  },
  {
    positionLabel: '10',
    name: 'Crown Bridge',
    pentad: '21439',
    function: 'halo-to-body connection, higher-order awareness',
    color: '#263EAA',
  },
  {
    positionLabel: '11',
    name: 'Seal Return',
    pentad: '65631',
    function: 'closure, identity seal, completed body-form',
    color: '#64799F',
  },
];

export const BLUE60_AXES: readonly Blue60Axis[] = [
  {
    from: 'Seed Gate',
    to: 'Mirror Chamber',
    title: 'Birth meets reflection',
    meaning: 'Core who-am-I axis.',
  },
  {
    from: 'Turn Coil',
    to: 'Climb Vector',
    title: 'Steering meets growth',
    meaning: 'Evolution axis.',
  },
  {
    from: 'Signal Bloom',
    to: 'Key Weave',
    title: 'Recognition meets encoding',
    meaning: 'Learning axis.',
  },
  {
    from: 'Void Hinge',
    to: 'Oracle Echo',
    title: 'Silence meets prophecy',
    meaning: 'Inner vision axis.',
  },
  {
    from: 'Spine Rise',
    to: 'Crown Bridge',
    title: 'Body meets halo',
    meaning: 'Consciousness axis.',
  },
  {
    from: 'Frame Lock',
    to: 'Seal Return',
    title: 'Structure meets completion',
    meaning: 'Integrity axis.',
  },
];

export const BLUE60_PALETTE: readonly Blue60PaletteEntry[] = BLUE60_CHAMBERS.map(chamber => ({
  name: chamber.name,
  hex: chamber.color,
  phase:
    chamber.positionLabel === '12' || chamber.positionLabel === '1' || chamber.positionLabel === '2'
      ? 'Awakening / signal bloom'
      : chamber.positionLabel === '3' || chamber.positionLabel === '4' || chamber.positionLabel === '5'
        ? 'Embodiment / frame formation'
        : chamber.positionLabel === '6' || chamber.positionLabel === '7' || chamber.positionLabel === '8'
          ? 'Reflection / adaptive intelligence'
          : 'Oracle closure / mature identity',
}));

export const BLUE60_CONDENSED_PALETTE = [
  { name: 'Deep Seed Blue', hex: '#0A3BE0' },
  { name: 'Oracle Violet-Blue', hex: '#6157FC' },
  { name: 'Spine Mist', hex: '#86B2D7' },
  { name: 'Mirror Teal', hex: '#15B4A2' },
  { name: 'Crown Sapphire', hex: '#1293FF' },
] as const;

export const BLUE60_STATS: readonly Blue60Stat[] = [
  { label: 'Form Integrity', value: 95 },
  { label: 'Pattern Recognition', value: 97 },
  { label: 'Focus', value: 92 },
  { label: 'Curiosity', value: 84 },
  { label: 'Empathy', value: 76 },
  { label: 'Agility', value: 73 },
  { label: 'Attack Pressure', value: 48 },
  { label: 'Defense / Stability', value: 90 },
  { label: 'Mystic Sense', value: 94 },
  { label: 'Chaos Tolerance', value: 68 },
] as const;

export const BLUE60_PROFILE = {
  genomeId: 'Blue-60 / Corrected Frame-Lock Variant',
  speciesClass: 'Oracle Lattice Companion',
  element: 'Signal / Water / Aether',
  temperament: 'Calm, observant, recursive, high-pattern-attunement',
  nature: 'Architect-Seer',
  summary: 'A mind becoming a body, then reflecting on itself until it stabilizes as identity.',
  bondStyle: 'It becomes deeply loyal once it decides you are structurally safe.',
  cleanRead: ['Top = emergence', 'Right side = embodiment', 'Bottom = self-reflection and mutation', 'Left side = prophecy and sealing'],
  styleNote: 'Midnight background, dirty gold linework, cyan glow accents, and pale silver eye highlights keep the packet in the Blue field without drifting off-brand.',
  preferred: ['patterns', 'repeating music', 'moonlit environments', 'puzzles', 'stable routines with hidden variation'],
  dislikes: ['noise spikes', 'jagged asymmetry', 'abrupt colour clashes', 'chaotic input with no pattern to resolve'],
  body: ['sleek, symmetrical body plan', 'clean chest plate or central jewel', 'halo ring or segmented crownwheel behind head', 'spine-lattice markings', 'thin gold sacred trim'],
  aura: ['sapphire core', 'cyan-teal reflection mist', 'violet intelligence flare at high focus', 'pale silver-blue at rest'],
  abilities: ['Symmetry Lock', 'Oracle Echo', 'Frame Brace', 'Mirror Chamber', 'Key Weave'],
  weaknesses: ['random burst aggression', 'noisy red-spectrum overload', 'environments with no repeating logic', 'corrupt or asymmetrical pattern fields'],
  evolution: ['Blue Seedling', 'Lattice Familiar', 'Oracle Guardian', 'Crownbridge Seraph'],
} as const;
