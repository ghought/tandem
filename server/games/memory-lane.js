'use strict';

const BaseGameEngine = require('./BaseGameEngine');
const { GAME_IDS } = require('../../shared/constants');

// ─── Constants ────────────────────────────────────────────────────────────────

const SHOW_DURATION_S  = 3;    // seconds each object is shown
const NUM_OBJECTS      = 5;
const COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'teal'];
const EMOJIS = ['🍎', '🌟', '🎩', '🐸', '🌈', '🦋', '🍕', '🎸', '🌸', '🦁'];

const POSITIONS = [
  { label: 'top-left',     col: 0, row: 0 },
  { label: 'top-right',    col: 1, row: 0 },
  { label: 'middle-left',  col: 0, row: 1 },
  { label: 'middle-right', col: 1, row: 1 },
  { label: 'bottom-left',  col: 0, row: 2 },
  { label: 'bottom-right', col: 1, row: 2 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick(arr, n) {
  return shuffle(arr).slice(0, n);
}

function generateObjects() {
  const emojis  = pick(EMOJIS, NUM_OBJECTS);
  const colors  = pick(COLORS, NUM_OBJECTS);
  const posGrid = shuffle(POSITIONS).slice(0, NUM_OBJECTS);

  return emojis.map((emoji, i) => ({
    id:       i,
    emoji,
    color:    colors[i],
    position: posGrid[i],
  }));
}

function buildColorQuestions(objects) {
  // P1 (color) questions
  return objects.map(obj => {
    const wrong = shuffle(COLORS.filter(c => c !== obj.color)).slice(0, 3);
    const choices = shuffle([obj.color, ...wrong]);
    return {
      objectId:    obj.id,
      emoji:       obj.emoji,
      question:    `What color was the ${obj.emoji}?`,
      choices,
      correct:     obj.color,
    };
  });
}

function buildPositionQuestions(objects) {
  // P2 (position) questions
  return objects.map(obj => {
    const wrongPos = shuffle(POSITIONS.filter(p => p.label !== obj.position.label)).slice(0, 3);
    const choices  = shuffle([obj.position.label, ...wrongPos.map(p => p.label)]);
    return {
      objectId: obj.id,
      emoji:    obj.emoji,
      question: `Where was the ${obj.emoji}?`,
      choices,
      correct:  obj.position.label,
    };
  });
}

// ─── Engine ───────────────────────────────────────────────────────────────────

class MemoryLaneEngine extends BaseGameEngine {
  constructor(roomCode, config, io, room) {
    super(roomCode, { ...config, gameId: GAME_IDS.MEMORY_LANE }, io, room);
    this.tickRate = 5;

    this.objects          = generateObjects();
    this.phase            = 'show';       // 'show' | 'quiz' | 'complete'
    this.showIndex        = 0;            // which object is being shown
    this.showTimer        = 0;            // seconds on current object
    this.lastTickAt       = null;

    this.colorQs          = buildColorQuestions(this.objects);
    this.positionQs       = buildPositionQuestions(this.objects);

    this.quizIndex        = 0;            // current question index
    this.p1Answers        = [];           // { correct, chosen }
    this.p2Answers        = [];

    this.score            = 0;
    this.finished         = false;
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  _playerNum(playerId) {
    const players = this.room.players || [];
    const idx     = players.findIndex(p => p.id === playerId);
    return idx + 1;
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

    if (this.phase === 'show') {
      this.showTimer += delta;
      if (this.showTimer >= SHOW_DURATION_S) {
        this.showTimer = 0;
        this.showIndex++;
        if (this.showIndex >= NUM_OBJECTS) {
          // All shown — move to quiz
          this.phase     = 'quiz';
          this.quizIndex = 0;
          this.io.to(this.roomCode).emit('game:phaseChange', { phase: 'quiz' });
        }
      }
    }
  }

  // ─── Input ─────────────────────────────────────────────────────────────────

  processInput(playerId, inputType, inputData) {
    if (this.finished || this.phase !== 'quiz') return;
    if (inputType !== 'answer') return;

    const playerNum = this._playerNum(playerId);
    const { choice } = inputData || {};

    // P1 answers color question, P2 answers position question (same quizIndex)
    const colorQ    = this.colorQs[this.quizIndex];
    const posQ      = this.positionQs[this.quizIndex];

    if (!colorQ || !posQ) return;

    let bothAnswered = false;

    if (playerNum === 1) {
      if (this.p1Answers.length > this.quizIndex) return; // already answered
      const correct = choice === colorQ.correct;
      this.p1Answers.push({ correct, chosen: choice });
      if (correct) this.score += 100;
    } else if (playerNum === 2) {
      if (this.p2Answers.length > this.quizIndex) return;
      const correct = choice === posQ.correct;
      this.p2Answers.push({ correct, chosen: choice });
      if (correct) this.score += 100;
    }

    // Advance when both players have answered this round
    if (this.p1Answers.length > this.quizIndex && this.p2Answers.length > this.quizIndex) {
      const p1Correct = this.p1Answers[this.quizIndex].correct;
      const p2Correct = this.p2Answers[this.quizIndex].correct;

      this.io.to(this.roomCode).emit('game:questionResult', {
        quizIndex:  this.quizIndex,
        p1Correct,
        p2Correct,
        colorQ:     colorQ.question,
        posQ:       posQ.question,
        p1Choice:   this.p1Answers[this.quizIndex].chosen,
        p2Choice:   this.p2Answers[this.quizIndex].chosen,
        colorAnswer: colorQ.correct,
        posAnswer:   posQ.correct,
      });

      this.quizIndex++;
      if (this.quizIndex >= NUM_OBJECTS) {
        this._endGame();
      }
    }
  }

  // ─── End ───────────────────────────────────────────────────────────────────

  _endGame() {
    this.finished = true;
    this.phase    = 'complete';

    const maxScore = NUM_OBJECTS * 200;
    const pct      = this.score / maxScore;

    let stars = 0;
    if (pct >= 0.8)       stars = 3;
    else if (pct >= 0.5)  stars = 2;
    else if (pct >= 0.2)  stars = 1;

    this.setWin(stars, this.score, { totalQuestions: NUM_OBJECTS * 2 });
  }

  // ─── State ─────────────────────────────────────────────────────────────────

  getState() {
    const currentColorQ    = this.colorQs[this.quizIndex] || null;
    const currentPositionQ = this.positionQs[this.quizIndex] || null;

    return {
      ...super.getState(),
      phase:       this.phase,
      // Show phase
      objects:     this.objects,
      showIndex:   this.showIndex,
      showTimer:   Math.round(this.showTimer * 10) / 10,
      showDuration: SHOW_DURATION_S,
      // Quiz phase
      quizIndex:         this.quizIndex,
      totalQuestions:    NUM_OBJECTS,
      // P1 (color) current question
      colorQuestion:     currentColorQ ? {
        question: currentColorQ.question,
        choices:  currentColorQ.choices,
        emoji:    currentColorQ.emoji,
      } : null,
      // P2 (position) current question
      positionQuestion:  currentPositionQ ? {
        question: currentPositionQ.question,
        choices:  currentPositionQ.choices,
        emoji:    currentPositionQ.emoji,
      } : null,
      p1AnswerCount: this.p1Answers.length,
      p2AnswerCount: this.p2Answers.length,
      score:      this.score,
    };
  }
}

module.exports = { MemoryLaneEngine };
