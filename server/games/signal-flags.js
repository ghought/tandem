'use strict';

const BaseGameEngine = require('./BaseGameEngine');
const { GAME_IDS } = require('../../shared/constants');

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS       = ['red', 'blue', 'yellow', 'green', 'orange', 'purple', 'white', 'black'];
const SEQ_LENGTH   = 4;
const TOTAL_ROUNDS = 3;
const ROUND_TIME_S = 90;

// Pre-defined sequences for deterministic play
const SEQUENCES = [
  ['red', 'blue', 'yellow', 'green'],
  ['orange', 'purple', 'white', 'red'],
  ['blue', 'green', 'black', 'yellow'],
];

function randomSequence(len) {
  const shuffled = [...COLORS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, len);
}

// ─── Engine ───────────────────────────────────────────────────────────────────

class SignalFlagsEngine extends BaseGameEngine {
  constructor(roomCode, config, io, room) {
    super(roomCode, { ...config, gameId: GAME_IDS.SIGNAL_FLAGS }, io, room);
    this.tickRate = 5;

    this.round        = 0;
    this.currentIndex = 0;
    this.raised       = [];     // colors chosen so far this round
    this.totalScore   = 0;
    this.roundScore   = 0;
    this.phase        = 'playing';   // 'playing' | 'reveal' | 'done'
    this.timeLeft     = ROUND_TIME_S;
    this.lastTickAt   = null;
    this.finished     = false;

    // Build sequences
    this.sequences = config.sequences || SEQUENCES;
    while (this.sequences.length < TOTAL_ROUNDS) {
      this.sequences.push(randomSequence(SEQ_LENGTH));
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  get currentSequence() {
    return this.sequences[this.round] || this.sequences[0];
  }

  _playerNum(playerId) {
    const players = this.room.players || [];
    const idx     = players.findIndex(p => p.id === playerId);
    return idx + 1;
  }

  // ─── Tick ──────────────────────────────────────────────────────────────────

  tick() {
    if (this.finished) return;

    const now = Date.now();
    if (this.lastTickAt === null) { this.lastTickAt = now; return; }
    const delta = (now - this.lastTickAt) / 1000;
    this.lastTickAt = now;

    if (this.phase === 'playing') {
      this.timeLeft = Math.max(0, this.timeLeft - delta);
      if (this.timeLeft <= 0) {
        this._endRound();
      }
    }
  }

  // ─── Input ─────────────────────────────────────────────────────────────────

  processInput(playerId, inputType, inputData) {
    if (this.finished || this.phase !== 'playing') return;

    const playerNum = this._playerNum(playerId);
    const type      = inputType || (inputData && inputData.type);

    // Adjuster (player2) selects a flag
    if (type === 'selectFlag' && playerNum === 2) {
      const { color } = inputData || {};
      if (!COLORS.includes(color)) return;

      const correct = this.currentSequence[this.currentIndex];
      const isRight = color === correct;

      this.raised.push(color);
      this.currentIndex++;

      this.io.to(this.roomCode).emit('game:flagRaised', {
        color,
        correct: isRight,
        index:   this.currentIndex - 1,
        raised:  [...this.raised],
      });

      if (!isRight) {
        // Wrong flag — lose time
        this.timeLeft = Math.max(0, this.timeLeft - 10);
      }

      if (this.currentIndex >= SEQ_LENGTH) {
        this._endRound();
      }
    }

    // Describer (player1) sends hint to advance if stuck — no actual game effect, just UI signal
    if (type === 'hint' && playerNum === 1) {
      this.io.to(this.roomCode).emit('game:hint', { index: this.currentIndex });
    }

    // Either player advances round after reveal
    if (type === 'nextRound' && this.phase === 'reveal') {
      this._advanceRound();
    }
  }

  _endRound() {
    const seq = this.currentSequence;
    let correct = 0;
    for (let i = 0; i < Math.min(this.raised.length, seq.length); i++) {
      if (this.raised[i] === seq[i]) correct++;
    }

    const pct        = correct / SEQ_LENGTH;
    this.roundScore  = Math.round(pct * 100 + this.timeLeft);
    this.totalScore += this.roundScore;
    this.phase       = 'reveal';

    this.io.to(this.roomCode).emit('game:roundReveal', {
      round:      this.round + 1,
      sequence:   seq,
      raised:     [...this.raised],
      correct,
      roundScore: this.roundScore,
      totalScore: this.totalScore,
    });

    setTimeout(() => {
      if (!this.finished && this.phase === 'reveal') this._advanceRound();
    }, 4000);
  }

  _advanceRound() {
    this.round++;
    if (this.round >= TOTAL_ROUNDS) {
      this._endGame();
      return;
    }
    this.currentIndex = 0;
    this.raised       = [];
    this.roundScore   = 0;
    this.phase        = 'playing';
    this.timeLeft     = ROUND_TIME_S;
  }

  // ─── End ───────────────────────────────────────────────────────────────────

  _endGame() {
    this.finished = true;
    this.phase    = 'done';

    const maxScore = TOTAL_ROUNDS * (100 + ROUND_TIME_S);
    const pct      = this.totalScore / maxScore;

    let stars = 0;
    if (pct >= 0.75)      stars = 3;
    else if (pct >= 0.5)  stars = 2;
    else if (pct >= 0.25) stars = 1;

    this.setWin(stars, this.totalScore, { rounds: TOTAL_ROUNDS });
  }

  // ─── State ─────────────────────────────────────────────────────────────────

  getState() {
    return {
      ...super.getState(),
      phase:         this.phase,
      round:         this.round + 1,
      totalRounds:   TOTAL_ROUNDS,
      currentIndex:  this.currentIndex,
      raised:        [...this.raised],
      totalScore:    this.totalScore,
      roundScore:    this.roundScore,
      timeLeft:      Math.round(this.timeLeft),
      roundDuration: ROUND_TIME_S,
      // Full sequence (player1 / describer sees this to describe colors)
      sequence:      this.currentSequence,
      // Available flag colors for player2
      availableColors: COLORS,
      seqLength:     SEQ_LENGTH,
    };
  }
}

module.exports = { SignalFlagsEngine, COLORS };
