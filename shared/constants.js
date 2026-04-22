'use strict';

// ─── Game IDs ────────────────────────────────────────────────────────────────

const GAME_IDS = {
  // Chapter 1 – The First Thread
  LABYRINTH: 'labyrinth',
  HARMONY: 'harmony',
  RECIPE_RUSH: 'recipe_rush',
  BUTTERFLY_CHASE: 'butterfly_chase',
  BRIDGE_OF_VINES: 'bridge_of_vines',

  // Chapter 2 – Shared Kitchen
  GROW_TOGETHER: 'grow_together',
  STIR_TOGETHER: 'stir_together',
  TASTE_TEST: 'taste_test',

  // Chapter 3 – The Workshop
  GEAR_TRAIN: 'gear_train',
  BLUEPRINT_READER: 'blueprint_reader',
  RUBE_GOLDBERG: 'rube_goldberg',

  // Chapter 4 – The Concert Hall
  CALL_RESPONSE: 'call_response',
  CONDUCTOR: 'conductor',
  DUET: 'duet',

  // Chapter 5 – The Storm
  LIGHT_THE_WAY: 'light_the_way',
  SIGNAL_FLAGS: 'signal_flags',
  TIDE_POOLS: 'tide_pools',
  STORM: 'storm',

  // Chapter 6 – The Summit
  DICE_ROLL: 'dice_roll',
  MEMORY_LANE: 'memory_lane',
  FINAL_LABYRINTH: 'final_labyrinth',

  // Special / Cross-chapter
  HEARTBEAT: 'heartbeat',
  MIRROR_DRAW: 'mirror_draw',
  TWENTY_QUESTIONS: 'twenty_questions',
  TANDEM_TYPING: 'tandem_typing',
};

// ─── Chapters ─────────────────────────────────────────────────────────────────

const CHAPTERS = [
  {
    id: 1,
    name: 'The First Thread',
    theme: 'forest_dawn',
    miniGames: [
      GAME_IDS.HARMONY,
      GAME_IDS.BUTTERFLY_CHASE,
      GAME_IDS.BRIDGE_OF_VINES,
      GAME_IDS.RECIPE_RUSH,
    ],
    bossGame: GAME_IDS.LABYRINTH,
    charmId: 'charm_first_thread',
  },
  {
    id: 2,
    name: 'The Shared Kitchen',
    theme: 'warm_hearth',
    miniGames: [
      GAME_IDS.GROW_TOGETHER,
      GAME_IDS.STIR_TOGETHER,
      GAME_IDS.HEARTBEAT,
    ],
    bossGame: GAME_IDS.TASTE_TEST,
    charmId: 'charm_shared_kitchen',
  },
  {
    id: 3,
    name: 'The Workshop',
    theme: 'copper_gears',
    miniGames: [
      GAME_IDS.GEAR_TRAIN,
      GAME_IDS.BLUEPRINT_READER,
      GAME_IDS.TANDEM_TYPING,
    ],
    bossGame: GAME_IDS.RUBE_GOLDBERG,
    charmId: 'charm_workshop',
  },
  {
    id: 4,
    name: 'The Concert Hall',
    theme: 'velvet_stage',
    miniGames: [
      GAME_IDS.CALL_RESPONSE,
      GAME_IDS.CONDUCTOR,
      GAME_IDS.MIRROR_DRAW,
    ],
    bossGame: GAME_IDS.DUET,
    charmId: 'charm_concert_hall',
  },
  {
    id: 5,
    name: 'The Storm',
    theme: 'dark_sea',
    miniGames: [
      GAME_IDS.LIGHT_THE_WAY,
      GAME_IDS.SIGNAL_FLAGS,
      GAME_IDS.TIDE_POOLS,
    ],
    bossGame: GAME_IDS.STORM,
    charmId: 'charm_storm',
  },
  {
    id: 6,
    name: 'The Summit',
    theme: 'golden_peak',
    miniGames: [
      GAME_IDS.DICE_ROLL,
      GAME_IDS.MEMORY_LANE,
      GAME_IDS.TWENTY_QUESTIONS,
    ],
    bossGame: GAME_IDS.FINAL_LABYRINTH,
    charmId: 'charm_summit',
  },
];

// ─── Chapter Themes ───────────────────────────────────────────────────────────

const CHAPTER_THEMES = {
  forest_dawn: {
    primaryColor: '#4A7C59',
    secondaryColor: '#A8D8A8',
    accentColor: '#F6E596',
    background: '#1B4332',
    description: 'Misty forest at first light, dappled greens and soft gold',
  },
  warm_hearth: {
    primaryColor: '#C1440E',
    secondaryColor: '#F4A261',
    accentColor: '#FEFAE0',
    background: '#5C1A1B',
    description: 'Crackling fire, terracotta tiles, the smell of fresh bread',
  },
  copper_gears: {
    primaryColor: '#B5651D',
    secondaryColor: '#CD7F32',
    accentColor: '#E8D5B7',
    background: '#2C1810',
    description: 'Steam-punk workshop, gleaming copper, oil-stained blueprints',
  },
  velvet_stage: {
    primaryColor: '#6A0572',
    secondaryColor: '#C77DFF',
    accentColor: '#F8F3FF',
    background: '#1A0027',
    description: 'Deep velvet curtains, a single spotlight, polished wood floors',
  },
  dark_sea: {
    primaryColor: '#023E8A',
    secondaryColor: '#0077B6',
    accentColor: '#90E0EF',
    background: '#03045E',
    description: 'Midnight ocean, distant lightning, salt-spray and urgency',
  },
  golden_peak: {
    primaryColor: '#D4AF37',
    secondaryColor: '#FFD700',
    accentColor: '#FFFDE7',
    background: '#1C1C1C',
    description: 'Mountain summit at golden hour, vast sky, everything earned',
  },
};

// ─── Character Colors ─────────────────────────────────────────────────────────

const COLORS = [
  { name: 'Parchment',   hex: '#F5E6C8' },
  { name: 'Blush',       hex: '#F2C4CE' },
  { name: 'Sage',        hex: '#B2C9AD' },
  { name: 'Sky',         hex: '#AED6F1' },
  { name: 'Lavender',    hex: '#D7BDE2' },
  { name: 'Peach',       hex: '#FDDCAE' },
  { name: 'Mint',        hex: '#ABEBC6' },
  { name: 'Lilac',       hex: '#C9B1D9' },
];

// ─── Accessories ──────────────────────────────────────────────────────────────

const ACCESSORIES = [
  'hat',
  'glasses',
  'scarf',
  'headband',
  'bow',
  'bandana',
];

// ─── Room Status ──────────────────────────────────────────────────────────────

const ROOM_STATUS = {
  LOBBY: 'lobby',
  PLAYING: 'playing',
  RESULTS: 'results',
  ENDED: 'ended',
};

// ─── Limits & Rates ───────────────────────────────────────────────────────────

const MAX_PLAYERS = 2;

const TICK_RATES = {
  physics: 30,
  rhythm: 60,
  turnBased: 10,
};

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  GAME_IDS,
  CHAPTERS,
  CHAPTER_THEMES,
  COLORS,
  ACCESSORIES,
  ROOM_STATUS,
  MAX_PLAYERS,
  TICK_RATES,
};
