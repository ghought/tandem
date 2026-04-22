'use strict';

const BaseGameEngine = require('./BaseGameEngine');
const { GAME_IDS } = require('../../shared/constants');

// ─── Cell constants ───────────────────────────────────────────────────────────

const CELL_OPEN = 0;
const CELL_WALL = 1;
const CELL_HOLE = 2;
const CELL_EXIT = 3;

// ─── Level definitions ────────────────────────────────────────────────────────
// Grid: row-major, each row is an array of cell values.
// Marble starts at `start`, exit at the CELL_EXIT cell position.

const LEVELS = [
  {
    // Level 1 – Introduction (10×10)
    id: 1,
    cellSize: 40,
    cols: 10,
    rows: 10,
    start: { x: 60, y: 60 },  // pixel coords of marble centre
    grid: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
      [1, 0, 1, 0, 1, 0, 1, 1, 0, 1],
      [1, 0, 1, 0, 0, 0, 0, 1, 0, 1],
      [1, 0, 1, 1, 1, 1, 0, 1, 0, 1],
      [1, 0, 0, 0, 0, 1, 0, 0, 0, 1],
      [1, 1, 1, 0, 1, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 2, 0, 1],
      [1, 0, 1, 1, 1, 1, 1, 1, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 3, 1],
    ],
    timeLimit: 90,
    lives: 3,
  },
  {
    // Level 2 – Intermediate (12×12)
    id: 2,
    cellSize: 40,
    cols: 12,
    rows: 12,
    start: { x: 60, y: 60 },
    grid: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
      [1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1],
      [1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1],
      [1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1],
      [1, 0, 0, 0, 1, 2, 0, 1, 0, 0, 0, 1],
      [1, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1],
      [1, 0, 1, 1, 1, 0, 0, 0, 1, 1, 0, 1],
      [1, 0, 0, 0, 1, 0, 1, 0, 0, 2, 0, 1],
      [1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 3, 1],
    ],
    timeLimit: 120,
    lives: 3,
  },
  {
    // Level 3 – Hard (14×14)
    id: 3,
    cellSize: 36,
    cols: 14,
    rows: 14,
    start: { x: 54, y: 54 },
    grid: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1],
      [1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1],
      [1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1],
      [1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1],
      [1, 0, 0, 0, 2, 1, 0, 0, 0, 1, 0, 0, 0, 1],
      [1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1],
      [1, 0, 0, 0, 1, 0, 2, 0, 0, 1, 0, 0, 0, 1],
      [1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
      [1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 3, 1],
    ],
    timeLimit: 150,
    lives: 2,
  },
];

// ─── Physics helpers ──────────────────────────────────────────────────────────

const MARBLE_RADIUS = 12;
const FRICTION      = 0.92;
const MAX_SPEED     = 12;        // px per tick
const FORCE_SCALE   = 1.5;       // multiplier on incoming force

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/** AABB (axis-aligned) vs circle collision check and resolution. */
function resolveWallCollision(marble, cellX, cellY, cellSize) {
  const rectLeft   = cellX * cellSize;
  const rectTop    = cellY * cellSize;
  const rectRight  = rectLeft + cellSize;
  const rectBottom = rectTop  + cellSize;

  // Nearest point on rect to marble centre
  const nearestX = clamp(marble.x, rectLeft, rectRight);
  const nearestY = clamp(marble.y, rectTop,  rectBottom);

  const dx = marble.x - nearestX;
  const dy = marble.y - nearestY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < MARBLE_RADIUS && dist > 0) {
    // Push marble out
    const overlap = MARBLE_RADIUS - dist;
    marble.x += (dx / dist) * overlap;
    marble.y += (dy / dist) * overlap;

    // Reflect velocity
    if (Math.abs(dx) > Math.abs(dy)) {
      marble.vx *= -0.5;
    } else {
      marble.vy *= -0.5;
    }
    return true;
  }
  return false;
}

// ─── Engine ───────────────────────────────────────────────────────────────────

class LabyrinthEngine extends BaseGameEngine {
  constructor(roomCode, config, io, room) {
    super(roomCode, { ...config, gameId: GAME_IDS.LABYRINTH }, io, room);
    this.tickRate = 30;

    // Resolve level
    const levelIndex = clamp((config.level || 1) - 1, 0, LEVELS.length - 1);
    this.level       = LEVELS[levelIndex];

    this.marble = {
      x:  this.level.start.x,
      y:  this.level.start.y,
      vx: 0,
      vy: 0,
    };

    this.lives       = this.level.lives;
    this.forceX      = 0;   // set by player1
    this.forceY      = 0;   // set by player2
    this.finished    = false;
    this.failed      = false;

    // Track which players are connected
    this.player1Connected = false;
    this.player2Connected = false;
  }

  // ─── Input ─────────────────────────────────────────────────────────────────

  processInput(playerId, inputType, inputData) {
    if (this.finished || this.failed) return;

    const players = this.room.players || [];
    const playerIndex = players.findIndex(p => p.id === playerId);

    if (inputType === 'connected') {
      if (playerIndex === 0) this.player1Connected = true;
      if (playerIndex === 1) this.player2Connected = true;
      return;
    }

    if (inputType === 'force') {
      const force = clamp(inputData.force || 0, -1, 1) * FORCE_SCALE;

      // Player 1 → X axis, Player 2 → Y axis
      if (playerIndex === 0 || inputData.axis === 'x') {
        this.forceX = force;
      } else {
        this.forceY = force;
      }
    }
  }

  // ─── Tick ──────────────────────────────────────────────────────────────────

  tick() {
    if (this.finished || this.failed) return;

    const { marble, level } = this;
    const { cellSize, cols, rows, grid } = level;

    // Apply force
    marble.vx += this.forceX;
    marble.vy += this.forceY;

    // Apply friction
    marble.vx *= FRICTION;
    marble.vy *= FRICTION;

    // Clamp speed
    const speed = Math.sqrt(marble.vx ** 2 + marble.vy ** 2);
    if (speed > MAX_SPEED) {
      marble.vx = (marble.vx / speed) * MAX_SPEED;
      marble.vy = (marble.vy / speed) * MAX_SPEED;
    }

    // Move
    marble.x += marble.vx;
    marble.y += marble.vy;

    // Border clamp
    marble.x = clamp(marble.x, MARBLE_RADIUS, cols * cellSize - MARBLE_RADIUS);
    marble.y = clamp(marble.y, MARBLE_RADIUS, rows * cellSize - MARBLE_RADIUS);

    // Cell-based collision
    const minCellX = Math.max(0, Math.floor((marble.x - MARBLE_RADIUS) / cellSize));
    const maxCellX = Math.min(cols - 1, Math.floor((marble.x + MARBLE_RADIUS) / cellSize));
    const minCellY = Math.max(0, Math.floor((marble.y - MARBLE_RADIUS) / cellSize));
    const maxCellY = Math.min(rows - 1, Math.floor((marble.y + MARBLE_RADIUS) / cellSize));

    for (let row = minCellY; row <= maxCellY; row++) {
      for (let col = minCellX; col <= maxCellX; col++) {
        const cell = grid[row][col];

        if (cell === CELL_WALL) {
          resolveWallCollision(marble, col, row, cellSize);
        } else if (cell === CELL_HOLE) {
          // Check if marble centre is near hole centre
          const holeCX = col * cellSize + cellSize / 2;
          const holeCY = row * cellSize + cellSize / 2;
          const dx = marble.x - holeCX;
          const dy = marble.y - holeCY;
          if (Math.sqrt(dx * dx + dy * dy) < MARBLE_RADIUS) {
            this._handleHole();
            return;
          }
        } else if (cell === CELL_EXIT) {
          const exitCX = col * cellSize + cellSize / 2;
          const exitCY = row * cellSize + cellSize / 2;
          const dx = marble.x - exitCX;
          const dy = marble.y - exitCY;
          if (Math.sqrt(dx * dx + dy * dy) < MARBLE_RADIUS + 5) {
            this._handleExit();
            return;
          }
        }
      }
    }
  }

  // ─── Events ────────────────────────────────────────────────────────────────

  _handleHole() {
    this.lives -= 1;
    this.io.to(this.roomCode).emit('game:fell', { lives: this.lives });

    if (this.lives <= 0) {
      this.failed = true;
      this.setLoss('no_lives');
    } else {
      // Reset marble to start
      this.marble.x  = this.level.start.x;
      this.marble.y  = this.level.start.y;
      this.marble.vx = 0;
      this.marble.vy = 0;
    }
  }

  _handleExit() {
    this.finished = true;
    const timeElapsed = this.elapsedSeconds;
    const { timeLimit } = this.level;

    // Stars: 3 = under 40% time, 2 = under 70%, 1 = completed
    let stars = 1;
    if (timeElapsed < timeLimit * 0.4) stars = 3;
    else if (timeElapsed < timeLimit * 0.7) stars = 2;

    const score = Math.round(
      (this.lives * 1000) + Math.max(0, (timeLimit - timeElapsed) * 10)
    );

    this.setWin(stars, score, { timeElapsed: Math.round(timeElapsed), livesLeft: this.lives });
  }

  // ─── State ─────────────────────────────────────────────────────────────────

  getState() {
    return {
      ...super.getState(),
      marble: {
        x:  Math.round(this.marble.x * 10) / 10,
        y:  Math.round(this.marble.y * 10) / 10,
        vx: Math.round(this.marble.vx * 100) / 100,
        vy: Math.round(this.marble.vy * 100) / 100,
      },
      level:            this.level.id,
      lives:            this.lives,
      player1Connected: this.player1Connected,
      player2Connected: this.player2Connected,
    };
  }
}

module.exports = { LabyrinthEngine, LEVELS };
