'use strict';

const BaseGameEngine = require('./BaseGameEngine');
const { GAME_IDS } = require('../../shared/constants');

// ─── Timing windows ───────────────────────────────────────────────────────────

const TIMING_PERFECT = 100;   // ms
const TIMING_GOOD    = 200;   // ms

// ─── Song definitions ─────────────────────────────────────────────────────────
// Each note: { time: ms, player: 1|2, lane: 0|1|2, noteId: string }

function buildSong(id, bpm, notes) {
  const beatMs = (60 / bpm) * 1000;
  return {
    id,
    bpm,
    beatMs,
    durationMs: notes.length ? notes[notes.length - 1].time + 2000 : 10000,
    notes: notes.map((n, i) => ({ ...n, noteId: `${id}_n${i}` })),
  };
}

// Helper: generate a note at beat `b` (fractional beats allowed)
const n = (beat, player, lane, bpm) => ({
  time: Math.round((beat * (60 / bpm)) * 1000),
  player,
  lane,
});

const SONG_EASY = buildSong('dawn_chime', 80, [
  n(0,   1, 1, 80), n(1,   2, 0, 80), n(2,   1, 2, 80), n(3,   2, 1, 80),
  n(4,   1, 0, 80), n(5,   2, 2, 80), n(6,   1, 1, 80), n(7,   2, 0, 80),
  n(8,   1, 2, 80), n(8.5, 2, 1, 80), n(9,   1, 0, 80), n(10,  2, 2, 80),
  n(11,  1, 1, 80), n(12,  2, 0, 80), n(13,  1, 2, 80), n(14,  2, 1, 80),
  n(15,  1, 0, 80), n(16,  2, 2, 80), n(16.5,1, 1, 80), n(17,  2, 0, 80),
]);

const SONG_MED = buildSong('forest_waltz', 100, [
  n(0,   1, 0, 100), n(0.5, 2, 2, 100),
  n(1,   1, 1, 100), n(1.5, 2, 0, 100),
  n(2,   1, 2, 100), n(2,   2, 1, 100),
  n(3,   1, 0, 100), n(3.5, 2, 2, 100),
  n(4,   1, 1, 100), n(4,   2, 0, 100),
  n(5,   1, 2, 100), n(5.5, 2, 1, 100),
  n(6,   1, 0, 100), n(6,   2, 2, 100),
  n(7,   1, 1, 100), n(7.5, 2, 0, 100),
  n(8,   1, 2, 100), n(8,   2, 1, 100),
  n(9,   1, 0, 100), n(9.5, 2, 2, 100),
  n(10,  1, 1, 100), n(10.5,2, 0, 100),
  n(11,  1, 2, 100), n(11,  2, 1, 100),
]);

const SONG_HARD = buildSong('tempest_duet', 130, [
  n(0,   1, 0, 130), n(0,   2, 2, 130),
  n(0.5, 1, 1, 130),
  n(1,   2, 0, 130), n(1,   1, 2, 130),
  n(1.5, 2, 1, 130),
  n(2,   1, 0, 130), n(2,   2, 2, 130),
  n(2.5, 1, 1, 130), n(2.5, 2, 0, 130),
  n(3,   1, 2, 130), n(3,   2, 1, 130),
  n(3.5, 1, 0, 130),
  n(4,   2, 2, 130), n(4,   1, 1, 130),
  n(4.5, 2, 0, 130),
  n(5,   1, 2, 130), n(5,   2, 1, 130),
  n(5.5, 1, 0, 130), n(5.5, 2, 2, 130),
  n(6,   1, 1, 130), n(6,   2, 0, 130),
  n(6.5, 1, 2, 130),
  n(7,   2, 1, 130), n(7,   1, 0, 130),
  n(7.5, 2, 2, 130),
  n(8,   1, 1, 130), n(8,   2, 0, 130),
]);

const SONGS = [SONG_EASY, SONG_MED, SONG_HARD];

// ─── Engine ───────────────────────────────────────────────────────────────────

class HarmonyEngine extends BaseGameEngine {
  constructor(roomCode, config, io, room) {
    super(roomCode, { ...config, gameId: GAME_IDS.HARMONY }, io, room);
    this.tickRate = 60;

    const songIndex = Math.min((config.songIndex || 0), SONGS.length - 1);
    this.song        = SONGS[songIndex];
    this.songTime    = 0;       // ms into the song
    this.lastTickAt  = null;

    // Hits yet to be scored (shallow copy)
    this.pendingNotes = this.song.notes.map(n => ({ ...n, hit: false, missed: false }));

    this.harmonyMeter = 50;   // starts mid-range
    this.score        = 0;
    this.combo        = 0;
    this.maxCombo     = 0;

    // Track which note IDs each player has already attempted
    this.hitSet = new Set();

    this.finished = false;
  }

  // ─── Tick ──────────────────────────────────────────────────────────────────

  tick() {
    if (this.finished) return;

    const now = Date.now();
    if (this.lastTickAt === null) {
      this.lastTickAt = now;
      return;
    }
    const delta      = now - this.lastTickAt;
    this.lastTickAt  = now;
    this.songTime   += delta;

    // Mark notes as missed if they're too late
    for (const note of this.pendingNotes) {
      if (note.hit || note.missed) continue;
      if (this.songTime > note.time + TIMING_GOOD) {
        note.missed = true;
        this._onMiss(note);
      }
    }

    // Check song end
    if (this.songTime >= this.song.durationMs) {
      this._endGame();
    }
  }

  // ─── Input ─────────────────────────────────────────────────────────────────

  processInput(playerId, inputType, inputData) {
    if (this.finished || inputType !== 'tap') return;

    const clientTimestamp = inputData.timestamp || Date.now();
    const noteId          = inputData.noteId;

    // Find the note
    const note = this.pendingNotes.find(
      n => n.noteId === noteId && !n.hit && !n.missed
    );

    if (!note) return;

    // Verify player ownership
    const players = this.room.players || [];
    const playerIndex = players.findIndex(p => p.id === playerId) + 1; // 1-based
    if (note.player !== playerIndex) return;

    // Prevent double-hit
    if (this.hitSet.has(noteId)) return;

    const diff = Math.abs(this.songTime - note.time);

    if (diff <= TIMING_PERFECT) {
      this._onHit(note, 'perfect');
    } else if (diff <= TIMING_GOOD) {
      this._onHit(note, 'good');
    } else {
      this._onMiss(note);
    }
  }

  // ─── Scoring ───────────────────────────────────────────────────────────────

  _onHit(note, quality) {
    note.hit = true;
    this.hitSet.add(note.noteId);

    const baseScore = quality === 'perfect' ? 100 : 60;
    this.combo     += 1;
    this.maxCombo   = Math.max(this.maxCombo, this.combo);
    this.score     += baseScore * Math.ceil(this.combo / 5);

    // Harmony meter
    this.harmonyMeter = Math.min(100, this.harmonyMeter + (quality === 'perfect' ? 8 : 4));

    this.io.to(this.roomCode).emit('game:noteHit', {
      noteId:  note.noteId,
      quality,
      combo:   this.combo,
      harmony: this.harmonyMeter,
    });
  }

  _onMiss(note) {
    note.missed = true;
    this.combo  = 0;
    this.harmonyMeter = Math.max(0, this.harmonyMeter - 10);

    this.io.to(this.roomCode).emit('game:noteMiss', {
      noteId:  note.noteId,
      harmony: this.harmonyMeter,
    });
  }

  // ─── End ───────────────────────────────────────────────────────────────────

  _endGame() {
    this.finished = true;

    const total     = this.song.notes.length;
    const hitCount  = this.pendingNotes.filter(n => n.hit).length;
    const accuracy  = total > 0 ? hitCount / total : 0;

    let stars = 0;
    if (accuracy >= 0.9 && this.harmonyMeter >= 80) stars = 3;
    else if (accuracy >= 0.7 && this.harmonyMeter >= 50) stars = 2;
    else if (accuracy >= 0.5) stars = 1;

    this.setWin(stars, this.score, {
      accuracy:  Math.round(accuracy * 100),
      maxCombo:  this.maxCombo,
      harmonyMeter: this.harmonyMeter,
    });
  }

  // ─── State ─────────────────────────────────────────────────────────────────

  getState() {
    // Only send notes within ±2 s of current song time to keep payloads small
    const WINDOW = 2000;
    const activeNotes = this.pendingNotes.filter(
      n => !n.hit && !n.missed && n.time >= this.songTime - WINDOW && n.time <= this.songTime + WINDOW
    );

    return {
      ...super.getState(),
      songTime:     this.songTime,
      harmonyMeter: this.harmonyMeter,
      score:        this.score,
      combo:        this.combo,
      notes:        activeNotes,
    };
  }
}

module.exports = { HarmonyEngine, SONGS };
