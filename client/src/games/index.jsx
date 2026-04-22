import React from 'react'
import LabyrinthGame  from './labyrinth/LabyrinthGame.jsx'
import HeartbeatGame  from './heartbeat/HeartbeatGame.jsx'
import HarmonyGame    from './harmony/HarmonyGame.jsx'
import RecipeRushGame from './recipe-rush/RecipeRushGame.jsx'
import TasteTestGame  from './taste-test/TasteTestGame.jsx'
import GrowTogetherGame from './grow-together/GrowTogetherGame.jsx'
import StirGame       from './stir-together/StirGame.jsx'
import GearTrainGame      from './gear-train/GearTrainGame.jsx'
import BlueprintReaderGame from './blueprint-reader/BlueprintReaderGame.jsx'
import TandemTypingGame   from './tandem-typing/TandemTypingGame.jsx'
import RubeGoldbergGame   from './rube-goldberg/RubeGoldbergGame.jsx'
import ButterflyChaseGame from './butterfly-chase/ButterflyChaseGame.jsx'
import BridgeOfVinesGame  from './bridge-of-vines/BridgeOfVinesGame.jsx'
import DiceRollGame       from './dice-roll/DiceRollGame.jsx'
import MemoryLaneGame     from './memory-lane/MemoryLaneGame.jsx'
import TwentyQuestionsGame from './twenty-questions/TwentyQuestionsGame.jsx'
// Chapter 4 – The Concert Hall
import CallResponseGame from './call-response/CallResponseGame.jsx'
import ConductorGame    from './conductor/ConductorGame.jsx'
import MirrorDrawGame   from './mirror-draw/MirrorDrawGame.jsx'
import DuetGame         from './duet/DuetGame.jsx'
// Chapter 5 – The Storm
import LightTheWayGame  from './light-the-way/LightTheWayGame.jsx'
import SignalFlagsGame  from './signal-flags/SignalFlagsGame.jsx'
import TidePoolsGame    from './tide-pools/TidePoolsGame.jsx'
import StormGame        from './storm/StormGame.jsx'

// ── Placeholder for games still in development ──────────────────────────────
const GAME_NAMES = {
  butterfly_chase:  'Butterfly Chase',
  bridge_of_vines:  'Bridge of Vines',
  recipe_rush:      'Recipe Rush',
  grow_together:    'Grow Together',
  stir_together:    'Stir Together',
  taste_test:       'Taste Test',
  gear_train:       'Gear Train',
  blueprint_reader: 'Blueprint Reader',
  rube_goldberg:    'Rube Goldberg Machine',
  call_response:    'Call & Response',
  conductor:        'Conductor',
  duet:             'The Duet',
  light_the_way:    'Light the Way',
  signal_flags:     'Signal Flags',
  tide_pools:       'Tide Pools',
  storm:            'The Storm',
  dice_roll:        'Dice Roll',
  memory_lane:      'Memory Lane',
  final_labyrinth:  'The Final Labyrinth',
  mirror_draw:      'Mirror Draw',
  twenty_questions: 'Twenty Questions',
  tandem_typing:    'Tandem Typing',
}

function ComingSoon({ gameId }) {
  const title = GAME_NAMES[gameId] || gameId
  return (
    <div className="flex flex-col items-center justify-center h-full bg-paper-cream gap-5 px-8">
      <div className="text-6xl">🚧</div>
      <div className="font-handwriting text-3xl font-bold text-paper-card-dark text-center">
        {title}
      </div>
      <p className="font-body text-sm text-paper-card-dark/55 text-center leading-relaxed max-w-xs">
        We're still hand-crafting this one.<br />Coming in the next update!
      </p>
    </div>
  )
}

const placeholder = (gameId) => function Placeholder(props) {
  return <ComingSoon gameId={gameId} {...props} />
}

// ── Registry ─────────────────────────────────────────────────────────────────
// As new game components are built, import them statically above and swap
// their placeholder() entries for the real component.

export const GAME_REGISTRY = {
  // ── Chapter 1 ─────────────────────────────────────────────────────────────
  harmony:         HarmonyGame,
  butterfly_chase: ButterflyChaseGame,
  bridge_of_vines: BridgeOfVinesGame,
  recipe_rush:     RecipeRushGame,
  labyrinth:       LabyrinthGame,          // boss

  // ── Chapter 2 ─────────────────────────────────────────────────────────────
  grow_together:   GrowTogetherGame,
  stir_together:   StirGame,
  heartbeat:       HeartbeatGame,
  taste_test:      TasteTestGame,  // boss

  // ── Chapter 3 ─────────────────────────────────────────────────────────────
  gear_train:       GearTrainGame,
  blueprint_reader: BlueprintReaderGame,
  tandem_typing:    TandemTypingGame,
  rube_goldberg:    RubeGoldbergGame,              // boss

  // ── Chapter 4 ─────────────────────────────────────────────────────────────
  call_response:    CallResponseGame,
  conductor:        ConductorGame,
  mirror_draw:      MirrorDrawGame,
  duet:             DuetGame,           // boss

  // ── Chapter 5 ─────────────────────────────────────────────────────────────
  light_the_way:    LightTheWayGame,
  signal_flags:     SignalFlagsGame,
  tide_pools:       TidePoolsGame,
  storm:            StormGame,          // boss

  // ── Chapter 6 ─────────────────────────────────────────────────────────────
  dice_roll:        DiceRollGame,
  memory_lane:      MemoryLaneGame,
  twenty_questions: TwentyQuestionsGame,
  final_labyrinth:  LabyrinthGame,                 // boss (reuse labyrinth engine)
}

export default GAME_REGISTRY
