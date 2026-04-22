'use strict';

const BaseGameEngine = require('./BaseGameEngine');
const { GAME_IDS } = require('../../shared/constants');

// ─── Constants ────────────────────────────────────────────────────────────────

const GAME_DURATION_S  = 60;      // total game length in seconds
const BUFFER_SIZE      = 8;       // circular buffer depth per player
const SYNC_THRESHOLD   = 50;      // ms – intervals within this = synced
const MIN_TAPS_NEEDED  = 2;       // need at least 2 taps to compute an interval

// ─── Engine ───────────────────────────────────────────────────────────────────

class HeartbeatEngine extends BaseGameEngine {
  constructor(roomCode, config, io, room) {
    super(roomCode, { ...config, gameId: GAME_IDS.HEARTBEAT }, io, room);
    this.tickRate = 10;

    // Circular tap buffers (timestamps in ms)
    this.taps = { 1: [], 2: [] };

    this.syncScore     = 0;
    this.synced        = false;
    this.syncedFrames  = 0;   // ticks during which synced === true
    this.totalFrames   = 0;

    this.finished = false;
  }

  // ─── Tick ──────────────────────────────────────────────────────────────────

  tick() {
    if (this.finished) return;

    this.totalFrames += 1;

    this.syncScore = this._computeSync();
    this.synced    = this.syncScore >= 70;   // 70+ = considered synced

    if (this.synced) this.syncedFrames += 1;

    // End after GAME_DURATION_S seconds
    if (this.elapsedSeconds >= GAME_DURATION_S) {
      this._endGame();
    }
  }

  // ─── Input ─────────────────────────────────────────────────────────────────

  processInput(playerId, inputType, inputData) {
    if (this.finished || inputType !== 'tap') return;

    const players = this.room.players || [];
    const idx     = players.findIndex(p => p.id === playerId);
    if (idx < 0) return;

    const playerNum = idx + 1; // 1 or 2
    const ts        = inputData.timestamp || Date.now();

    const buf = this.taps[playerNum];
    buf.push(ts);
    if (buf.length > BUFFER_SIZE) buf.shift();

    this.io.to(this.roomCode).emit('game:tap', { player: playerNum, timestamp: ts });
  }

  // ─── Sync calculation ──────────────────────────────────────────────────────

  /**
   * Compare the average inter-tap intervals of both players.
   * Returns a 0–100 sync score (100 = perfectly matched rhythm).
   */
  _computeSync() {
    const avg1 = this._avgInterval(this.taps[1]);
    const avg2 = this._avgInterval(this.taps[2]);

    if (avg1 === null || avg2 === null) return 0;

    const diff = Math.abs(avg1 - avg2);
    if (diff >= SYNC_THRESHOLD * 3) return 0;

    // Linear interpolation: 0 diff → 100, SYNC_THRESHOLD*3 diff → 0
    return Math.round(Math.max(0, 100 - (diff / (SYNC_THRESHOLD * 3)) * 100));
  }

  /**
   * Compute the average interval (ms) between consecutive taps in a buffer.
   * Returns null if there are fewer than MIN_TAPS_NEEDED taps.
   */
  _avgInterval(buf) {
    if (buf.length < MIN_TAPS_NEEDED) return null;

    let sum = 0;
    for (let i = 1; i < buf.length; i++) {
      sum += buf[i] - buf[i - 1];
    }
    return sum / (buf.length - 1);
  }

  // ─── End ───────────────────────────────────────────────────────────────────

  _endGame() {
    this.finished = true;

    const syncPercent = this.totalFrames > 0
      ? Math.round((this.syncedFrames / this.totalFrames) * 100)
      : 0;

    let stars = 0;
    if (syncPercent >= 70) stars = 3;
    else if (syncPercent >= 45) stars = 2;
    else if (syncPercent >= 25) stars = 1;

    const score = syncPercent * 10;  // 0–1000

    this.setWin(stars, score, {
      syncPercent,
      syncedSeconds: Math.round((this.syncedFrames / this.tickRate)),
    });
  }

  // ─── State ─────────────────────────────────────────────────────────────────

  getState() {
    return {
      ...super.getState(),
      player1Taps: [...this.taps[1]],
      player2Taps: [...this.taps[2]],
      syncScore:   this.syncScore,
      synced:      this.synced,
      duration:    GAME_DURATION_S,
      elapsed:     Math.round(this.elapsedSeconds),
    };
  }
}

module.exports = { HeartbeatEngine };
