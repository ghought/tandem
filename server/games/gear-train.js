'use strict';

const BaseGameEngine = require('./BaseGameEngine');
const { GAME_IDS } = require('../../shared/constants');

// ─── Constants ────────────────────────────────────────────────────────────────

const GAME_DURATION_S   = 60;     // total game length
const WIN_HOLD_S        = 5;      // seconds to hold target RPM to win
const TARGET_TOLERANCE  = 10;     // ±RPM to be considered "on target"
const TAP_WINDOW_MS     = 2000;   // sliding window to measure tap rate
const RPM_DECAY         = 0.92;   // momentum decay per tick (10 Hz)

// Possible target RPMs — picks one randomly at start
const TARGET_OPTIONS = [40, 60, 80, 100, 120];

// ─── Engine ───────────────────────────────────────────────────────────────────

class GearTrainEngine extends BaseGameEngine {
  constructor(roomCode, config, io, room) {
    super(roomCode, { ...config, gameId: GAME_IDS.GEAR_TRAIN }, io, room);
    this.tickRate = 10;

    this.targetRPM     = TARGET_OPTIONS[Math.floor(Math.random() * TARGET_OPTIONS.length)];
    this.currentRPM    = 0;
    this.tapTimestamps = [];   // P1 taps within TAP_WINDOW_MS
    this.onTargetTicks = 0;   // consecutive on-target ticks
    this.totalTicks    = 0;
    this.finished      = false;
    this.phase         = 'spinning'; // 'spinning' | 'won' | 'failed'
    this.direction     = 'right';    // 'left' | 'right' — P2 reads this
    this.score         = 0;
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  _playerNum(playerId) {
    const idx = (this.room.players || []).findIndex(p => p.id === playerId);
    return idx + 1;
  }

  /**
   * Convert recent tap rate (taps/sec) into RPM.
   * One tap = one full gear rotation at the tapping rate.
   */
  _computeRPM() {
    const now    = Date.now();
    const cutoff = now - TAP_WINDOW_MS;

    // Prune old taps
    this.tapTimestamps = this.tapTimestamps.filter(t => t >= cutoff);

    const count = this.tapTimestamps.length;
    if (count < 2) {
      // Decay towards zero when no taps
      return this.currentRPM * RPM_DECAY;
    }

    // Average interval between taps in the window
    let totalInterval = 0;
    for (let i = 1; i < count; i++) {
      totalInterval += this.tapTimestamps[i] - this.tapTimestamps[i - 1];
    }
    const avgIntervalMs = totalInterval / (count - 1);
    const tapsPerSec    = 1000 / avgIntervalMs;
    const rpm           = tapsPerSec * 60;

    // Smooth towards measured value
    return this.currentRPM * 0.4 + rpm * 0.6;
  }

  // ─── Tick ──────────────────────────────────────────────────────────────────

  tick() {
    if (this.finished) return;

    this.totalTicks += 1;
    this.currentRPM  = Math.max(0, Math.round(this._computeRPM() * 10) / 10);

    // Compute direction hint for P2
    const diff = this.currentRPM - this.targetRPM;
    if (Math.abs(diff) <= TARGET_TOLERANCE) {
      this.direction = 'hold';
    } else if (diff < 0) {
      this.direction = 'faster'; // P1 needs to tap faster
    } else {
      this.direction = 'slower'; // P1 needs to tap slower
    }

    // Check win condition
    const onTarget = Math.abs(this.currentRPM - this.targetRPM) < TARGET_TOLERANCE;
    if (onTarget) {
      this.onTargetTicks += 1;
    } else {
      this.onTargetTicks = 0;
    }

    const winTicks = WIN_HOLD_S * this.tickRate;
    if (this.onTargetTicks >= winTicks) {
      this._endGame(true);
      return;
    }

    // Time-out
    if (this.elapsedSeconds >= GAME_DURATION_S) {
      this._endGame(false);
    }
  }

  // ─── Input ─────────────────────────────────────────────────────────────────

  processInput(playerId, inputType, inputData) {
    if (this.finished) return;

    const pNum = this._playerNum(playerId);

    if (pNum === 1 && inputType === 'tap') {
      const ts = (inputData && inputData.timestamp) || Date.now();
      this.tapTimestamps.push(ts);
      // Keep only recent taps
      const cutoff = ts - TAP_WINDOW_MS * 2;
      this.tapTimestamps = this.tapTimestamps.filter(t => t >= cutoff);
    }
  }

  // ─── End ───────────────────────────────────────────────────────────────────

  _endGame(won) {
    this.finished = true;
    this.phase    = won ? 'won' : 'failed';

    const holdRatio = this.totalTicks > 0
      ? this.onTargetTicks / this.totalTicks
      : 0;

    let stars = 0;
    if (won) {
      if (holdRatio >= 0.5) stars = 3;
      else if (holdRatio >= 0.3) stars = 2;
      else stars = 1;
    }

    const score = won ? Math.round(holdRatio * 1000) : 0;

    this.setWin(stars, score, {
      targetRPM:  this.targetRPM,
      finalRPM:   this.currentRPM,
      holdRatio:  Math.round(holdRatio * 100),
    });
  }

  // ─── State ─────────────────────────────────────────────────────────────────

  getState() {
    const timeLeft = Math.max(0, GAME_DURATION_S - Math.round(this.elapsedSeconds));
    const holdProgress = Math.min(1, this.onTargetTicks / (WIN_HOLD_S * this.tickRate));

    return {
      ...super.getState(),
      phase:        this.phase,
      targetRPM:    this.targetRPM,
      currentRPM:   this.currentRPM,
      direction:    this.direction,          // P2 sees this: 'faster'|'slower'|'hold'
      onTarget:     this.direction === 'hold',
      holdProgress, // 0–1, fills win bar
      timeLeft,
      duration:     GAME_DURATION_S,
    };
  }
}

module.exports = { GearTrainEngine };
