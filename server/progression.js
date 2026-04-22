'use strict';

const { CHAPTERS, GAME_IDS, ROOM_STATUS } = require('../shared/constants');
const { getProgress, addCharm } = require('./db');

// ─── Star thresholds ──────────────────────────────────────────────────────────
// Each game can define custom thresholds; these are sensible defaults.

const DEFAULT_THRESHOLDS = {
  [GAME_IDS.LABYRINTH]:       { two: 300,  three: 600  },
  [GAME_IDS.HARMONY]:         { two: 500,  three: 900  },
  [GAME_IDS.RECIPE_RUSH]:     { two: 400,  three: 750  },
  [GAME_IDS.BUTTERFLY_CHASE]: { two: 200,  three: 450  },
  [GAME_IDS.BRIDGE_OF_VINES]: { two: 300,  three: 600  },
  [GAME_IDS.GROW_TOGETHER]:   { two: 250,  three: 500  },
  [GAME_IDS.STIR_TOGETHER]:   { two: 300,  three: 550  },
  [GAME_IDS.TASTE_TEST]:      { two: 400,  three: 750  },
  [GAME_IDS.GEAR_TRAIN]:      { two: 350,  three: 650  },
  [GAME_IDS.BLUEPRINT_READER]:{ two: 300,  three: 600  },
  [GAME_IDS.RUBE_GOLDBERG]:   { two: 500,  three: 900  },
  [GAME_IDS.CALL_RESPONSE]:   { two: 300,  three: 600  },
  [GAME_IDS.CONDUCTOR]:       { two: 400,  three: 750  },
  [GAME_IDS.DUET]:            { two: 500,  three: 900  },
  [GAME_IDS.LIGHT_THE_WAY]:   { two: 300,  three: 600  },
  [GAME_IDS.SIGNAL_FLAGS]:    { two: 350,  three: 700  },
  [GAME_IDS.TIDE_POOLS]:      { two: 300,  three: 550  },
  [GAME_IDS.STORM]:           { two: 600,  three: 1000 },
  [GAME_IDS.DICE_ROLL]:       { two: 200,  three: 400  },
  [GAME_IDS.MEMORY_LANE]:     { two: 300,  three: 600  },
  [GAME_IDS.FINAL_LABYRINTH]: { two: 500,  three: 900  },
  [GAME_IDS.HEARTBEAT]:       { two: 450,  three: 700  },
  [GAME_IDS.MIRROR_DRAW]:     { two: 300,  three: 600  },
  [GAME_IDS.TWENTY_QUESTIONS]:{ two: 200,  three: 400  },
  [GAME_IDS.TANDEM_TYPING]:   { two: 250,  three: 500  },
};

// ─── calculateStars ───────────────────────────────────────────────────────────

/**
 * Compute 0–3 stars for a mini-game result.
 *
 * @param {string} miniGameId
 * @param {number} score          – raw numeric score
 * @param {object} [performance]  – optional extra data (accuracy, time, etc.)
 * @returns {number} 0 | 1 | 2 | 3
 */
function calculateStars(miniGameId, score, performance = {}) {
  // Some games send stars directly from the engine; honour that.
  if (typeof performance.stars === 'number') {
    return Math.min(3, Math.max(0, Math.round(performance.stars)));
  }

  const thresholds = DEFAULT_THRESHOLDS[miniGameId];
  if (!thresholds) return score > 0 ? 1 : 0;

  if (score >= thresholds.three) return 3;
  if (score >= thresholds.two)   return 2;
  if (score > 0)                 return 1;
  return 0;
}

// ─── checkChapterComplete ─────────────────────────────────────────────────────

/**
 * Check whether a player has completed all mini-games (including boss) for a chapter.
 *
 * @param {string} playerId
 * @param {number} chapterId  – 1–6
 * @param {object} db         – db module (passed in to avoid circular deps)
 * @returns {{ complete: boolean, charmId: string|null }}
 */
function checkChapterComplete(playerId, chapterId, db) {
  const chapter = CHAPTERS.find(c => c.id === chapterId);
  if (!chapter) return { complete: false, charmId: null };

  const required = [...chapter.miniGames, chapter.bossGame];
  const progressRows = db.getProgress(playerId, chapterId);

  const completedSet = new Set(
    progressRows.filter(r => r.completed).map(r => r.mini_game)
  );

  const allDone = required.every(gameId => completedSet.has(gameId));

  if (allDone) {
    // Award charm if not already held
    db.addCharm(playerId, chapter.charmId);
    return { complete: true, charmId: chapter.charmId };
  }

  return { complete: false, charmId: null };
}

// ─── getUnlockedGames ─────────────────────────────────────────────────────────

/**
 * Return the list of mini-game IDs the player has unlocked.
 * A game is unlocked once the previous chapter (or the chapter it belongs to)
 * has been reached — i.e., we unlock chapter-by-chapter.
 *
 * @param {string} playerId
 * @param {object} db
 * @returns {string[]}
 */
function getUnlockedGames(playerId, db) {
  const progressRows = db.getProgress(playerId);
  const completedSet = new Set(
    progressRows.filter(r => r.completed).map(r => r.mini_game)
  );

  const unlocked = [];

  for (let i = 0; i < CHAPTERS.length; i++) {
    const chapter  = CHAPTERS[i];
    const prevChap = i > 0 ? CHAPTERS[i - 1] : null;

    // Unlock chapter 1 always; subsequent chapters require previous boss done
    const chapterUnlocked =
      i === 0 || (prevChap && completedSet.has(prevChap.bossGame));

    if (chapterUnlocked) {
      unlocked.push(...chapter.miniGames, chapter.bossGame);
    }
  }

  return [...new Set(unlocked)];
}

// ─── getNextMiniGame ──────────────────────────────────────────────────────────

/**
 * Determine the next mini-game to play in story mode.
 *
 * @param {string} roomCode
 * @param {object} rooms  – rooms module (to read room state)
 * @returns {{ gameId: string, chapterId: number, isBoss: boolean }|null}
 */
function getNextMiniGame(roomCode, rooms) {
  const room = rooms.getRoom(roomCode);
  if (!room) return null;

  const chapterId = room.chapter || 1;
  const chapter   = CHAPTERS.find(c => c.id === chapterId);
  if (!chapter) return null;

  const idx = room.miniGameIndex || 0;

  // Mini-games first, then boss
  if (idx < chapter.miniGames.length) {
    return {
      gameId:    chapter.miniGames[idx],
      chapterId,
      isBoss:    false,
      gameIndex: idx,
    };
  }

  if (idx === chapter.miniGames.length) {
    return {
      gameId:    chapter.bossGame,
      chapterId,
      isBoss:    true,
      gameIndex: idx,
    };
  }

  // Chapter complete — advance
  const nextChapterId = chapterId + 1;
  const nextChapter   = CHAPTERS.find(c => c.id === nextChapterId);
  if (!nextChapter) return null;   // game over — all chapters done

  return {
    gameId:    nextChapter.miniGames[0],
    chapterId: nextChapterId,
    isBoss:    false,
    gameIndex: 0,
  };
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  calculateStars,
  checkChapterComplete,
  getUnlockedGames,
  getNextMiniGame,
};
