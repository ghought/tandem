'use strict';

const BaseGameEngine = require('./BaseGameEngine');
const { GAME_IDS } = require('../../shared/constants');

// ─── Constants ────────────────────────────────────────────────────────────────

const DRAW_TIME_S    = 30;   // P1 has 30s to draw
const TRACE_TIME_S   = 20;   // P2 has 20s to trace
const GRID_SIZE      = 100;  // normalized coordinate space 0-100

// ─── Engine ───────────────────────────────────────────────────────────────────

class MirrorDrawEngine extends BaseGameEngine {
  constructor(roomCode, config, io, room) {
    super(roomCode, { ...config, gameId: GAME_IDS.MIRROR_DRAW }, io, room);
    this.tickRate = 10;

    // phase: 'drawing' | 'tracing' | 'reveal' | 'done'
    this.phase      = 'drawing';
    this.phaseTimer = DRAW_TIME_S;
    this.lastTickAt = null;
    this.finished   = false;

    // P1's strokes: array of arrays of {x, y} points
    this.p1Strokes  = [];
    this.currentP1Stroke = null;

    // P2's strokes: same structure
    this.p2Strokes  = [];
    this.currentP2Stroke = null;

    this.overlapScore = 0;
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  _playerNum(playerId) {
    const idx = (this.room.players || []).findIndex(p => p.id === playerId);
    return idx + 1;
  }

  /** Mirror a point horizontally: x becomes 100-x */
  _mirrorX(x) {
    return GRID_SIZE - x;
  }

  /**
   * Compute overlap score between P1's strokes (mirrored) and P2's strokes.
   * Uses a simple grid-sampling approach: rasterize both stroke sets onto
   * a virtual grid and count cells that appear in both.
   */
  _computeOverlap() {
    const CELLS = 20;
    const cellSize = GRID_SIZE / CELLS;

    const set1 = new Set();
    const set2 = new Set();

    const rasterizeStroke = (stroke, targetSet, mirror) => {
      for (const pt of stroke) {
        const px = mirror ? this._mirrorX(pt.x) : pt.x;
        const cx = Math.floor(px / cellSize);
        const cy = Math.floor(pt.y / cellSize);
        if (cx >= 0 && cx < CELLS && cy >= 0 && cy < CELLS) {
          targetSet.add(`${cx},${cy}`);
        }
      }
    };

    for (const stroke of this.p1Strokes) rasterizeStroke(stroke, set1, true);
    for (const stroke of this.p2Strokes) rasterizeStroke(stroke, set2, false);

    if (set1.size === 0 || set2.size === 0) return 0;

    let overlap = 0;
    for (const cell of set1) {
      if (set2.has(cell)) overlap++;
    }

    // Jaccard-like: overlap / union
    const union = set1.size + set2.size - overlap;
    return Math.round((overlap / union) * 100);
  }

  // ─── Tick ──────────────────────────────────────────────────────────────────

  tick() {
    if (this.finished) return;

    const now = Date.now();
    if (this.lastTickAt === null) { this.lastTickAt = now; return; }
    const delta = (now - this.lastTickAt) / 1000;
    this.lastTickAt = now;

    if (this.phase === 'drawing' || this.phase === 'tracing') {
      this.phaseTimer = Math.max(0, this.phaseTimer - delta);
      if (this.phaseTimer <= 0) {
        this._advancePhase();
      }
    }
  }

  _advancePhase() {
    if (this.phase === 'drawing') {
      // Finalize any open stroke
      if (this.currentP1Stroke) {
        this.p1Strokes.push(this.currentP1Stroke);
        this.currentP1Stroke = null;
      }
      this.phase      = 'tracing';
      this.phaseTimer = TRACE_TIME_S;
      this.io.to(this.roomCode).emit('game:phaseChange', {
        phase:     'tracing',
        p1Strokes: this.p1Strokes,
      });
    } else if (this.phase === 'tracing') {
      if (this.currentP2Stroke) {
        this.p2Strokes.push(this.currentP2Stroke);
        this.currentP2Stroke = null;
      }
      this._endGame();
    }
  }

  // ─── Input ─────────────────────────────────────────────────────────────────

  processInput(playerId, inputType, inputData) {
    if (this.finished) return;

    const playerNum = this._playerNum(playerId);
    const type      = inputType || (inputData && inputData.type);

    // P1 drawing
    if (playerNum === 1 && this.phase === 'drawing') {
      if (type === 'strokeStart') {
        this.currentP1Stroke = [];
      } else if (type === 'strokePoint' && this.currentP1Stroke) {
        const { x, y } = inputData || {};
        if (typeof x === 'number' && typeof y === 'number') {
          this.currentP1Stroke.push({ x, y });
          // Broadcast mirrored point to P2 in real-time
          this.io.to(this.roomCode).emit('game:ghostPoint', {
            x: this._mirrorX(x), y,
          });
        }
      } else if (type === 'strokeEnd' && this.currentP1Stroke) {
        if (this.currentP1Stroke.length > 0) {
          this.p1Strokes.push(this.currentP1Stroke);
        }
        this.currentP1Stroke = null;
      } else if (type === 'done') {
        this.phaseTimer = 0;
      }
    }

    // P2 tracing
    if (playerNum === 2 && this.phase === 'tracing') {
      if (type === 'strokeStart') {
        this.currentP2Stroke = [];
      } else if (type === 'strokePoint' && this.currentP2Stroke) {
        const { x, y } = inputData || {};
        if (typeof x === 'number' && typeof y === 'number') {
          this.currentP2Stroke.push({ x, y });
        }
      } else if (type === 'strokeEnd' && this.currentP2Stroke) {
        if (this.currentP2Stroke.length > 0) {
          this.p2Strokes.push(this.currentP2Stroke);
        }
        this.currentP2Stroke = null;
      } else if (type === 'done') {
        this.phaseTimer = 0;
      }
    }
  }

  // ─── End ───────────────────────────────────────────────────────────────────

  _endGame() {
    this.finished     = true;
    this.overlapScore = this._computeOverlap();

    let stars = 0;
    if (this.overlapScore >= 70) stars = 3;
    else if (this.overlapScore >= 45) stars = 2;
    else if (this.overlapScore >= 20) stars = 1;

    this.setWin(stars, this.overlapScore * 10, { overlapScore: this.overlapScore });
  }

  // ─── State ─────────────────────────────────────────────────────────────────

  getState() {
    return {
      ...super.getState(),
      phase:        this.phase,
      phaseTimer:   Math.round(this.phaseTimer * 10) / 10,
      drawDuration: DRAW_TIME_S,
      traceDuration: TRACE_TIME_S,
      p1Strokes:    this.p1Strokes,
      // P2 gets mirrored ghost of P1's strokes
      ghostStrokes: this.p1Strokes.map(stroke =>
        stroke.map(pt => ({ x: this._mirrorX(pt.x), y: pt.y }))
      ),
      p2Strokes:    this.p2Strokes,
      overlapScore: this.overlapScore,
    };
  }
}

module.exports = { MirrorDrawEngine };
