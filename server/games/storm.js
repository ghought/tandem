'use strict';

const BaseGameEngine = require('./BaseGameEngine');
const { GAME_IDS } = require('../../shared/constants');

// ─── Constants ────────────────────────────────────────────────────────────────

const GAME_DURATION_S = 90;
const WORLD_SIZE      = 400;  // virtual units
const BOAT_START      = { x: 50, y: 200 };
const HARBOR_POS      = { x: 380, y: 60 };
const HARBOR_RADIUS   = 30;
const ROCK_RADIUS     = 20;
const MAX_ROCK_HITS   = 3;

// Pre-defined rock positions
const ROCKS = [
  { x: 120, y: 100 }, { x: 150, y: 250 }, { x: 220, y: 180 },
  { x: 280, y: 320 }, { x: 310, y: 140 }, { x: 200, y: 350 },
];

// Wind direction changes over time (in degrees, 0 = east)
const WIND_SCHEDULE = [
  { time: 0,   angle: 45  },
  { time: 20,  angle: 90  },
  { time: 40,  angle: 135 },
  { time: 60,  angle: 45  },
  { time: 80,  angle: 0   },
];

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// ─── Engine ───────────────────────────────────────────────────────────────────

class StormEngine extends BaseGameEngine {
  constructor(roomCode, config, io, room) {
    super(roomCode, { ...config, gameId: GAME_IDS.STORM }, io, room);
    this.tickRate = 20;

    this.finished    = false;
    this.lastTickAt  = null;
    this.phase       = 'playing';  // 'playing' | 'done'

    this.boat = {
      x:       BOAT_START.x,
      y:       BOAT_START.y,
      heading: 0,    // degrees, 0 = east
      speed:   0,    // current speed
    };

    this.sailAngle   = 45;   // P1 controls: 0-180 degrees
    this.rudderPos   = 0;    // P2 controls: -1 to 1 (left/right)

    this.rockHits    = 0;
    this.hitRocks    = new Set();  // indices of rocks that were hit this tick (cooldown)
    this.rockCooldowns = {};

    this.windAngle   = 45;   // current wind direction
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  _playerNum(playerId) {
    const idx = (this.room.players || []).findIndex(p => p.id === playerId);
    return idx + 1;
  }

  _getWindAngle(elapsed) {
    let prev = WIND_SCHEDULE[0];
    let next = WIND_SCHEDULE[0];
    for (let i = 0; i < WIND_SCHEDULE.length; i++) {
      if (WIND_SCHEDULE[i].time <= elapsed) prev = WIND_SCHEDULE[i];
      if (WIND_SCHEDULE[i].time > elapsed) { next = WIND_SCHEDULE[i]; break; }
    }
    if (prev === next) return prev.angle;
    const t = (elapsed - prev.time) / (next.time - prev.time);
    return lerp(prev.angle, next.angle, t);
  }

  // ─── Tick ──────────────────────────────────────────────────────────────────

  tick() {
    if (this.finished) return;

    const now = Date.now();
    if (this.lastTickAt === null) { this.lastTickAt = now; return; }
    const delta = (now - this.lastTickAt) / 1000;
    this.lastTickAt = now;

    const elapsed = this.elapsedSeconds;

    // Update wind
    this.windAngle = this._getWindAngle(elapsed);

    // Rudder changes heading
    const rudderEffect = this.rudderPos * 60 * delta;  // max 60 deg/s turn rate
    this.boat.heading += rudderEffect;
    this.boat.heading  = ((this.boat.heading % 360) + 360) % 360;

    // Sail + wind interaction determines speed
    // Best speed when sail is perpendicular to wind
    const headingRad   = (this.boat.heading * Math.PI) / 180;
    const windRad      = (this.windAngle * Math.PI) / 180;
    const sailRad      = (this.sailAngle * Math.PI) / 180;
    const relWindAngle = Math.abs(headingRad - windRad);
    const sailEff      = Math.abs(Math.cos(sailRad - relWindAngle / 2));
    const targetSpeed  = sailEff * 3;  // max 3 units/s
    this.boat.speed    = lerp(this.boat.speed, targetSpeed, 0.05);

    // Move boat
    this.boat.x += Math.cos(headingRad) * this.boat.speed * delta * 30;
    this.boat.y -= Math.sin(headingRad) * this.boat.speed * delta * 30;

    // Clamp to world
    this.boat.x = Math.max(0, Math.min(WORLD_SIZE, this.boat.x));
    this.boat.y = Math.max(0, Math.min(WORLD_SIZE, this.boat.y));

    // Check rock collisions (with per-rock cooldown)
    for (let i = 0; i < ROCKS.length; i++) {
      if (this.rockCooldowns[i] && now < this.rockCooldowns[i]) continue;
      if (dist(this.boat, ROCKS[i]) < ROCK_RADIUS) {
        this.rockHits++;
        this.rockCooldowns[i] = now + 3000;  // 3s cooldown per rock
        this.boat.speed = 0;
        this.io.to(this.roomCode).emit('game:rockHit', {
          rockIndex: i, hits: this.rockHits, maxHits: MAX_ROCK_HITS,
        });
        if (this.rockHits >= MAX_ROCK_HITS) {
          this.finished = true;
          this.setLoss('too_many_rocks');
          return;
        }
      }
    }

    // Check harbor reach
    if (dist(this.boat, HARBOR_POS) < HARBOR_RADIUS) {
      this.finished = true;
      this.phase    = 'done';
      this._endGame();
      return;
    }

    // Time limit
    if (elapsed >= GAME_DURATION_S) {
      this.finished = true;
      this.setLoss('timeout');
    }
  }

  // ─── Input ─────────────────────────────────────────────────────────────────

  processInput(playerId, inputType, inputData) {
    if (this.finished) return;

    const playerNum = this._playerNum(playerId);
    const type      = inputType || (inputData && inputData.type);

    // P1: sail angle (0-180)
    if (type === 'sail' && playerNum === 1) {
      const angle = inputData && inputData.angle;
      if (typeof angle === 'number') {
        this.sailAngle = Math.max(0, Math.min(180, angle));
      }
    }

    // P2: rudder position (-1 to 1)
    if (type === 'rudder' && playerNum === 2) {
      const pos = inputData && inputData.position;
      if (typeof pos === 'number') {
        this.rudderPos = Math.max(-1, Math.min(1, pos));
      }
    }
  }

  // ─── End ───────────────────────────────────────────────────────────────────

  _endGame() {
    const timeLeft  = Math.max(0, GAME_DURATION_S - this.elapsedSeconds);
    const timeBonus = Math.round(timeLeft * 5);
    const rockPenalty = this.rockHits * 100;
    const score     = Math.max(0, 500 + timeBonus - rockPenalty);

    let stars = 0;
    if (this.rockHits === 0) stars = 3;
    else if (this.rockHits <= 1) stars = 2;
    else stars = 1;

    this.setWin(stars, score, {
      rockHits: this.rockHits, timeLeft: Math.round(timeLeft),
    });
  }

  // ─── State ─────────────────────────────────────────────────────────────────

  getState() {
    return {
      ...super.getState(),
      phase:      this.phase,
      boat:       { ...this.boat, heading: Math.round(this.boat.heading), speed: Math.round(this.boat.speed * 10) / 10 },
      sailAngle:  this.sailAngle,
      rudderPos:  Math.round(this.rudderPos * 100) / 100,
      windAngle:  Math.round(this.windAngle),
      rocks:      ROCKS,
      harbor:     HARBOR_POS,
      harborRadius: HARBOR_RADIUS,
      worldSize:  WORLD_SIZE,
      rockHits:   this.rockHits,
      maxRockHits: MAX_ROCK_HITS,
      duration:   GAME_DURATION_S,
      elapsed:    Math.round(this.elapsedSeconds),
      timeLeft:   Math.round(Math.max(0, GAME_DURATION_S - this.elapsedSeconds)),
    };
  }
}

module.exports = { StormEngine };
