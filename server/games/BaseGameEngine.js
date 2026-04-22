'use strict';

const { upsertProgress } = require('../db');

/**
 * Abstract base class for all Tandem mini-game engines.
 *
 * Subclasses MUST implement:
 *   tick()         – called at `tickRate` Hz
 *   processInput() – handle player input events
 *
 * Subclasses MAY override:
 *   getState()     – build the state object broadcast to clients
 *   start()        – hook before loop begins
 *   stop()         – hook after loop ends
 */
class BaseGameEngine {
  /**
   * @param {string} roomCode
   * @param {object} config   – game-specific config (level, song, etc.)
   * @param {import('socket.io').Server} io
   * @param {object} room     – live room object from rooms.js
   */
  constructor(roomCode, config = {}, io, room) {
    if (new.target === BaseGameEngine) {
      throw new TypeError('BaseGameEngine is abstract and cannot be instantiated directly.');
    }

    this.roomCode  = roomCode;
    this.config    = config;
    this.io        = io;
    this.room      = room;

    /** Hz – override in subclass */
    this.tickRate  = 30;

    this._tickInterval = null;
    this._startTime    = null;
    this._running      = false;
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  /**
   * Begin the tick loop. Subclasses should call super.start() then do init work.
   */
  start() {
    if (this._running) return;
    this._running   = true;
    this._startTime = Date.now();

    const intervalMs = Math.round(1000 / this.tickRate);
    this._tickInterval = setInterval(() => {
      try {
        this.tick();
        this.broadcastState();
      } catch (err) {
        console.error(`[${this.constructor.name}] tick error in room ${this.roomCode}:`, err);
      }
    }, intervalMs);

    console.log(
      `[${this.constructor.name}] Started in room ${this.roomCode} @ ${this.tickRate} Hz`
    );
  }

  /**
   * Stop the tick loop. Safe to call multiple times.
   */
  stop() {
    if (this._tickInterval) {
      clearInterval(this._tickInterval);
      this._tickInterval = null;
    }
    this._running = false;
    console.log(`[${this.constructor.name}] Stopped in room ${this.roomCode}`);
  }

  // ─── Abstract interface ──────────────────────────────────────────────────────

  /**
   * Called every tick. Must be implemented by subclass.
   * @abstract
   */
  tick() {
    throw new Error(`${this.constructor.name} must implement tick()`);
  }

  /**
   * Route player input to game logic. Must be implemented by subclass.
   *
   * @abstract
   * @param {string} playerId
   * @param {string} inputType
   * @param {object} inputData
   */
  processInput(playerId, inputType, inputData) { // eslint-disable-line no-unused-vars
    throw new Error(`${this.constructor.name} must implement processInput()`);
  }

  // ─── State & broadcast ───────────────────────────────────────────────────────

  /**
   * Return the current game state for broadcast.
   * Subclasses should override to add their fields.
   * @returns {object}
   */
  getState() {
    return {
      gameId:      this.config.gameId || null,
      roomCode:    this.roomCode,
      timeElapsed: this._startTime ? Date.now() - this._startTime : 0,
    };
  }

  /**
   * Emit `game:state` to all clients in the room.
   */
  broadcastState() {
    try {
      this.io.to(this.roomCode).emit('game:state', this.getState());
    } catch (err) {
      console.error(`[${this.constructor.name}] broadcastState error:`, err.message);
    }
  }

  // ─── Result handling ─────────────────────────────────────────────────────────

  /**
   * Called when the game ends. Emits `game:result` and persists progress.
   *
   * @param {number} stars    – 0 to 3
   * @param {number} score    – raw score
   * @param {object} [extra]  – extra result fields to emit
   */
  setWin(stars, score, extra = {}) {
    this.stop();

    const result = {
      gameId:   this.config.gameId,
      roomCode: this.roomCode,
      stars:    Math.min(3, Math.max(0, stars)),
      score:    score || 0,
      ...extra,
    };

    this.io.to(this.roomCode).emit('game:result', result);
    console.log(
      `[${this.constructor.name}] Game ended in room ${this.roomCode}: ${stars} stars, ${score} pts`
    );

    // Persist progress for every player in the room
    const chapter  = this.room.chapter  || 1;
    const miniGame = this.config.gameId || 'unknown';

    for (const player of this.room.players || []) {
      try {
        upsertProgress({
          player_id:  player.id,
          chapter,
          mini_game:  miniGame,
          stars:      result.stars,
          completed:  true,
          best_score: result.score,
        });
      } catch (err) {
        console.error(`[${this.constructor.name}] Failed to save progress for ${player.id}:`, err.message);
      }
    }
  }

  /**
   * Called on failure/time-out. Emits `game:result` with 0 stars and persists.
   *
   * @param {string} [reason]
   */
  setLoss(reason = 'failed') {
    this.stop();

    const result = {
      gameId:   this.config.gameId,
      roomCode: this.roomCode,
      stars:    0,
      score:    0,
      reason,
    };

    this.io.to(this.roomCode).emit('game:result', result);

    const chapter  = this.room.chapter  || 1;
    const miniGame = this.config.gameId || 'unknown';

    for (const player of this.room.players || []) {
      try {
        upsertProgress({
          player_id:  player.id,
          chapter,
          mini_game:  miniGame,
          stars:      0,
          completed:  false,
          best_score: 0,
        });
      } catch (err) {
        console.error(`[${this.constructor.name}] Failed to save progress for ${player.id}:`, err.message);
      }
    }
  }

  // ─── Utility ─────────────────────────────────────────────────────────────────

  /** Seconds since game start */
  get elapsedSeconds() {
    return this._startTime ? (Date.now() - this._startTime) / 1000 : 0;
  }

  get isRunning() {
    return this._running;
  }
}

module.exports = BaseGameEngine;
