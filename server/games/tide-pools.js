'use strict';

const BaseGameEngine = require('./BaseGameEngine');
const { GAME_IDS } = require('../../shared/constants');

// ─── Constants ────────────────────────────────────────────────────────────────

const CREATURES      = ['crab', 'starfish', 'urchin', 'shell', 'fish'];
const COUNT_PER_TYPE = 3;   // each creature appears 3 times per side
const WIN_MATCHES    = 5;   // need 5 matched pairs
const GAME_TIME_S    = 120;
const GRID_COLS      = 3;
const GRID_ROWS      = 5;   // 3 types * 5 creatures = 15 cells per side (3×5)

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildGrid() {
  const pool = [];
  for (const c of CREATURES) {
    for (let i = 0; i < COUNT_PER_TYPE; i++) pool.push(c);
  }
  return shuffleArray(pool);
}

// ─── Engine ───────────────────────────────────────────────────────────────────

class TidePoolsEngine extends BaseGameEngine {
  constructor(roomCode, config, io, room) {
    super(roomCode, { ...config, gameId: GAME_IDS.TIDE_POOLS }, io, room);
    this.tickRate = 10;

    this.finished    = false;
    this.lastTickAt  = null;
    this.timeLeft    = GAME_TIME_S;
    this.phase       = 'playing';  // 'playing' | 'done'

    // Each side has its own shuffled grid
    this.p1Grid      = buildGrid();  // left pools (P1 sees)
    this.p2Grid      = buildGrid();  // right pools (P2 sees)

    // Currently held creature (index into their grid)
    this.p1Held      = null;  // index or null
    this.p2Held      = null;

    // Matched (removed) indices per side
    this.p1Matched   = new Set();
    this.p2Matched   = new Set();

    this.matchCount  = 0;
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  _playerNum(playerId) {
    const idx = (this.room.players || []).findIndex(p => p.id === playerId);
    return idx + 1;
  }

  _checkMatch() {
    if (this.p1Held === null || this.p2Held === null) return;
    const c1 = this.p1Grid[this.p1Held];
    const c2 = this.p2Grid[this.p2Held];
    if (c1 === c2) {
      // Match!
      this.p1Matched.add(this.p1Held);
      this.p2Matched.add(this.p2Held);
      this.matchCount++;
      const matchedCreature = c1;
      const idx1 = this.p1Held;
      const idx2 = this.p2Held;
      this.p1Held = null;
      this.p2Held = null;

      this.io.to(this.roomCode).emit('game:match', {
        creature: matchedCreature,
        p1Index: idx1, p2Index: idx2,
        matchCount: this.matchCount,
      });

      if (this.matchCount >= WIN_MATCHES) {
        this._endGame();
      }
    } else {
      // Mismatch — clear both
      this.io.to(this.roomCode).emit('game:mismatch', {
        p1Creature: c1, p2Creature: c2,
        p1Index: this.p1Held, p2Index: this.p2Held,
      });
      this.p1Held = null;
      this.p2Held = null;
    }
  }

  // ─── Tick ──────────────────────────────────────────────────────────────────

  tick() {
    if (this.finished) return;

    const now = Date.now();
    if (this.lastTickAt === null) { this.lastTickAt = now; return; }
    const delta = (now - this.lastTickAt) / 1000;
    this.lastTickAt = now;

    this.timeLeft = Math.max(0, this.timeLeft - delta);
    if (this.timeLeft <= 0) {
      this.finished = true;
      // End with whatever matches were made
      const score = this.matchCount * 100;
      let stars = 0;
      if (this.matchCount >= WIN_MATCHES) stars = 3;
      else if (this.matchCount >= 3) stars = 2;
      else if (this.matchCount >= 1) stars = 1;
      this.setWin(stars, score, { matchCount: this.matchCount });
    }
  }

  // ─── Input ─────────────────────────────────────────────────────────────────

  processInput(playerId, inputType, inputData) {
    if (this.finished || this.phase !== 'playing') return;

    const playerNum = this._playerNum(playerId);
    const type      = inputType || (inputData && inputData.type);

    if (type === 'hold') {
      const index = inputData && inputData.index;
      if (typeof index !== 'number') return;

      if (playerNum === 1) {
        if (this.p1Matched.has(index)) return;  // already matched
        this.p1Held = index;
        this.io.to(this.roomCode).emit('game:held', {
          player: 1, index, creature: this.p1Grid[index],
        });
      } else {
        if (this.p2Matched.has(index)) return;
        this.p2Held = index;
        this.io.to(this.roomCode).emit('game:held', {
          player: 2, index, creature: this.p2Grid[index],
        });
      }

      this._checkMatch();
    }

    if (type === 'release') {
      if (playerNum === 1) this.p1Held = null;
      else this.p2Held = null;
      this.io.to(this.roomCode).emit('game:released', { player: playerNum });
    }
  }

  // ─── End ───────────────────────────────────────────────────────────────────

  _endGame() {
    this.finished = true;
    this.phase    = 'done';

    const score = this.matchCount * 100 + Math.round(this.timeLeft * 2);
    let stars = 0;
    if (this.matchCount >= WIN_MATCHES && this.timeLeft > 60) stars = 3;
    else if (this.matchCount >= WIN_MATCHES) stars = 2;
    else stars = 1;

    this.setWin(stars, score, { matchCount: this.matchCount });
  }

  // ─── State ─────────────────────────────────────────────────────────────────

  getState() {
    return {
      ...super.getState(),
      phase:       this.phase,
      timeLeft:    Math.round(this.timeLeft),
      duration:    GAME_TIME_S,
      matchCount:  this.matchCount,
      winMatches:  WIN_MATCHES,
      // P1 sees their grid, P2 sees their grid — clients show only their side
      p1Grid:      this.p1Grid.map((c, i) => ({
        index: i, creature: c, matched: this.p1Matched.has(i),
        held: this.p1Held === i,
      })),
      p2Grid:      this.p2Grid.map((c, i) => ({
        index: i, creature: c, matched: this.p2Matched.has(i),
        held: this.p2Held === i,
      })),
      // Held creatures (visible to both as banner)
      p1HeldCreature: this.p1Held !== null ? this.p1Grid[this.p1Held] : null,
      p2HeldCreature: this.p2Held !== null ? this.p2Grid[this.p2Held] : null,
      gridCols:    GRID_COLS,
      gridRows:    GRID_ROWS,
    };
  }
}

module.exports = { TidePoolsEngine };
