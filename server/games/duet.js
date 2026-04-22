'use strict';

const BaseGameEngine = require('./BaseGameEngine');
const { GAME_IDS } = require('../../shared/constants');

// ─── Constants ────────────────────────────────────────────────────────────────

const GAME_DURATION_S  = 90;
const BOSS_ACCURACY    = 0.80;   // 80% required from each player
const COLUMNS          = 3;
const NOTE_TRAVEL_MS   = 2500;   // notes travel for 2.5 seconds
const HIT_WINDOW_MS    = 200;    // ±200ms hit window

// Pre-composed note streams (column 0-2, spawnOffset in seconds from game start)
// P1 = treble (higher notes), P2 = bass (lower notes)
function generateNoteStream(player, durationS) {
  const notes   = [];
  const tempo   = 0.5;   // note every 0.5 seconds
  const patterns = [
    [0, 1, 2, 1, 0, 2, 1, 0],
    [2, 0, 1, 2, 0, 1, 2, 0],
    [1, 2, 0, 1, 2, 0, 1, 2],
  ];
  const patternOffset = player === 1 ? 0 : 1;
  const pattern = patterns[patternOffset % patterns.length];
  let id = 0;
  for (let t = 2; t < durationS; t += tempo) {
    // Occasional rest (every 8th note)
    if (Math.floor(t / tempo) % 8 === 7) continue;
    notes.push({
      id:     `p${player}_${id++}`,
      player,
      column: pattern[Math.floor(t / tempo) % pattern.length],
      spawnOffsetMs: Math.round(t * 1000) - NOTE_TRAVEL_MS,
      targetOffsetMs: Math.round(t * 1000),
      hit: null,
    });
  }
  return notes;
}

// ─── Engine ───────────────────────────────────────────────────────────────────

class DuetEngine extends BaseGameEngine {
  constructor(roomCode, config, io, room) {
    super(roomCode, { ...config, gameId: GAME_IDS.DUET }, io, room);
    this.tickRate = 60;

    this.finished   = false;
    this.lastTickAt = null;

    this.p1Notes    = generateNoteStream(1, GAME_DURATION_S);
    this.p2Notes    = generateNoteStream(2, GAME_DURATION_S);
    this.allNotes   = [...this.p1Notes, ...this.p2Notes];

    this.p1Hits     = 0;
    this.p1Misses   = 0;
    this.p2Hits     = 0;
    this.p2Misses   = 0;

    this.simultaneousHits = 0;   // both hit at the same tick
    this.lastP1HitAt      = null;
    this.lastP2HitAt      = null;
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  _playerNum(playerId) {
    const idx = (this.room.players || []).findIndex(p => p.id === playerId);
    return idx + 1;
  }

  _accuracy(hits, misses) {
    const total = hits + misses;
    return total > 0 ? Math.round((hits / total) * 100) : 0;
  }

  // ─── Tick ──────────────────────────────────────────────────────────────────

  tick() {
    if (this.finished) return;

    const now = Date.now();
    if (this.lastTickAt === null) { this.lastTickAt = now; return; }
    this.lastTickAt = now;

    const elapsed = this.elapsedSeconds * 1000;  // ms since start

    // Expire missed notes
    for (const note of this.allNotes) {
      if (note.hit !== null) continue;
      const noteElapsed = elapsed - note.targetOffsetMs;
      if (noteElapsed > HIT_WINDOW_MS * 2) {
        note.hit = false;
        if (note.player === 1) this.p1Misses++;
        else this.p2Misses++;
      }
    }

    if (this.elapsedSeconds >= GAME_DURATION_S) {
      this._endGame();
    }
  }

  // ─── Input ─────────────────────────────────────────────────────────────────

  processInput(playerId, inputType, inputData) {
    if (this.finished) return;

    const playerNum = this._playerNum(playerId);
    const type      = inputType || (inputData && inputData.type);

    if (type !== 'tap') return;

    const column = inputData && inputData.column != null ? inputData.column : 0;
    const now    = Date.now();
    const elapsed = now - this._startTime;

    const notes = playerNum === 1 ? this.p1Notes : this.p2Notes;

    // Find nearest unhit note in the same column within window
    let best      = null;
    let bestDelta = Infinity;
    for (const note of notes) {
      if (note.hit !== null) continue;
      if (note.column !== column) continue;
      const delta = Math.abs(elapsed - note.targetOffsetMs);
      if (delta <= HIT_WINDOW_MS && delta < bestDelta) {
        best = note;
        bestDelta = delta;
      }
    }

    if (best) {
      best.hit = true;
      const accuracy = Math.round(Math.max(0, 100 - (bestDelta / HIT_WINDOW_MS) * 100));

      if (playerNum === 1) {
        this.p1Hits++;
        this.lastP1HitAt = now;
      } else {
        this.p2Hits++;
        this.lastP2HitAt = now;
      }

      // Check simultaneous hit
      const simultaneously = this.lastP1HitAt && this.lastP2HitAt &&
        Math.abs(this.lastP1HitAt - this.lastP2HitAt) < 300;
      if (simultaneously) this.simultaneousHits++;

      this.io.to(this.roomCode).emit('game:noteHit', {
        player: playerNum, noteId: best.id, column, accuracy, simultaneously,
      });
    } else {
      this.io.to(this.roomCode).emit('game:noteMiss', { player: playerNum, column });
    }
  }

  // ─── End ───────────────────────────────────────────────────────────────────

  _endGame() {
    this.finished = true;

    const p1Acc = this._accuracy(this.p1Hits, this.p1Misses);
    const p2Acc = this._accuracy(this.p2Hits, this.p2Misses);
    const combined = Math.round((p1Acc + p2Acc) / 2);

    let stars = 0;
    const bothPassBoss = p1Acc >= BOSS_ACCURACY * 100 && p2Acc >= BOSS_ACCURACY * 100;
    if (bothPassBoss) stars = 3;
    else if (combined >= 65) stars = 2;
    else if (combined >= 40) stars = 1;

    const score = this.p1Hits * 10 + this.p2Hits * 10 + this.simultaneousHits * 25;
    this.setWin(stars, score, {
      p1Accuracy:       p1Acc,
      p2Accuracy:       p2Acc,
      combinedAccuracy: combined,
      simultaneousHits: this.simultaneousHits,
    });
  }

  // ─── State ─────────────────────────────────────────────────────────────────

  getState() {
    const elapsed = this._startTime ? Date.now() - this._startTime : 0;
    const windowMs = NOTE_TRAVEL_MS + 2000;

    const visibleNotes = (notes) => notes
      .filter(n => {
        const age = elapsed - n.spawnOffsetMs;
        return age >= 0 && age < windowMs && n.hit !== false;
      })
      .map(n => ({
        id:       n.id,
        column:   n.column,
        progress: Math.min(1.5, (elapsed - n.spawnOffsetMs) / NOTE_TRAVEL_MS),
        hit:      n.hit,
      }));

    return {
      ...super.getState(),
      p1Notes:          visibleNotes(this.p1Notes),
      p2Notes:          visibleNotes(this.p2Notes),
      p1Accuracy:       this._accuracy(this.p1Hits, this.p1Misses),
      p2Accuracy:       this._accuracy(this.p2Hits, this.p2Misses),
      p1Hits:           this.p1Hits,
      p2Hits:           this.p2Hits,
      simultaneousHits: this.simultaneousHits,
      columns:          COLUMNS,
      duration:         GAME_DURATION_S,
      elapsed:          Math.round(this.elapsedSeconds),
      hitWindowMs:      HIT_WINDOW_MS,
    };
  }
}

module.exports = { DuetEngine };
