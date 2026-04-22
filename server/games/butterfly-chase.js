'use strict';

const BaseGameEngine = require('./BaseGameEngine');
const { GAME_IDS } = require('../../shared/constants');

// ─── Constants ────────────────────────────────────────────────────────────────

const BUTTERFLIES_PER_PLAYER = 5;
const CATCH_RADIUS            = 0.07;   // fraction of board (0–1 coords)
const SCARE_RADIUS            = 0.18;
const FLUTTER_SPEED           = 0.006;  // units per tick at 20Hz
const SCARE_SPEED_MULT        = 3.5;
const FIELD_W                 = 1.0;
const FIELD_H                 = 1.0;
const TICK_RATE               = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function dist(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function createButterfly(id) {
  return {
    id,
    x:  rand(0.1, 0.9),
    y:  rand(0.1, 0.9),
    vx: rand(-1, 1),
    vy: rand(-1, 1),
    caught: false,
    scared: false,
    scaredAt: 0,
  };
}

// ─── Engine ───────────────────────────────────────────────────────────────────

class ButterflyChaseEngine extends BaseGameEngine {
  constructor(roomCode, config, io, room) {
    super(roomCode, { ...config, gameId: GAME_IDS.BUTTERFLY_CHASE }, io, room);
    this.tickRate = TICK_RATE;

    // Two sets of butterflies, keyed by player number (1, 2)
    this.butterflies = {
      1: Array.from({ length: BUTTERFLIES_PER_PLAYER }, (_, i) => createButterfly(i)),
      2: Array.from({ length: BUTTERFLIES_PER_PLAYER }, (_, i) => createButterfly(i)),
    };

    this.caught     = { 1: 0, 2: 0 };
    this.scareZones = [];   // { x, y, owner, ts } — short-lived scare events
    this.finished   = false;
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  _playerNum(playerId) {
    const players = this.room.players || [];
    const idx     = players.findIndex(p => p.id === playerId);
    return idx + 1; // 1 or 2
  }

  // ─── Tick ──────────────────────────────────────────────────────────────────

  tick() {
    if (this.finished) return;

    const now = Date.now();
    // Remove expired scare zones (older than 500ms)
    this.scareZones = this.scareZones.filter(z => now - z.ts < 500);

    for (const owner of [1, 2]) {
      const opponent = owner === 1 ? 2 : 1;
      const opponentScares = this.scareZones.filter(z => z.owner === opponent);

      for (const b of this.butterflies[owner]) {
        if (b.caught) continue;

        // Check if scared by opponent's scare zone
        let scaredBy = null;
        for (const z of opponentScares) {
          if (dist(b, z) < SCARE_RADIUS) {
            scaredBy = z;
            break;
          }
        }

        const speed = scaredBy ? FLUTTER_SPEED * SCARE_SPEED_MULT : FLUTTER_SPEED;

        if (scaredBy) {
          // Flee away from scare zone
          const dx = b.x - scaredBy.x;
          const dy = b.y - scaredBy.y;
          const d  = Math.sqrt(dx * dx + dy * dy) || 0.001;
          b.vx = dx / d + rand(-0.3, 0.3);
          b.vy = dy / d + rand(-0.3, 0.3);
          b.scared   = true;
          b.scaredAt = now;
        } else {
          b.scared = false;
          // Wander: small random direction changes
          b.vx += rand(-0.15, 0.15);
          b.vy += rand(-0.15, 0.15);
        }

        // Normalize velocity
        const vlen = Math.sqrt(b.vx * b.vx + b.vy * b.vy) || 1;
        b.vx = (b.vx / vlen);
        b.vy = (b.vy / vlen);

        // Move
        b.x = clamp(b.x + b.vx * speed, 0.02, 0.98);
        b.y = clamp(b.y + b.vy * speed, 0.02, 0.98);

        // Bounce off walls
        if (b.x <= 0.02 || b.x >= 0.98) b.vx *= -1;
        if (b.y <= 0.02 || b.y >= 0.98) b.vy *= -1;
      }
    }
  }

  // ─── Input ─────────────────────────────────────────────────────────────────

  processInput(playerId, inputType, inputData) {
    if (this.finished) return;

    const playerNum = this._playerNum(playerId);
    if (playerNum < 1 || playerNum > 2) return;

    if (inputType !== 'tap') return;

    const tx = inputData.x != null ? inputData.x : 0.5;
    const ty = inputData.y != null ? inputData.y : 0.5;
    const ts = Date.now();

    // Add scare zone for the opponent's butterflies
    this.scareZones.push({ x: tx, y: ty, owner: playerNum, ts });

    // Check if tap catches any of player's OWN butterflies
    const myButterflies = this.butterflies[playerNum];
    for (const b of myButterflies) {
      if (b.caught) continue;
      if (dist(b, { x: tx, y: ty }) < CATCH_RADIUS) {
        b.caught = true;
        this.caught[playerNum]++;

        this.io.to(this.roomCode).emit('game:butterflyCaught', {
          player:   playerNum,
          caught:   this.caught[playerNum],
          needed:   BUTTERFLIES_PER_PLAYER,
        });

        // Check win
        if (this.caught[1] >= BUTTERFLIES_PER_PLAYER && this.caught[2] >= BUTTERFLIES_PER_PLAYER) {
          this._endGame(true);
          return;
        }
        break; // only catch one per tap
      }
    }
  }

  // ─── End ───────────────────────────────────────────────────────────────────

  _endGame(success) {
    this.finished = true;
    if (success) {
      const totalCaught = this.caught[1] + this.caught[2];
      const stars = 3; // both players caught all 5
      this.setWin(stars, totalCaught * 100, { caught1: this.caught[1], caught2: this.caught[2] });
    } else {
      this.setLoss('time_out');
    }
  }

  // ─── State ─────────────────────────────────────────────────────────────────

  getState() {
    return {
      ...super.getState(),
      butterflies1: this.butterflies[1].map(b => ({
        id: b.id, x: b.x, y: b.y, caught: b.caught, scared: b.scared,
      })),
      butterflies2: this.butterflies[2].map(b => ({
        id: b.id, x: b.x, y: b.y, caught: b.caught, scared: b.scared,
      })),
      caught1: this.caught[1],
      caught2: this.caught[2],
      needed:  BUTTERFLIES_PER_PLAYER,
      scareZones: this.scareZones.map(z => ({ x: z.x, y: z.y, owner: z.owner })),
    };
  }
}

module.exports = { ButterflyChaseEngine };
