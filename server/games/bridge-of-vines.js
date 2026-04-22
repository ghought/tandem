'use strict';

const BaseGameEngine = require('./BaseGameEngine');
const { GAME_IDS } = require('../../shared/constants');

// ─── Constants ────────────────────────────────────────────────────────────────

// Timing windows per connection (ms), narrowing as difficulty increases
const WINDOWS = [150, 100, 75, 50, 50];
const CONNECTIONS_NEEDED = WINDOWS.length;   // 5
const MAX_LIVES          = 3;

// Wait for both players to tap within WAIT_MS of each other
const WAIT_WINDOW_MS = 3000;   // server waits up to 3s for both taps

// ─── Engine ───────────────────────────────────────────────────────────────────

class BridgeVinesEngine extends BaseGameEngine {
  constructor(roomCode, config, io, room) {
    super(roomCode, { ...config, gameId: GAME_IDS.BRIDGE_OF_VINES }, io, room);
    this.tickRate = 10;

    this.connections    = 0;
    this.lives          = MAX_LIVES;
    this.phase          = 'playing';   // 'playing' | 'done'

    this.lastTapP1      = null;
    this.lastTapP2      = null;
    this.waitTimeout    = null;

    this.finished = false;
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  get currentWindow() {
    return WINDOWS[Math.min(this.connections, WINDOWS.length - 1)];
  }

  _playerNum(playerId) {
    const players = this.room.players || [];
    const idx     = players.findIndex(p => p.id === playerId);
    return idx + 1;
  }

  // ─── Tick ──────────────────────────────────────────────────────────────────

  tick() {
    // Most logic is event-driven; tick just checks for stale unmatched taps
    if (this.finished) return;

    const now = Date.now();
    const staleCutoff = now - WAIT_WINDOW_MS;

    let changed = false;

    if (this.lastTapP1 !== null && this.lastTapP1 < staleCutoff) {
      this.lastTapP1 = null;
      changed = true;
    }
    if (this.lastTapP2 !== null && this.lastTapP2 < staleCutoff) {
      this.lastTapP2 = null;
      changed = true;
    }

    if (changed && this.waitTimeout) {
      clearTimeout(this.waitTimeout);
      this.waitTimeout = null;
    }
  }

  // ─── Input ─────────────────────────────────────────────────────────────────

  processInput(playerId, inputType, inputData) {
    if (this.finished || this.phase !== 'playing') return;
    if (inputType !== 'tap' && (inputData && inputData.type) !== 'tap') return;

    const playerNum = this._playerNum(playerId);
    const ts        = (inputData && inputData.timestamp) || Date.now();

    if (playerNum === 1) this.lastTapP1 = ts;
    if (playerNum === 2) this.lastTapP2 = ts;

    this.io.to(this.roomCode).emit('game:tap', { player: playerNum, timestamp: ts });

    // If both tapped, evaluate
    if (this.lastTapP1 !== null && this.lastTapP2 !== null) {
      const diff = Math.abs(this.lastTapP1 - this.lastTapP2);
      this._evaluate(diff);
    }
  }

  _evaluate(diffMs) {
    const window = this.currentWindow;
    const success = diffMs <= window;

    // Reset tap trackers
    this.lastTapP1 = null;
    this.lastTapP2 = null;

    if (success) {
      this.connections++;
      this.io.to(this.roomCode).emit('game:vineConnect', {
        connections:   this.connections,
        needed:        CONNECTIONS_NEEDED,
        diffMs:        Math.round(diffMs),
        windowMs:      window,
        nextWindowMs:  WINDOWS[Math.min(this.connections, WINDOWS.length - 1)],
      });

      if (this.connections >= CONNECTIONS_NEEDED) {
        this._endGame(true);
      }
    } else {
      this.lives--;
      this.io.to(this.roomCode).emit('game:vineMiss', {
        diffMs:  Math.round(diffMs),
        windowMs: window,
        lives:   this.lives,
      });

      if (this.lives <= 0) {
        this._endGame(false);
      }
    }
  }

  // ─── End ───────────────────────────────────────────────────────────────────

  _endGame(success) {
    this.finished = true;
    this.phase    = 'done';

    if (success) {
      const stars = this.lives === 3 ? 3 : this.lives === 2 ? 2 : 1;
      const score = this.connections * 200 + this.lives * 100;
      this.setWin(stars, score, { connections: this.connections, livesLeft: this.lives });
    } else {
      this.setLoss('no_lives');
    }
  }

  // ─── State ─────────────────────────────────────────────────────────────────

  getState() {
    return {
      ...super.getState(),
      phase:        this.phase,
      connections:  this.connections,
      needed:       CONNECTIONS_NEEDED,
      lives:        this.lives,
      maxLives:     MAX_LIVES,
      currentWindow: this.currentWindow,
      windows:      WINDOWS,
      lastTapP1:    this.lastTapP1,
      lastTapP2:    this.lastTapP2,
    };
  }
}

module.exports = { BridgeVinesEngine };
