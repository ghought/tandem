'use strict';

const BaseGameEngine = require('./BaseGameEngine');
const { GAME_IDS } = require('../../shared/constants');

// ─── Constants ────────────────────────────────────────────────────────────────

const BEATS_PER_SEQUENCE = 8;
const TOTAL_SEQUENCES    = 3;
const BEAT_INTERVAL_MS   = 800;   // ms between beats (75 BPM)
const SYNC_WINDOW_MS     = 200;   // both must tap within this window

// ─── Engine ───────────────────────────────────────────────────────────────────

class GrowTogetherEngine extends BaseGameEngine {
  constructor(roomCode, config, io, room) {
    super(roomCode, { ...config, gameId: GAME_IDS.GROW_TOGETHER }, io, room);
    this.tickRate = 10;

    this.sequence      = 0;    // 0-based
    this.beat          = 0;    // 0-based within current sequence
    this.bloomed       = 0;
    this.totalNeeded   = BEATS_PER_SEQUENCE * TOTAL_SEQUENCES;
    this.syncStreak    = 0;
    this.phase         = 'waiting';   // 'waiting' | 'playing' | 'done'

    this.lastBeatAt    = null;
    this.nextBeatAt    = null;
    this.lastTickAt    = null;

    this.lastTapP1     = null;
    this.lastTapP2     = null;

    this.finished      = false;
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  start() {
    super.start();
    // Countdown before first beat
    setTimeout(() => {
      this.phase     = 'playing';
      this.nextBeatAt = Date.now() + BEAT_INTERVAL_MS;
      this.io.to(this.roomCode).emit('game:beatStart', {
        sequence:      this.sequence + 1,
        totalSequences: TOTAL_SEQUENCES,
        beatIntervalMs: BEAT_INTERVAL_MS,
      });
    }, 2000);
  }

  // ─── Tick ──────────────────────────────────────────────────────────────────

  tick() {
    if (this.finished || this.phase !== 'playing') return;

    const now = Date.now();
    if (this.lastTickAt === null) { this.lastTickAt = now; return; }
    this.lastTickAt = now;

    if (this.nextBeatAt && now >= this.nextBeatAt) {
      this._onBeat(now);
    }
  }

  _onBeat(now) {
    const beatIndex = this.sequence * BEATS_PER_SEQUENCE + this.beat;

    // Check if both tapped within the window around this beat
    const p1Tapped = this.lastTapP1 !== null && Math.abs(this.lastTapP1 - now) <= SYNC_WINDOW_MS;
    const p2Tapped = this.lastTapP2 !== null && Math.abs(this.lastTapP2 - now) <= SYNC_WINDOW_MS;

    let synced = false;
    if (p1Tapped && p2Tapped) {
      synced = true;
      this.bloomed++;
      this.syncStreak++;
    } else {
      this.syncStreak = 0;
    }

    this.io.to(this.roomCode).emit('game:beat', {
      beat:        this.beat + 1,
      sequence:    this.sequence + 1,
      synced,
      bloomed:     this.bloomed,
      totalNeeded: this.totalNeeded,
      syncStreak:  this.syncStreak,
      beatIndex,
    });

    // Reset tap trackers
    this.lastTapP1 = null;
    this.lastTapP2 = null;

    this.beat++;
    if (this.beat >= BEATS_PER_SEQUENCE) {
      this.beat = 0;
      this.sequence++;

      if (this.sequence >= TOTAL_SEQUENCES) {
        this._endGame();
        return;
      }

      // Brief pause between sequences
      this.nextBeatAt = now + BEAT_INTERVAL_MS * 2;
      this.io.to(this.roomCode).emit('game:sequenceEnd', {
        sequence:    this.sequence,
        nextSequence: this.sequence + 1,
        bloomed:     this.bloomed,
      });
    } else {
      this.nextBeatAt = now + BEAT_INTERVAL_MS;
    }
  }

  // ─── Input ─────────────────────────────────────────────────────────────────

  processInput(playerId, inputType, inputData) {
    if (this.finished || this.phase !== 'playing') return;
    if (inputType !== 'tap' && (inputData && inputData.type) !== 'tap') return;

    const players   = this.room.players || [];
    const idx       = players.findIndex(p => p.id === playerId);
    const playerNum = idx + 1;
    const ts        = (inputData && inputData.timestamp) || Date.now();

    if (playerNum === 1) this.lastTapP1 = ts;
    if (playerNum === 2) this.lastTapP2 = ts;

    this.io.to(this.roomCode).emit('game:tap', { player: playerNum, timestamp: ts });
  }

  // ─── End ───────────────────────────────────────────────────────────────────

  _endGame() {
    this.finished = true;
    this.phase    = 'done';

    const bloomPct = this.bloomed / this.totalNeeded;

    let stars = 0;
    if (bloomPct >= 0.85)      stars = 3;
    else if (bloomPct >= 0.6)  stars = 2;
    else if (bloomPct >= 0.35) stars = 1;

    const score = Math.round(bloomPct * 1000);
    this.setWin(stars, score, { bloomed: this.bloomed, totalNeeded: this.totalNeeded });
  }

  // ─── State ─────────────────────────────────────────────────────────────────

  getState() {
    return {
      ...super.getState(),
      phase:          this.phase,
      beat:           this.beat + 1,
      sequence:       this.sequence + 1,
      totalSequences: TOTAL_SEQUENCES,
      beatsPerSequence: BEATS_PER_SEQUENCE,
      bloomed:        this.bloomed,
      totalNeeded:    this.totalNeeded,
      syncStreak:     this.syncStreak,
      nextBeatAt:     this.nextBeatAt,
      beatIntervalMs: BEAT_INTERVAL_MS,
      syncWindowMs:   SYNC_WINDOW_MS,
    };
  }
}

module.exports = { GrowTogetherEngine };
