'use strict';

/**
 * BotPlayer — server-side automation for solo Play Mode.
 *
 * When a player starts a game alone the server adds a virtual bot to fill
 * the second-player slot.  The bot calls engine.processInput() directly at
 * 20 Hz based on game-specific behaviours defined below.
 */

// ─── Per-game behaviours ──────────────────────────────────────────────────────

function botHarmony(engine, botId, state) {
  if (!engine.pendingNotes || engine.finished) return;
  for (const note of engine.pendingNotes) {
    if (note.hit || note.missed || note.player !== 2) continue;
    const diff = engine.songTime - note.time;
    // Hit window: song time is within -60 to +100 ms of the note's beat
    if (diff >= -60 && diff <= 100) {
      engine.processInput(botId, 'tap', {
        noteId: note.noteId,
        laneIdx: note.lane,
        timestamp: Date.now(),
      });
      break; // one tap per tick
    }
  }
}

function botHeartbeat(engine, botId, state) {
  const now = Date.now();
  if (!state.lastTap) state.lastTap = now - 600;
  const interval = 820 + Math.random() * 180; // 820-1000 ms feels human
  if (now - state.lastTap >= interval) {
    state.lastTap = now;
    engine.processInput(botId, 'tap', { timestamp: now });
  }
}

function botButterflyChase(engine, botId, state) {
  if (!engine.butterflies) return;
  const now = Date.now();
  if (!state.lastTap) state.lastTap = 0;
  if (now - state.lastTap < 350) return; // tap every ~350 ms
  state.lastTap = now;
  const b2 = (engine.butterflies[2] || []).find(b => !b.caught);
  if (b2) {
    engine.processInput(botId, 'tap', {
      x: b2.x + (Math.random() - 0.5) * 0.04,
      y: b2.y + (Math.random() - 0.5) * 0.04,
    });
  }
}

function botRecipeRush(engine, botId, state) {
  const now = Date.now();
  if (!state.lastAction) state.lastAction = now;
  // Confirm each cooking step ~2.5s after it appears
  if (now - state.lastAction >= 2500) {
    state.lastAction = now;
    engine.processInput(botId, 'confirmStep', {});
    engine.processInput(botId, 'startCooking', {});
  }
}

function botStirTogether(engine, botId, state) {
  const now = Date.now();
  if (!state.lastStir) state.lastStir = 0;
  if (now - state.lastStir < 250) return;
  state.lastStir = now;
  engine.processInput(botId, 'stir', {
    direction: state.dir || 'cw',
    speed: 0.7 + Math.random() * 0.3,
  });
  // Alternate direction occasionally
  if (!state.dirTick) state.dirTick = 0;
  state.dirTick++;
  if (state.dirTick % 20 === 0) state.dir = state.dir === 'cw' ? 'ccw' : 'cw';
}

function botGrowTogether(engine, botId, state) {
  const now = Date.now();
  if (!state.lastWater) state.lastWater = 0;
  if (now - state.lastWater < 2000) return;
  state.lastWater = now;
  engine.processInput(botId, 'water', { plantIndex: state.plantIdx || 0 });
  state.plantIdx = ((state.plantIdx || 0) + 1) % 3;
}

function botTasteTest(engine, botId, state) {
  const now = Date.now();
  if (!state.lastGuess) state.lastGuess = now;
  if (now - state.lastGuess < 4000) return;
  state.lastGuess = now;
  // Bot picks the first available answer option
  const options = engine.currentOptions || engine.options || [];
  if (options.length > 0) {
    engine.processInput(botId, 'guess', { answer: options[0] });
  } else {
    engine.processInput(botId, 'confirm', {});
  }
}

function botGearTrain(engine, botId, state) {
  // P2 sends direction feedback; P1 (human) controls tap rate
  const now = Date.now();
  if (!state.lastSend) state.lastSend = 0;
  if (now - state.lastSend < 600) return;
  state.lastSend = now;
  const rpm = engine.currentRPM || 0;
  const target = engine.targetRPM || 60;
  const direction = rpm < target - 5 ? 'faster' : rpm > target + 5 ? 'slower' : 'hold';
  engine.processInput(botId, 'direction', { direction });
}

function botBlueprintReader(engine, botId, state) {
  const now = Date.now();
  if (!state.lastPlace) state.lastPlace = 0;
  if (now - state.lastPlace < 4000) return;
  state.lastPlace = now;
  // Place the current expected shape/color (bot has access to engine state)
  const current = engine.currentShape || {};
  engine.processInput(botId, 'place', {
    shape: current.shape || 'circle',
    color: current.color || 'red',
  });
}

function botTandemTyping(engine, botId, state) {
  const now = Date.now();
  if (!state.lastKey) state.lastKey = 0;
  if (now - state.lastKey < 400) return;
  state.lastKey = now;
  // Type the current expected letter if it's the bot's turn
  const expected = engine.expectedLetter || '';
  const whoNext  = engine.whoseTurn || 1;
  const players  = engine.room.players || [];
  const botIdx   = players.findIndex(p => p.id === botId) + 1;
  if (whoNext === botIdx && expected) {
    engine.processInput(botId, 'type', { letter: expected });
  }
}

function botCallResponse(engine, botId, state) {
  const now = Date.now();
  if (!state.lastAction) state.lastAction = 0;
  if (now - state.lastAction < 1200) return;
  state.lastAction = now;
  // Echo back whatever the engine expects
  const pattern = engine.recordedPattern || engine.currentPattern || [];
  if (engine.phase === 'response' && pattern.length) {
    if (!state.patternIdx) state.patternIdx = 0;
    if (state.patternIdx < pattern.length) {
      engine.processInput(botId, 'tap', { t: pattern[state.patternIdx] });
      state.patternIdx++;
    } else {
      state.patternIdx = 0;
    }
  }
}

function botConductor(engine, botId, state) {
  // Bot maintains tempo by tapping at the current BPM
  const now = Date.now();
  const bpm = engine.currentBPM || 90;
  const interval = 60000 / bpm;
  if (!state.lastBeat) state.lastBeat = now;
  if (now - state.lastBeat >= interval) {
    state.lastBeat = now;
    engine.processInput(botId, 'beat', { timestamp: now });
  }
}

function botDuet(engine, botId, state) {
  // Same as Harmony — tap notes for player 2
  botHarmony(engine, botId, state);
}

function botLightTheWay(engine, botId, state) {
  // P2 sends move commands based on the map
  const now = Date.now();
  if (!state.lastMove) state.lastMove = 0;
  if (now - state.lastMove < 800) return;
  state.lastMove = now;
  const dirs = ['up','right','down','left'];
  const dir  = dirs[Math.floor(state.step || 0) % dirs.length];
  engine.processInput(botId, 'move', { direction: dir });
  state.step = (state.step || 0) + 1;
}

function botSignalFlags(engine, botId, state) {
  const now = Date.now();
  if (!state.lastSignal) state.lastSignal = 0;
  if (now - state.lastSignal < 2000) return;
  state.lastSignal = now;
  const flags = engine.currentFlags || engine.sequence || [];
  if (flags.length) {
    engine.processInput(botId, 'signal', { flag: flags[state.flagIdx || 0] });
    state.flagIdx = ((state.flagIdx || 0) + 1) % flags.length;
  }
}

function botTidePools(engine, botId, state) {
  const now = Date.now();
  if (!state.lastTap) state.lastTap = 0;
  if (now - state.lastTap < 2500) return;
  state.lastTap = now;
  // Hold up the first available creature
  const creatures = engine.creatures2 || engine.grid2 || [];
  const first = creatures.find ? creatures.find(c => !c.matched) : null;
  if (first) {
    engine.processInput(botId, 'hold', { creatureType: first.type || first });
  }
}

function botStorm(engine, botId, state) {
  const now = Date.now();
  if (!state.lastAdj) state.lastAdj = 0;
  if (now - state.lastAdj < 500) return;
  state.lastAdj = now;
  // Keep rudder near center to maintain a straight course
  engine.processInput(botId, 'rudder', { value: 50 + (Math.random() - 0.5) * 10 });
}

function botDiceRoll(engine, botId, state) {
  const now = Date.now();
  if (!state.lastAction) state.lastAction = 0;
  if (now - state.lastAction < 3000) return;
  state.lastAction = now;
  engine.processInput(botId, 'reroll', {});
  setTimeout(() => engine.processInput(botId, 'submit', {}), 1200);
}

function botMemoryLane(engine, botId, state) {
  const now = Date.now();
  if (!state.lastAnswer) state.lastAnswer = 0;
  if (now - state.lastAnswer < 3000) return;
  state.lastAnswer = now;
  // Answer position questions (bot is P2, gets position questions)
  const q = engine.currentQuestion;
  if (q && q.player === 2) {
    engine.processInput(botId, 'answer', {
      answer: q.correctAnswer || q.options?.[0] || 0,
    });
  }
}

function botTwentyQuestions(engine, botId, state) {
  const now = Date.now();
  if (!state.lastAnswer) state.lastAnswer = 0;
  if (now - state.lastAnswer < 2500) return;
  state.lastAnswer = now;
  // If bot is secret-keeper (P1), answer the pending question
  if (engine.pendingQuestion !== undefined && engine.secretWord) {
    const answer = Math.random() > 0.4; // mostly yes to move the game
    engine.processInput(botId, answer ? 'yes' : 'no', {});
  }
  // If bot is guesser (P2), ask a question
  if (engine.phase === 'questions') {
    const questions = engine.unusedQuestions || [];
    if (questions.length) {
      engine.processInput(botId, 'ask', { questionIndex: 0 });
    }
  }
}

function botMirrorDraw(engine, botId, state) {
  const now = Date.now();
  if (!state.lastDraw) state.lastDraw = 0;
  if (engine.phase !== 'tracing' || now - state.lastDraw < 5000) return;
  state.lastDraw = now;
  // Submit a simple traced path
  engine.processInput(botId, 'submitTrace', { points: [] });
}

function botRubeGoldberg(engine, botId, state) {
  const now = Date.now();
  if (!state.placed) state.placed = false;
  if (state.placed || now - (state.lastPlace || 0) < 3000) return;
  state.lastPlace = now;
  // Place a redirect component in the bot's zone
  engine.processInput(botId, 'place', { component: 'redirect', col: 9, row: 4 });
  engine.processInput(botId, 'ready', {});
  state.placed = true;
}

function botBridgeOfVines(engine, botId, state) {
  const now = Date.now();
  if (!state.lastTap) state.lastTap = 0;
  if (now - state.lastTap < 1800) return;
  state.lastTap = now;
  engine.processInput(botId, 'tap', { timestamp: now });
}

// ─── Generic fallback ─────────────────────────────────────────────────────────

function botGeneric(engine, botId, state) {
  const now = Date.now();
  if (!state.lastTap) state.lastTap = 0;
  if (now - state.lastTap < 3000) return;
  state.lastTap = now;
  // Try a variety of common input types
  engine.processInput(botId, 'tap',     { timestamp: now, x: 0.5, y: 0.5 });
  engine.processInput(botId, 'confirm', { timestamp: now });
}

// ─── Behaviour map ────────────────────────────────────────────────────────────

const BEHAVIOURS = {
  harmony:          botHarmony,
  heartbeat:        botHeartbeat,
  butterfly_chase:  botButterflyChase,
  recipe_rush:      botRecipeRush,
  stir_together:    botStirTogether,
  grow_together:    botGrowTogether,
  taste_test:       botTasteTest,
  gear_train:       botGearTrain,
  blueprint_reader: botBlueprintReader,
  tandem_typing:    botTandemTyping,
  call_response:    botCallResponse,
  conductor:        botConductor,
  mirror_draw:      botMirrorDraw,
  duet:             botDuet,
  final_labyrinth:  botGeneric,  // Labyrinth is fully P1; bot can be silent
  labyrinth:        botGeneric,
  light_the_way:    botLightTheWay,
  signal_flags:     botSignalFlags,
  tide_pools:       botTidePools,
  storm:            botStorm,
  dice_roll:        botDiceRoll,
  memory_lane:      botMemoryLane,
  twenty_questions: botTwentyQuestions,
  rube_goldberg:    botRubeGoldberg,
  bridge_of_vines:  botBridgeOfVines,
};

// ─── BotPlayer class ──────────────────────────────────────────────────────────

class BotPlayer {
  constructor(engine, botPlayerId, gameId) {
    this.engine      = engine;
    this.botPlayerId = botPlayerId;
    this.gameId      = gameId;
    this.state       = {};
    this._interval   = null;
  }

  start() {
    if (this._interval) return;
    this._interval = setInterval(() => {
      try {
        if (!this.engine.isRunning) return;
        const fn = BEHAVIOURS[this.gameId] || botGeneric;
        fn(this.engine, this.botPlayerId, this.state);
      } catch (_) { /* silently ignore bot errors */ }
    }, 50); // 20 Hz
  }

  stop() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
  }
}

module.exports = { BotPlayer };
