'use strict';

const BaseGameEngine = require('./BaseGameEngine');
const { GAME_IDS } = require('../../shared/constants');

// ─── Blueprint data ───────────────────────────────────────────────────────────

const SHAPES = ['circle', 'square', 'triangle'];

// Each color has a hex code (shown to Reader) and a swatch name (shown to Builder).
// Reader must describe without naming the color directly.
const COLORS = [
  { hex: '#FF4444', name: 'Swatch A', label: 'HEX #FF4444' },
  { hex: '#4488FF', name: 'Swatch B', label: 'HEX #4488FF' },
  { hex: '#44CC44', name: 'Swatch C', label: 'HEX #44CC44' },
  { hex: '#FFAA00', name: 'Swatch D', label: 'HEX #FFAA00' },
  { hex: '#AA44CC', name: 'Swatch E', label: 'HEX #AA44CC' },
];

const BLUEPRINT_COUNT = 5;
const TIME_PER_SHAPE  = 30;  // seconds per shape

function generateBlueprint() {
  const steps = [];
  for (let i = 0; i < BLUEPRINT_COUNT; i++) {
    const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    steps.push({ shape, color });
  }
  return steps;
}

// ─── Engine ───────────────────────────────────────────────────────────────────

class BlueprintReaderEngine extends BaseGameEngine {
  constructor(roomCode, config, io, room) {
    super(roomCode, { ...config, gameId: GAME_IDS.BLUEPRINT_READER }, io, room);
    this.tickRate = 5;

    this.blueprint      = generateBlueprint();
    this.currentIndex   = 0;
    this.correctPlacements = 0;
    this.wrongAttempts  = 0;
    this.totalScore     = 0;
    this.phase          = 'building';  // 'building' | 'complete'
    this.timeLeft       = TIME_PER_SHAPE;
    this.lastTickAt     = null;
    this.finished       = false;
    this.lastResult     = null;  // 'correct' | 'wrong' | null — for flash feedback
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  _playerNum(playerId) {
    const idx = (this.room.players || []).findIndex(p => p.id === playerId);
    return idx + 1;
  }

  get _currentStep() {
    return this.blueprint[this.currentIndex] || null;
  }

  // ─── Tick ──────────────────────────────────────────────────────────────────

  tick() {
    if (this.finished || this.phase !== 'building') return;

    const now = Date.now();
    if (this.lastTickAt === null) {
      this.lastTickAt = now;
      return;
    }
    const delta = (now - this.lastTickAt) / 1000;
    this.lastTickAt = now;

    this.timeLeft = Math.max(0, this.timeLeft - delta);

    if (this.timeLeft <= 0) {
      // Time expired on this shape — move on with zero score for it
      this._advanceStep(false);
    }
  }

  // ─── Input ─────────────────────────────────────────────────────────────────

  processInput(playerId, inputType, inputData) {
    if (this.finished || this.phase !== 'building') return;

    const pNum = this._playerNum(playerId);

    // Only Builder (P2) places shapes
    if (pNum !== 2 || inputType !== 'place') return;

    const { shape, colorHex } = inputData || {};
    const step = this._currentStep;
    if (!step) return;

    const shapeOk = shape === step.shape;
    const colorOk = colorHex === step.color.hex;

    if (shapeOk && colorOk) {
      this.correctPlacements += 1;
      this.lastResult = 'correct';

      // Time bonus: up to 100 pts, scaled by time remaining
      const timeBonus = Math.round((this.timeLeft / TIME_PER_SHAPE) * 100);
      this.totalScore += 100 + timeBonus;

      this.io.to(this.roomCode).emit('game:placementResult', {
        result: 'correct',
        step: this.currentIndex,
        score: 100 + timeBonus,
      });

      this._advanceStep(true);
    } else {
      this.wrongAttempts += 1;
      this.lastResult = 'wrong';
      // Small time penalty
      this.timeLeft = Math.max(0, this.timeLeft - 5);

      this.io.to(this.roomCode).emit('game:placementResult', {
        result: 'wrong',
        step: this.currentIndex,
        shapeOk,
        colorOk,
      });
    }
  }

  // ─── Step advancement ──────────────────────────────────────────────────────

  _advanceStep(completed) {
    this.currentIndex += 1;
    this.lastResult    = null;
    this.timeLeft      = TIME_PER_SHAPE;

    if (this.currentIndex >= BLUEPRINT_COUNT) {
      this._endGame();
    }
  }

  // ─── End ───────────────────────────────────────────────────────────────────

  _endGame() {
    this.finished = true;
    this.phase    = 'complete';

    const maxScore = BLUEPRINT_COUNT * 200;
    const pct      = this.totalScore / maxScore;

    let stars = 0;
    if (pct >= 0.8)       stars = 3;
    else if (pct >= 0.5)  stars = 2;
    else if (pct >= 0.2)  stars = 1;

    this.setWin(stars, this.totalScore, {
      correctPlacements: this.correctPlacements,
      wrongAttempts:     this.wrongAttempts,
      totalShapes:       BLUEPRINT_COUNT,
    });
  }

  // ─── State ─────────────────────────────────────────────────────────────────

  getState() {
    const step = this._currentStep;
    return {
      ...super.getState(),
      phase:            this.phase,
      currentIndex:     this.currentIndex,
      totalShapes:      BLUEPRINT_COUNT,
      timeLeft:         Math.round(this.timeLeft),
      shapeDuration:    TIME_PER_SHAPE,
      totalScore:       this.totalScore,
      correctPlacements: this.correctPlacements,
      wrongAttempts:    this.wrongAttempts,
      lastResult:       this.lastResult,

      // Reader (P1): see hex codes + shapes in blueprint spec
      readerBlueprint: this.blueprint.map((s, i) => ({
        index:   i,
        shape:   s.shape,
        // Reader sees the raw hex label, not the color name
        colorLabel: s.color.label,
        colorHex:   s.color.hex,
        done:    i < this.currentIndex,
        active:  i === this.currentIndex,
      })),

      // Builder (P2): available shapes and color swatches (hex values without labels)
      builderShapes: SHAPES,
      builderColors: COLORS.map(c => ({ hex: c.hex, name: c.name })),

      // Current step for builder — shape hint only (no color name)
      currentShape:     step ? step.shape : null,
    };
  }
}

module.exports = { BlueprintReaderEngine };
