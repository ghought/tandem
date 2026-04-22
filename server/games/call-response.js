'use strict';

const BaseGameEngine = require('./BaseGameEngine');
const { GAME_IDS } = require('../../shared/constants');

// ─── Constants ────────────────────────────────────────────────────────────────

const TOTAL_ROUNDS   = 3;
const RECORD_TIME_S  = 8;    // max time P1 has to tap their pattern
const PLAYBACK_TIME_S = 3;   // time to show the visual playback before P2 can respond
const ECHO_TIME_S    = 10;   // time P2 has to echo the pattern
const TOLERANCE      = 0.15; // ±15% timing tolerance (normalized 0-100 scale)
const MIN_TAPS       = 2;
const MAX_TAPS       = 8;

// ─── Engine ───────────────────────────────────────────────────────────────────

class CallResponseEngine extends BaseGameEngine {
  constructor(roomCode, config, io, room) {
    super(roomCode, { ...config, gameId: GAME_IDS.CALL_RESPONSE }, io, room);
    this.tickRate = 10;

    this.round       = 0;
    this.totalScore  = 0;
    this.finished    = false;

    // phase: 'recording' | 'playback' | 'echoing' | 'reveal' | 'done'
    this.phase       = 'recording';
    this.phaseTimer  = RECORD_TIME_S;
    this.lastTickAt  = null;

    // Tap sequences stored as timestamps (normalized 0–100 relative to first tap)
    this.p1Pattern   = [];   // normalized
    this.p2Pattern   = [];   // normalized
    this.p1RawStart  = null; // absolute ms of first p1 tap this round
    this.p2RawStart  = null;
    this.p1RawTaps   = [];   // raw timestamps
    this.p2RawTaps   = [];
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  _playerNum(playerId) {
    const idx = (this.room.players || []).findIndex(p => p.id === playerId);
    return idx + 1;
  }

  /** Normalize raw tap timestamps (ms) into 0–100 scale */
  _normalize(rawTaps) {
    if (rawTaps.length < 1) return [];
    const start = rawTaps[0];
    const end   = rawTaps[rawTaps.length - 1];
    const span  = end - start || 1;
    return rawTaps.map(t => ((t - start) / span) * 100);
  }

  /** Compare two normalized patterns: returns 0–100 accuracy */
  _comparePatterns(p1, p2) {
    if (p1.length === 0 || p2.length === 0) return 0;
    if (p1.length !== p2.length) {
      // Length mismatch — penalize proportionally
      const lenScore = Math.max(0, 1 - Math.abs(p1.length - p2.length) / p1.length);
      const shorter  = p1.length < p2.length ? p1 : p2;
      const longer   = p1.length < p2.length ? p2 : p1;
      // compare the aligned portion
      let matched = 0;
      for (let i = 0; i < shorter.length; i++) {
        const diff = Math.abs(shorter[i] - longer[i]) / 100;
        if (diff <= TOLERANCE) matched++;
      }
      return Math.round((matched / longer.length) * lenScore * 100);
    }
    // Same length — compare pointwise
    let matched = 0;
    for (let i = 0; i < p1.length; i++) {
      const diff = Math.abs(p1[i] - p2[i]) / 100;
      if (diff <= TOLERANCE) matched++;
    }
    return Math.round((matched / p1.length) * 100);
  }

  // ─── Tick ──────────────────────────────────────────────────────────────────

  tick() {
    if (this.finished) return;

    const now = Date.now();
    if (this.lastTickAt === null) { this.lastTickAt = now; return; }
    const delta = (now - this.lastTickAt) / 1000;
    this.lastTickAt = now;

    this.phaseTimer = Math.max(0, this.phaseTimer - delta);

    if (this.phaseTimer <= 0) {
      this._advancePhase();
    }
  }

  // ─── Phase transitions ─────────────────────────────────────────────────────

  _advancePhase() {
    if (this.phase === 'recording') {
      // Finalize P1 pattern
      this.p1Pattern  = this._normalize(this.p1RawTaps);
      this.phase      = 'playback';
      this.phaseTimer = PLAYBACK_TIME_S;
      this.io.to(this.roomCode).emit('game:phaseChange', {
        phase: 'playback', pattern: this.p1Pattern,
      });
    } else if (this.phase === 'playback') {
      this.phase      = 'echoing';
      this.phaseTimer = ECHO_TIME_S;
      this.p2RawTaps  = [];
      this.p2RawStart = null;
      this.io.to(this.roomCode).emit('game:phaseChange', { phase: 'echoing' });
    } else if (this.phase === 'echoing') {
      this._endRound();
    } else if (this.phase === 'reveal') {
      this._nextRound();
    }
  }

  _endRound() {
    this.p2Pattern = this._normalize(this.p2RawTaps);
    const accuracy = this._comparePatterns(this.p1Pattern, this.p2Pattern);
    const roundScore = accuracy;
    this.totalScore += roundScore;

    this.phase      = 'reveal';
    this.phaseTimer = 3;

    this.io.to(this.roomCode).emit('game:roundReveal', {
      round:      this.round + 1,
      p1Pattern:  this.p1Pattern,
      p2Pattern:  this.p2Pattern,
      accuracy,
      roundScore,
      totalScore: this.totalScore,
    });

    setTimeout(() => {
      if (!this.finished && this.phase === 'reveal') this._nextRound();
    }, 3500);
  }

  _nextRound() {
    this.round++;
    if (this.round >= TOTAL_ROUNDS) {
      this._endGame();
      return;
    }
    // Reset for next round
    this.phase      = 'recording';
    this.phaseTimer = RECORD_TIME_S;
    this.p1RawTaps  = [];
    this.p2RawTaps  = [];
    this.p1RawStart = null;
    this.p2RawStart = null;
    this.p1Pattern  = [];
    this.p2Pattern  = [];
    this.io.to(this.roomCode).emit('game:phaseChange', { phase: 'recording', round: this.round + 1 });
  }

  // ─── Input ─────────────────────────────────────────────────────────────────

  processInput(playerId, inputType, inputData) {
    if (this.finished) return;

    const playerNum = this._playerNum(playerId);
    const type      = inputType || (inputData && inputData.type);
    const ts        = (inputData && inputData.timestamp) || Date.now();

    if (type === 'tap' && playerNum === 1 && this.phase === 'recording') {
      if (this.p1RawTaps.length === 0) this.p1RawStart = ts;
      if (this.p1RawTaps.length < MAX_TAPS) {
        this.p1RawTaps.push(ts);
      }
      this.io.to(this.roomCode).emit('game:tap', { player: 1, tapIndex: this.p1RawTaps.length - 1 });
    }

    if (type === 'tap' && playerNum === 2 && this.phase === 'echoing') {
      if (this.p2RawTaps.length === 0) this.p2RawStart = ts;
      if (this.p2RawTaps.length < MAX_TAPS) {
        this.p2RawTaps.push(ts);
      }
      this.io.to(this.roomCode).emit('game:tap', { player: 2, tapIndex: this.p2RawTaps.length - 1 });
    }

    // P1 can signal they're done recording early
    if (type === 'done' && playerNum === 1 && this.phase === 'recording') {
      if (this.p1RawTaps.length >= MIN_TAPS) {
        this.phaseTimer = 0;
      }
    }

    // P2 can signal they're done echoing early
    if (type === 'done' && playerNum === 2 && this.phase === 'echoing') {
      if (this.p2RawTaps.length >= MIN_TAPS) {
        this.phaseTimer = 0;
      }
    }
  }

  // ─── End ───────────────────────────────────────────────────────────────────

  _endGame() {
    this.finished = true;
    this.phase    = 'done';

    const maxScore = TOTAL_ROUNDS * 100;
    const pct      = this.totalScore / maxScore;

    let stars = 0;
    if (pct >= 0.8)       stars = 3;
    else if (pct >= 0.55) stars = 2;
    else if (pct >= 0.3)  stars = 1;

    this.setWin(stars, this.totalScore, { rounds: TOTAL_ROUNDS });
  }

  // ─── State ─────────────────────────────────────────────────────────────────

  getState() {
    return {
      ...super.getState(),
      phase:       this.phase,
      round:       this.round + 1,
      totalRounds: TOTAL_ROUNDS,
      phaseTimer:  Math.round(this.phaseTimer * 10) / 10,
      p1TapCount:  this.p1RawTaps.length,
      p2TapCount:  this.p2RawTaps.length,
      p1Pattern:   this.p1Pattern,
      p2Pattern:   this.p2Pattern,
      totalScore:  this.totalScore,
    };
  }
}

module.exports = { CallResponseEngine };
