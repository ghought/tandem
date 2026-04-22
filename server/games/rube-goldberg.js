'use strict';

const BaseGameEngine = require('./BaseGameEngine');
const { GAME_IDS } = require('../../shared/constants');

// ─── Grid config ─────────────────────────────────────────────────────────────

const ROWS = 8;
const COLS = 12;

// Column ownership
// P1: cols 0–3 (left zone)
// P2: cols 8–11 (right zone)
// Shared: cols 4–7 (alternating turns)
const P1_COLS   = [0, 1, 2, 3];
const P2_COLS   = [8, 9, 10, 11];
const MID_COLS  = [4, 5, 6, 7];

// Component types
const COMPONENTS = {
  RAMP_RIGHT:   'ramp_right',   // Ball deflects downward-right
  RAMP_LEFT:    'ramp_left',    // Ball deflects downward-left
  LAUNCHER:     'launcher',     // Ball source (P1 only)
  COLLECTOR:    'collector',    // Goal (P2 only)
  REDIRECT_UP:  'redirect_up',  // Bounces ball upward
  REDIRECT_DOWN: 'redirect_down',
};

// P1 palette vs P2 palette
const P1_COMPONENTS = [COMPONENTS.LAUNCHER, COMPONENTS.RAMP_RIGHT, COMPONENTS.RAMP_LEFT, COMPONENTS.REDIRECT_UP];
const P2_COMPONENTS = [COMPONENTS.COLLECTOR, COMPONENTS.RAMP_RIGHT, COMPONENTS.RAMP_LEFT, COMPONENTS.REDIRECT_DOWN];

const BUILD_TIME_S  = 90;   // time to place components
const SIMULATE_MS   = 3000; // wait before simulation

// ─── Simulation ───────────────────────────────────────────────────────────────

/**
 * Simulate ball path on the grid.
 * Returns { reached: bool, path: [{row, col}] }
 */
function simulate(grid, launcherPos, collectorPos) {
  if (!launcherPos || !collectorPos) return { reached: false, path: [] };

  let { row, col } = launcherPos;
  let dr = 1;  // direction: +1 down, -1 up
  let dc = 1;  // direction: +1 right, -1 left
  const path = [{ row, col }];
  const visited = new Set();

  for (let step = 0; step < ROWS * COLS * 2; step++) {
    const key = `${row},${col},${dr},${dc}`;
    if (visited.has(key)) break; // cycle detected
    visited.add(key);

    const nextRow = row + dr;
    const nextCol = col + dc;

    // Out of bounds?
    if (nextRow < 0 || nextRow >= ROWS || nextCol < 0 || nextCol >= COLS) break;

    row = nextRow;
    col = nextCol;
    path.push({ row, col });

    // Reached collector?
    if (row === collectorPos.row && col === collectorPos.col) {
      return { reached: true, path };
    }

    // Apply component effects
    const cell = grid[row]?.[col];
    if (cell) {
      switch (cell) {
        case COMPONENTS.RAMP_RIGHT:
          dc = 1; dr = 1; break;
        case COMPONENTS.RAMP_LEFT:
          dc = -1; dr = 1; break;
        case COMPONENTS.REDIRECT_UP:
          dr = -1; break;
        case COMPONENTS.REDIRECT_DOWN:
          dr = 1; break;
        default:
          break;
      }
    }
  }

  return { reached: false, path };
}

// ─── Engine ───────────────────────────────────────────────────────────────────

class RubeGoldbergEngine extends BaseGameEngine {
  constructor(roomCode, config, io, room) {
    super(roomCode, { ...config, gameId: GAME_IDS.RUBE_GOLDBERG }, io, room);
    this.tickRate = 5;

    // grid[row][col] = component type or null
    this.grid           = Array.from({ length: ROWS }, () => new Array(COLS).fill(null));
    this.phase          = 'building';  // 'building' | 'simulating' | 'won' | 'failed'
    this.timeLeft       = BUILD_TIME_S;
    this.lastTickAt     = null;
    this.finished       = false;
    this.readyFlags     = { 1: false, 2: false };  // both must click "Test It!"
    this.sharedTurn     = 1;  // whose turn in the shared zone: 1 or 2
    this.simulationPath = null;
    this.simulationResult = null;

    // Pre-place launcher and collector at fixed positions
    this.launcherPos  = { row: 2, col: 0 };
    this.collectorPos = { row: 5, col: 11 };
    this.grid[this.launcherPos.row][this.launcherPos.col]   = COMPONENTS.LAUNCHER;
    this.grid[this.collectorPos.row][this.collectorPos.col] = COMPONENTS.COLLECTOR;
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  _playerNum(playerId) {
    const idx = (this.room.players || []).findIndex(p => p.id === playerId);
    return idx + 1;
  }

  _canPlace(pNum, row, col) {
    if (pNum === 1) return P1_COLS.includes(col) || (MID_COLS.includes(col) && this.sharedTurn === 1);
    if (pNum === 2) return P2_COLS.includes(col) || (MID_COLS.includes(col) && this.sharedTurn === 2);
    return false;
  }

  // ─── Tick ──────────────────────────────────────────────────────────────────

  tick() {
    if (this.finished) return;

    const now = Date.now();
    if (this.lastTickAt === null) {
      this.lastTickAt = now;
      return;
    }
    const delta = (now - this.lastTickAt) / 1000;
    this.lastTickAt = now;

    if (this.phase === 'building') {
      this.timeLeft = Math.max(0, this.timeLeft - delta);

      if (this.timeLeft <= 0) {
        // Auto-simulate when time runs out
        this._beginSimulation();
      }
    }
  }

  // ─── Input ─────────────────────────────────────────────────────────────────

  processInput(playerId, inputType, inputData) {
    if (this.finished) return;

    const pNum = this._playerNum(playerId);

    if (inputType === 'place' && this.phase === 'building') {
      const { row, col, component } = inputData || {};
      if (row == null || col == null || !component) return;

      // Validate zone
      if (!this._canPlace(pNum, row, col)) return;

      // Cannot overwrite launcher or collector
      const existing = this.grid[row]?.[col];
      if (existing === COMPONENTS.LAUNCHER || existing === COMPONENTS.COLLECTOR) return;

      // Validate component belongs to player
      const allowed = pNum === 1 ? P1_COMPONENTS : P2_COMPONENTS;
      if (!allowed.includes(component)) return;

      this.grid[row][col] = component;

      // If placed in shared zone, flip turn
      if (MID_COLS.includes(col)) {
        this.sharedTurn = this.sharedTurn === 1 ? 2 : 1;
      }

      this.io.to(this.roomCode).emit('game:placed', { player: pNum, row, col, component });
    }

    if (inputType === 'remove' && this.phase === 'building') {
      const { row, col } = inputData || {};
      if (row == null || col == null) return;
      if (!this._canPlace(pNum, row, col)) return;
      const cell = this.grid[row]?.[col];
      if (cell === COMPONENTS.LAUNCHER || cell === COMPONENTS.COLLECTOR) return;
      this.grid[row][col] = null;
    }

    if (inputType === 'ready' && this.phase === 'building') {
      this.readyFlags[pNum] = true;
      this.io.to(this.roomCode).emit('game:readyFlag', { player: pNum });

      if (this.readyFlags[1] && this.readyFlags[2]) {
        this._beginSimulation();
      }
    }
  }

  // ─── Simulation ────────────────────────────────────────────────────────────

  _beginSimulation() {
    if (this.phase !== 'building') return;
    this.phase = 'simulating';
    this.io.to(this.roomCode).emit('game:simulating', {});

    // Run simulation after a short delay (drama!)
    setTimeout(() => {
      const result = simulate(this.grid, this.launcherPos, this.collectorPos);
      this.simulationPath   = result.path;
      this.simulationResult = result.reached;

      this.io.to(this.roomCode).emit('game:simulationResult', {
        reached: result.reached,
        path:    result.path,
      });

      setTimeout(() => {
        this._endGame(result.reached);
      }, SIMULATE_MS);
    }, 500);
  }

  // ─── End ───────────────────────────────────────────────────────────────────

  _endGame(won) {
    this.finished = true;
    this.phase    = won ? 'won' : 'failed';

    // Count placed components (excluding launcher/collector)
    let placed = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = this.grid[r][c];
        if (cell && cell !== COMPONENTS.LAUNCHER && cell !== COMPONENTS.COLLECTOR) {
          placed += 1;
        }
      }
    }

    // Score based on efficiency: fewer pieces = better
    const timeBonus  = Math.round(this.timeLeft);
    const efficiency = won ? Math.max(0, 100 - placed * 5) : 0;
    const score      = won ? efficiency + timeBonus : 0;

    let stars = 0;
    if (won) {
      if (placed <= 6)        stars = 3;
      else if (placed <= 10)  stars = 2;
      else                    stars = 1;
    }

    this.setWin(stars, score, {
      reached:   won,
      placed,
      pathLength: this.simulationPath ? this.simulationPath.length : 0,
    });
  }

  // ─── State ─────────────────────────────────────────────────────────────────

  getState() {
    return {
      ...super.getState(),
      phase:           this.phase,
      grid:            this.grid,
      rows:            ROWS,
      cols:            COLS,
      p1Cols:          P1_COLS,
      p2Cols:          P2_COLS,
      midCols:         MID_COLS,
      p1Components:    P1_COMPONENTS,
      p2Components:    P2_COMPONENTS,
      sharedTurn:      this.sharedTurn,
      readyFlags:      { ...this.readyFlags },
      timeLeft:        Math.round(this.timeLeft),
      duration:        BUILD_TIME_S,
      launcherPos:     this.launcherPos,
      collectorPos:    this.collectorPos,
      simulationPath:  this.simulationPath,
      simulationResult: this.simulationResult,
    };
  }
}

module.exports = { RubeGoldbergEngine };
