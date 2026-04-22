'use strict';

const BaseGameEngine = require('./BaseGameEngine');
const { GAME_IDS } = require('../../shared/constants');

// ─── Constants ────────────────────────────────────────────────────────────────

const FLAVOR_KEYS  = ['sweet', 'salty', 'sour', 'spicy'];
const TOTAL_ROUNDS = 3;
const ROUND_TIME_S = 90;   // seconds per round for adjuster to dial in

// Pre-generated flavor profiles so every playthrough has variety
const PROFILES = [
  { sweet: 75, salty: 20, sour: 10, spicy: 5  },
  { sweet: 15, salty: 70, sour: 30, spicy: 55 },
  { sweet: 40, salty: 40, sour: 80, spicy: 25 },
];

function clamp(v) { return Math.min(100, Math.max(0, Math.round(v))); }

function randomProfile() {
  const p = {};
  FLAVOR_KEYS.forEach(k => { p[k] = clamp(Math.random() * 100); });
  return p;
}

// ─── Engine ───────────────────────────────────────────────────────────────────

class TasteTestEngine extends BaseGameEngine {
  constructor(roomCode, config, io, room) {
    super(roomCode, { ...config, gameId: GAME_IDS.TASTE_TEST }, io, room);
    this.tickRate = 5;

    this.round       = 0;
    this.totalScore  = 0;
    this.phase       = 'tasting';   // 'tasting' | 'reveal' | 'done'
    this.submitted   = false;
    this.timeLeft    = ROUND_TIME_S;
    this.lastTickAt  = null;
    this.roundScore  = 0;
    this.finished    = false;

    // Build rounds
    this.profiles = config.profiles || PROFILES;
    // Pad with random if fewer than TOTAL_ROUNDS
    while (this.profiles.length < TOTAL_ROUNDS) {
      this.profiles.push(randomProfile());
    }

    // Adjuster's current guess values
    this.guessFlavors = { sweet: 50, salty: 50, sour: 50, spicy: 50 };
    this.revealDelay  = null;
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  get targetFlavors() {
    return this.profiles[this.round] || this.profiles[0];
  }

  _playerNum(playerId) {
    const players = this.room.players || [];
    const idx = players.findIndex(p => p.id === playerId);
    return idx + 1;
  }

  // ─── Tick ──────────────────────────────────────────────────────────────────

  tick() {
    if (this.finished) return;

    const now = Date.now();
    if (this.lastTickAt === null) {
      this.lastTickAt = now;
      return;
    }
    const delta = (now - this.lastTickAt) / 1000;
    this.lastTickAt = now;

    if (this.phase === 'tasting' && !this.submitted) {
      this.timeLeft = Math.max(0, this.timeLeft - delta);
      if (this.timeLeft <= 0) {
        // Auto-submit
        this._doSubmit();
      }
    }
  }

  // ─── Input ─────────────────────────────────────────────────────────────────

  processInput(playerId, inputType, inputData) {
    if (this.finished) return;

    const playerNum = this._playerNum(playerId);
    const type = inputType || (inputData && inputData.type);

    // Adjuster (player2) sets a flavor value
    if (type === 'setFlavor' && playerNum === 2 && this.phase === 'tasting') {
      const { flavor, value } = inputData || {};
      if (FLAVOR_KEYS.includes(flavor)) {
        this.guessFlavors[flavor] = clamp(value);
      }
      return;
    }

    // Adjuster submits guess
    if (type === 'submit' && playerNum === 2 && this.phase === 'tasting' && !this.submitted) {
      this._doSubmit();
    }

    // Advance to next round (either player after reveal)
    if (type === 'nextRound' && this.phase === 'reveal') {
      this._advanceRound();
    }
  }

  _doSubmit() {
    this.submitted = true;
    this.phase     = 'reveal';

    const target = this.targetFlavors;
    const guess  = this.guessFlavors;

    // Sum of absolute differences, lower is better (0 = perfect)
    const totalDiff = FLAVOR_KEYS.reduce((acc, k) => acc + Math.abs(target[k] - guess[k]), 0);
    const maxDiff   = FLAVOR_KEYS.length * 100;

    // Score 0-100 for this round
    this.roundScore  = Math.round(((maxDiff - totalDiff) / maxDiff) * 100);
    this.totalScore += this.roundScore;

    this.io.to(this.roomCode).emit('game:roundReveal', {
      round:        this.round + 1,
      target:       target,
      guess:        { ...this.guessFlavors },
      roundScore:   this.roundScore,
      totalScore:   this.totalScore,
    });

    // Auto-advance after 5 seconds
    this.revealDelay = setTimeout(() => {
      if (!this.finished) this._advanceRound();
    }, 5000);
  }

  _advanceRound() {
    if (this.revealDelay) { clearTimeout(this.revealDelay); this.revealDelay = null; }

    this.round++;
    if (this.round >= TOTAL_ROUNDS) {
      this._endGame();
      return;
    }

    this.guessFlavors = { sweet: 50, salty: 50, sour: 50, spicy: 50 };
    this.submitted    = false;
    this.phase        = 'tasting';
    this.timeLeft     = ROUND_TIME_S;
    this.roundScore   = 0;
  }

  // ─── End ───────────────────────────────────────────────────────────────────

  _endGame() {
    this.finished = true;
    this.phase    = 'done';

    const avgScore = Math.round(this.totalScore / TOTAL_ROUNDS);

    let stars = 0;
    if (avgScore >= 80)      stars = 3;
    else if (avgScore >= 55) stars = 2;
    else if (avgScore >= 30) stars = 1;

    this.setWin(stars, this.totalScore, { averageScore: avgScore, rounds: TOTAL_ROUNDS });
  }

  // ─── State ─────────────────────────────────────────────────────────────────

  getState() {
    const base = {
      ...super.getState(),
      phase:        this.phase,
      round:        this.round + 1,
      totalRounds:  TOTAL_ROUNDS,
      guessFlavors: { ...this.guessFlavors },
      submitted:    this.submitted,
      roundScore:   this.roundScore,
      totalScore:   this.totalScore,
      timeLeft:     Math.round(this.timeLeft),
      roundDuration: ROUND_TIME_S,
    };

    // Only expose target to the taster (player1); adjuster sees nothing
    // We send it as a separate key the client must gate on myRole
    base.targetFlavors = { ...this.targetFlavors };

    return base;
  }
}

module.exports = { TasteTestEngine, FLAVOR_KEYS, PROFILES };
