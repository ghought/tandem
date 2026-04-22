'use strict';

const BaseGameEngine = require('./BaseGameEngine');
const { GAME_IDS } = require('../../shared/constants');

// ─── Constants ────────────────────────────────────────────────────────────────

const GAME_DURATION_S  = 60;
const MIN_BPM          = 60;
const MAX_BPM          = 180;
const DEFAULT_BPM      = 90;
const TAP_WINDOW_MS    = 150;   // ±150ms hit window for musician
const BPM_DECAY        = 0.97;  // per-tick BPM decay (toward default)
const NOTES_PER_CYCLE  = 4;     // notes generated per beat cycle

// ─── Engine ───────────────────────────────────────────────────────────────────

class ConductorEngine extends BaseGameEngine {
  constructor(roomCode, config, io, room) {
    super(roomCode, { ...config, gameId: GAME_IDS.CONDUCTOR }, io, room);
    this.tickRate = 20;

    this.bpm           = DEFAULT_BPM;
    this.lastBpmTap    = null;
    this.bpmTapHistory = [];   // recent conductor tap timestamps (for BPM calc)

    // Note lane: notes scrolling toward hit line
    this.notes         = [];   // { id, spawnTime, targetTime, hit: bool|null }
    this.noteIdCounter = 0;
    this.lastNoteSpawn = null;

    // Scoring
    this.hits       = 0;
    this.misses     = 0;
    this.accuracy   = 0;

    this.finished   = false;
    this.lastTickAt = null;
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  _playerNum(playerId) {
    const idx = (this.room.players || []).findIndex(p => p.id === playerId);
    return idx + 1;
  }

  /** Compute BPM from the last few tap timestamps */
  _computeBpm(tapHistory) {
    if (tapHistory.length < 2) return this.bpm;
    const recent = tapHistory.slice(-4);
    let sum = 0;
    for (let i = 1; i < recent.length; i++) {
      sum += recent[i] - recent[i - 1];
    }
    const avgInterval = sum / (recent.length - 1);
    const bpm = 60000 / avgInterval;
    return Math.max(MIN_BPM, Math.min(MAX_BPM, bpm));
  }

  // ─── Tick ──────────────────────────────────────────────────────────────────

  tick() {
    if (this.finished) return;

    const now = Date.now();
    if (this.lastTickAt === null) { this.lastTickAt = now; return; }
    this.lastTickAt = now;

    // Slowly decay BPM toward default when conductor isn't tapping
    const timeSinceLastTap = this.lastBpmTap ? now - this.lastBpmTap : Infinity;
    if (timeSinceLastTap > 3000) {
      this.bpm = this.bpm * BPM_DECAY + DEFAULT_BPM * (1 - BPM_DECAY);
      this.bpm = Math.max(MIN_BPM, Math.min(MAX_BPM, this.bpm));
    }

    // Spawn new notes based on BPM
    const beatIntervalMs = 60000 / this.bpm;
    if (this.lastNoteSpawn === null || now - this.lastNoteSpawn >= beatIntervalMs) {
      this._spawnNote(now, beatIntervalMs);
      this.lastNoteSpawn = now;
    }

    // Expire notes that were missed (past target + window)
    for (const note of this.notes) {
      if (note.hit === null && now > note.targetTime + TAP_WINDOW_MS * 2) {
        note.hit = false;
        this.misses++;
      }
    }

    // Trim old notes (keep max 20 in memory)
    this.notes = this.notes.filter(n => now - n.targetTime < 5000);

    // Compute accuracy
    const total = this.hits + this.misses;
    this.accuracy = total > 0 ? Math.round((this.hits / total) * 100) : 0;

    // End game
    if (this.elapsedSeconds >= GAME_DURATION_S) {
      this._endGame();
    }
  }

  _spawnNote(now, beatIntervalMs) {
    // Note travels for 2 seconds to reach the hit line
    const travelMs = 2000;
    const note = {
      id:         this.noteIdCounter++,
      spawnTime:  now,
      targetTime: now + travelMs,
      hit:        null,
      // Normalize spawn position for client (0 = spawned at top, arrives at 1.0 = hit line)
    };
    this.notes.push(note);
  }

  // ─── Input ─────────────────────────────────────────────────────────────────

  processInput(playerId, inputType, inputData) {
    if (this.finished) return;

    const playerNum = this._playerNum(playerId);
    const type      = inputType || (inputData && inputData.type);
    const ts        = (inputData && inputData.timestamp) || Date.now();

    // Conductor (P1) taps to set tempo
    if (type === 'tap' && playerNum === 1) {
      this.bpmTapHistory.push(ts);
      if (this.bpmTapHistory.length > 8) this.bpmTapHistory.shift();
      this.lastBpmTap = ts;
      this.bpm = this._computeBpm(this.bpmTapHistory);
      this.io.to(this.roomCode).emit('game:conductorTap', { bpm: Math.round(this.bpm) });
    }

    // Musician (P2) taps to hit notes
    if (type === 'tap' && playerNum === 2) {
      const now = ts;
      // Find the nearest unhit note within window
      let best = null;
      let bestDelta = Infinity;
      for (const note of this.notes) {
        if (note.hit !== null) continue;
        const delta = Math.abs(now - note.targetTime);
        if (delta <= TAP_WINDOW_MS && delta < bestDelta) {
          best = note;
          bestDelta = delta;
        }
      }
      if (best) {
        best.hit = true;
        this.hits++;
        const accuracy = Math.round(Math.max(0, 100 - (bestDelta / TAP_WINDOW_MS) * 100));
        this.io.to(this.roomCode).emit('game:noteHit', { noteId: best.id, delta: bestDelta, accuracy });
      } else {
        // Early/late tap with no note in window
        this.io.to(this.roomCode).emit('game:noteMiss', { ts: now });
      }
    }
  }

  // ─── End ───────────────────────────────────────────────────────────────────

  _endGame() {
    this.finished = true;

    let stars = 0;
    if (this.accuracy >= 80) stars = 3;
    else if (this.accuracy >= 55) stars = 2;
    else if (this.accuracy >= 30) stars = 1;

    const score = this.hits * 10;
    this.setWin(stars, score, {
      accuracy: this.accuracy,
      hits:     this.hits,
      misses:   this.misses,
    });
  }

  // ─── State ─────────────────────────────────────────────────────────────────

  getState() {
    const now = Date.now();
    return {
      ...super.getState(),
      bpm:        Math.round(this.bpm),
      minBpm:     MIN_BPM,
      maxBpm:     MAX_BPM,
      // Send notes with travel progress (0 = spawned, 1 = at hit line, >1 = past)
      notes:      this.notes
        .filter(n => n.hit === null || now - n.targetTime < 500)
        .map(n => ({
          id:       n.id,
          progress: Math.min(1.5, (now - n.spawnTime) / (n.targetTime - n.spawnTime)),
          hit:      n.hit,
        })),
      hits:       this.hits,
      misses:     this.misses,
      accuracy:   this.accuracy,
      duration:   GAME_DURATION_S,
      elapsed:    Math.round(this.elapsedSeconds),
      hitWindowMs: TAP_WINDOW_MS,
    };
  }
}

module.exports = { ConductorEngine };
