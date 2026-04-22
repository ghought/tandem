'use strict';

const BaseGameEngine = require('./BaseGameEngine');
const { GAME_IDS } = require('../../shared/constants');

// ─── Constants ────────────────────────────────────────────────────────────────

const NUM_DICE    = 5;
const NUM_ROUNDS  = 5;
const TARGET_MIN  = 8;
const TARGET_MAX  = 22;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rollDie() {
  return Math.floor(Math.random() * 6) + 1;
}

function rollAll() {
  return Array.from({ length: NUM_DICE }, rollDie);
}

function randomTarget() {
  return TARGET_MIN + Math.floor(Math.random() * (TARGET_MAX - TARGET_MIN + 1));
}

// ─── Engine ───────────────────────────────────────────────────────────────────

class DiceRollEngine extends BaseGameEngine {
  constructor(roomCode, config, io, room) {
    super(roomCode, { ...config, gameId: GAME_IDS.DICE_ROLL }, io, room);
    this.tickRate = 5;

    this.round       = 1;         // 1..NUM_ROUNDS
    this.dice        = rollAll(); // current dice values [1..6] × NUM_DICE
    this.held        = new Array(NUM_DICE).fill(false); // P1 marks dice to hold
    this.target      = randomTarget();
    this.score       = 0;
    this.phase       = 'rolling'; // 'rolling' | 'complete'
    this.roundWon    = false;

    this.finished    = false;
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  _playerNum(playerId) {
    const players = this.room.players || [];
    const idx     = players.findIndex(p => p.id === playerId);
    return idx + 1;
  }

  get currentSum() {
    return this.dice.reduce((a, v) => a + v, 0);
  }

  // ─── Tick ──────────────────────────────────────────────────────────────────

  tick() {
    // Mostly event-driven; tick just monitors state
    if (this.finished) return;
  }

  // ─── Input ─────────────────────────────────────────────────────────────────

  processInput(playerId, inputType, inputData) {
    if (this.finished || this.phase !== 'rolling') return;

    const playerNum = this._playerNum(playerId);

    // P1: toggle hold on a specific die
    if (inputType === 'hold' && playerNum === 1) {
      const idx = inputData.dieIndex;
      if (idx >= 0 && idx < NUM_DICE) {
        this.held[idx] = !this.held[idx];
        this.io.to(this.roomCode).emit('game:diceHeld', {
          dieIndex: idx,
          held: this.held[idx],
          heldState: [...this.held],
        });
      }
      return;
    }

    // P2: re-roll dice that are NOT held
    if (inputType === 'reroll' && playerNum === 2) {
      for (let i = 0; i < NUM_DICE; i++) {
        if (!this.held[i]) {
          this.dice[i] = rollDie();
        }
      }
      this.io.to(this.roomCode).emit('game:diceRolled', {
        dice:   [...this.dice],
        sum:    this.currentSum,
        target: this.target,
      });
      return;
    }

    // P2: submit / lock in current dice as the answer
    if (inputType === 'submit' && playerNum === 2) {
      this._evaluateRound();
      return;
    }
  }

  // ─── Round evaluation ──────────────────────────────────────────────────────

  _evaluateRound() {
    const sum = this.currentSum;
    const won = sum === this.target;

    if (won) {
      this.score += 200 + this.round * 20;
    }

    this.io.to(this.roomCode).emit('game:roundResult', {
      round:  this.round,
      sum,
      target: this.target,
      won,
      score:  this.score,
    });

    if (this.round >= NUM_ROUNDS) {
      this._endGame();
    } else {
      // Advance to next round
      this.round++;
      this.dice   = rollAll();
      this.held   = new Array(NUM_DICE).fill(false);
      this.target = randomTarget();
    }
  }

  // ─── End ───────────────────────────────────────────────────────────────────

  _endGame() {
    this.finished = true;
    this.phase    = 'complete';

    const maxScore = NUM_ROUNDS * (200 + NUM_ROUNDS * 20);
    const pct      = this.score / maxScore;

    let stars = 0;
    if (pct >= 0.8)       stars = 3;
    else if (pct >= 0.5)  stars = 2;
    else if (pct >= 0.2)  stars = 1;

    this.setWin(stars, this.score, { rounds: NUM_ROUNDS });
  }

  // ─── State ─────────────────────────────────────────────────────────────────

  getState() {
    return {
      ...super.getState(),
      phase:    this.phase,
      round:    this.round,
      rounds:   NUM_ROUNDS,
      dice:     [...this.dice],
      held:     [...this.held],
      target:   this.target,
      sum:      this.currentSum,
      score:    this.score,
      numDice:  NUM_DICE,
    };
  }
}

module.exports = { DiceRollEngine };
