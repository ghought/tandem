'use strict';

const BaseGameEngine = require('./BaseGameEngine');
const { GAME_IDS } = require('../../shared/constants');

// ─── Constants ────────────────────────────────────────────────────────────────

const GAME_DURATION_S  = 60;
const SPEED_TOLERANCE  = 20;   // ±20 speed = "similar speed"

// Soup color: grey → vibrant red-orange as sync increases
const COLOR_GREY   = [120, 110, 105];
const COLOR_SYNCED = [220, 80, 40];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function lerpColor(from, to, t) {
  return from.map((c, i) => Math.round(c + (to[i] - c) * t));
}

// ─── Engine ───────────────────────────────────────────────────────────────────

class StirTogetherEngine extends BaseGameEngine {
  constructor(roomCode, config, io, room) {
    super(roomCode, { ...config, gameId: GAME_IDS.STIR_TOGETHER }, io, room);
    this.tickRate = 20;

    this.stirP1        = { dir: null, speed: 0 };
    this.stirP2        = { dir: null, speed: 0 };

    this.syncScore     = 0;    // 0–100, smoothed
    this.syncTicks     = 0;    // ticks in sync
    this.totalTicks    = 0;

    this.soupColor     = [...COLOR_GREY];
    this.timeLeft      = GAME_DURATION_S;
    this.lastTickAt    = null;
    this.phase         = 'playing';
    this.finished      = false;
  }

  // ─── Tick ──────────────────────────────────────────────────────────────────

  tick() {
    if (this.finished) return;

    const now = Date.now();
    if (this.lastTickAt === null) { this.lastTickAt = now; return; }
    const delta = (now - this.lastTickAt) / 1000;
    this.lastTickAt = now;

    this.totalTicks++;
    this.timeLeft = Math.max(0, this.timeLeft - delta);

    // Check sync: same direction + speed within tolerance
    const sameDir  = this.stirP1.dir !== null &&
                     this.stirP2.dir !== null &&
                     this.stirP1.dir === this.stirP2.dir;
    const sameSpeed = Math.abs(this.stirP1.speed - this.stirP2.speed) <= SPEED_TOLERANCE;

    const inSync = sameDir && sameSpeed;
    if (inSync) this.syncTicks++;

    // Smooth sync score toward target (0 or 100)
    const target     = inSync ? 100 : 0;
    this.syncScore   = Math.round(this.syncScore + (target - this.syncScore) * 0.15);

    // Update soup color
    const t         = this.syncScore / 100;
    this.soupColor  = lerpColor(COLOR_GREY, COLOR_SYNCED, t);

    if (this.timeLeft <= 0) {
      this._endGame();
    }
  }

  // ─── Input ─────────────────────────────────────────────────────────────────

  processInput(playerId, inputType, inputData) {
    if (this.finished) return;

    const type = inputType || (inputData && inputData.type);
    if (type !== 'stir') return;

    const players   = this.room.players || [];
    const idx       = players.findIndex(p => p.id === playerId);
    const playerNum = idx + 1;
    const dir       = inputData && inputData.direction;
    const speed     = Math.min(100, Math.max(0, Number((inputData && inputData.speed) || 0)));

    if (!['cw', 'ccw'].includes(dir)) return;

    if (playerNum === 1) { this.stirP1 = { dir, speed }; }
    if (playerNum === 2) { this.stirP2 = { dir, speed }; }
  }

  // ─── End ───────────────────────────────────────────────────────────────────

  _endGame() {
    this.finished = true;
    this.phase    = 'done';

    const syncPct = this.totalTicks > 0
      ? Math.round((this.syncTicks / this.totalTicks) * 100)
      : 0;

    let stars = 0;
    if (syncPct >= 70)      stars = 3;
    else if (syncPct >= 45) stars = 2;
    else if (syncPct >= 20) stars = 1;

    const score = syncPct * 10;
    this.setWin(stars, score, { syncPct, syncedSeconds: Math.round(this.syncTicks / this.tickRate) });
  }

  // ─── State ─────────────────────────────────────────────────────────────────

  getState() {
    return {
      ...super.getState(),
      phase:     this.phase,
      stirP1:    { ...this.stirP1 },
      stirP2:    { ...this.stirP2 },
      syncScore: this.syncScore,
      soupColor: this.soupColor,
      timeLeft:  Math.round(this.timeLeft),
      duration:  GAME_DURATION_S,
    };
  }
}

module.exports = { StirTogetherEngine };
