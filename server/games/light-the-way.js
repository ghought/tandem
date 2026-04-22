'use strict';

const BaseGameEngine = require('./BaseGameEngine');
const { GAME_IDS } = require('../../shared/constants');

// ─── Constants ────────────────────────────────────────────────────────────────

const GRID_SIZE   = 8;
const GAME_TIME_S = 120;
const HAZARD_PENALTY = 10;  // seconds lost on hazard hit
const MAX_HAZARD_HITS = 3;

// Pre-defined maps: each has a path array and hazard positions
// path: series of [col, row] that form the safe route from start to exit
function buildMap() {
  // 8x8 grid, start at [0,7] (bottom-left), exit at [7,0] (top-right)
  const safePath = [
    [0,7],[1,7],[2,7],[2,6],[2,5],[3,5],[4,5],[4,4],
    [4,3],[5,3],[5,2],[5,1],[6,1],[7,1],[7,0],
  ];
  const safeSet = new Set(safePath.map(([c,r]) => `${c},${r}`));

  // All other cells are potential hazards
  const hazards = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (!safeSet.has(`${c},${r}`)) {
        hazards.push([c, r]);
      }
    }
  }

  return { safePath, hazards, start: [0, 7], exit: [7, 0] };
}

const MAP = buildMap();

// ─── Engine ───────────────────────────────────────────────────────────────────

class LightTheWayEngine extends BaseGameEngine {
  constructor(roomCode, config, io, room) {
    super(roomCode, { ...config, gameId: GAME_IDS.LIGHT_THE_WAY }, io, room);
    this.tickRate = 10;

    this.finished    = false;
    this.lastTickAt  = null;
    this.timeLeft    = GAME_TIME_S;

    this.playerPos   = [...MAP.start];  // [col, row]
    this.hazardHits  = 0;
    this.steps       = 0;
    this.phase       = 'playing';  // 'playing' | 'done'
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  _playerNum(playerId) {
    const idx = (this.room.players || []).findIndex(p => p.id === playerId);
    return idx + 1;
  }

  _isHazard(col, row) {
    return MAP.hazards.some(([c, r]) => c === col && r === row);
  }

  _isExit(col, row) {
    const [ec, er] = MAP.exit;
    return col === ec && row === er;
  }

  /** P1's visible cells: only position + 1-cell radius revealed */
  _p1Visible() {
    const [pc, pr] = this.playerPos;
    const visible = [];
    for (let dc = -1; dc <= 1; dc++) {
      for (let dr = -1; dr <= 1; dr++) {
        const c = pc + dc;
        const r = pr + dr;
        if (c >= 0 && c < GRID_SIZE && r >= 0 && r < GRID_SIZE) {
          visible.push([c, r]);
        }
      }
    }
    return visible;
  }

  // ─── Tick ──────────────────────────────────────────────────────────────────

  tick() {
    if (this.finished) return;

    const now = Date.now();
    if (this.lastTickAt === null) { this.lastTickAt = now; return; }
    const delta = (now - this.lastTickAt) / 1000;
    this.lastTickAt = now;

    if (this.phase === 'playing') {
      this.timeLeft = Math.max(0, this.timeLeft - delta);
      if (this.timeLeft <= 0) {
        this.setLoss('timeout');
        this.finished = true;
      }
    }
  }

  // ─── Input ─────────────────────────────────────────────────────────────────

  processInput(playerId, inputType, inputData) {
    if (this.finished || this.phase !== 'playing') return;

    const playerNum = this._playerNum(playerId);
    const type      = inputType || (inputData && inputData.type);

    // P2 (navigator) sends move direction commands
    if (type === 'move' && playerNum === 2) {
      const dir = inputData && inputData.direction;
      let [nc, nr] = this.playerPos;

      if (dir === 'up')    nr--;
      else if (dir === 'down')  nr++;
      else if (dir === 'left')  nc--;
      else if (dir === 'right') nc++;
      else return;

      // Bounds check
      if (nc < 0 || nc >= GRID_SIZE || nr < 0 || nr >= GRID_SIZE) return;

      this.playerPos = [nc, nr];
      this.steps++;

      const hitHazard = this._isHazard(nc, nr);
      if (hitHazard) {
        this.hazardHits++;
        this.timeLeft = Math.max(0, this.timeLeft - HAZARD_PENALTY);
        this.io.to(this.roomCode).emit('game:hazardHit', {
          pos: this.playerPos, hits: this.hazardHits, timeLeft: Math.round(this.timeLeft),
        });
        if (this.hazardHits >= MAX_HAZARD_HITS) {
          this.finished = true;
          this.setLoss('toomany_hazards');
          return;
        }
      }

      if (this._isExit(nc, nr)) {
        this.finished = true;
        this.phase = 'done';
        this._endGame();
        return;
      }

      this.io.to(this.roomCode).emit('game:playerMoved', {
        pos: this.playerPos, dir, hitHazard,
      });
    }
  }

  // ─── End ───────────────────────────────────────────────────────────────────

  _endGame() {
    const timeBonus = Math.round(this.timeLeft);
    const hazardPenalty = this.hazardHits * 50;
    const score = Math.max(0, 500 + timeBonus * 5 - hazardPenalty);

    let stars = 0;
    if (this.hazardHits === 0) stars = 3;
    else if (this.hazardHits <= 1) stars = 2;
    else stars = 1;

    this.setWin(stars, score, {
      steps: this.steps, hazardHits: this.hazardHits, timeLeft: Math.round(this.timeLeft),
    });
  }

  // ─── State ─────────────────────────────────────────────────────────────────

  getState() {
    return {
      ...super.getState(),
      phase:       this.phase,
      timeLeft:    Math.round(this.timeLeft),
      duration:    GAME_TIME_S,
      playerPos:   this.playerPos,
      gridSize:    GRID_SIZE,
      hazardHits:  this.hazardHits,
      maxHazards:  MAX_HAZARD_HITS,
      steps:       this.steps,
      exit:        MAP.exit,
      // P2 sees full map (safe path + hazards)
      safePath:    MAP.safePath,
      hazards:     MAP.hazards,
      // P1 sees only their neighborhood
      p1Visible:   this._p1Visible(),
    };
  }
}

module.exports = { LightTheWayEngine };
