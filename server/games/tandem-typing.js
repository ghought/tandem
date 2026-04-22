'use strict';

const BaseGameEngine = require('./BaseGameEngine');
const { GAME_IDS } = require('../../shared/constants');

// ─── Word list ────────────────────────────────────────────────────────────────

const WORD_LIST = [
  'TANDEM', 'CRAFT', 'BLOOM', 'BRIDGE', 'SPARK',
  'GROVE', 'PILOT', 'ECHO', 'DRIFT', 'LIGHT',
  'STONE', 'FLINT', 'PETAL', 'CRANE', 'ORBIT',
  'PRISM', 'FORGE', 'HAVEN', 'QUEST', 'LUNAR',
];

const TOTAL_WORDS  = 10;
const TIME_LIMIT_S = 90;

function pickWords(count) {
  const shuffled = [...WORD_LIST].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// ─── Engine ───────────────────────────────────────────────────────────────────

class TandemTypingEngine extends BaseGameEngine {
  constructor(roomCode, config, io, room) {
    super(roomCode, { ...config, gameId: GAME_IDS.TANDEM_TYPING }, io, room);
    this.tickRate = 10;

    this.words         = pickWords(TOTAL_WORDS);
    this.wordIndex     = 0;          // which word we're on
    this.letterIndex   = 0;          // which letter within current word
    this.typed         = '';         // letters typed so far in current word
    this.wordsComplete = 0;
    this.totalScore    = 0;
    this.timeLeft      = TIME_LIMIT_S;
    this.lastTickAt    = null;
    this.finished      = false;
    this.phase         = 'typing';   // 'typing' | 'complete' | 'timeout'
    this.lastKey       = null;       // {letter, correct, player} — for client flash
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  _playerNum(playerId) {
    const idx = (this.room.players || []).findIndex(p => p.id === playerId);
    return idx + 1;
  }

  get _currentWord() {
    return this.words[this.wordIndex] || '';
  }

  /**
   * Who should type next?
   * P1 types odd-indexed letters (0, 2, 4…), P2 types even-indexed (1, 3, 5…).
   * 0-indexed: P1 = letterIndex % 2 === 0, P2 = letterIndex % 2 === 1
   */
  get _expectedPlayer() {
    return this.letterIndex % 2 === 0 ? 1 : 2;
  }

  get _expectedLetter() {
    return this._currentWord[this.letterIndex] || null;
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

    this.timeLeft = Math.max(0, this.timeLeft - delta);

    if (this.timeLeft <= 0) {
      this._endGame('timeout');
    }
  }

  // ─── Input ─────────────────────────────────────────────────────────────────

  processInput(playerId, inputType, inputData) {
    if (this.finished || this.phase !== 'typing') return;
    if (inputType !== 'key') return;

    const pNum   = this._playerNum(playerId);
    const letter = (inputData && inputData.letter || '').toUpperCase();

    if (!letter) return;

    const expected   = this._expectedLetter;
    const expectPNum = this._expectedPlayer;
    const correct    = pNum === expectPNum && letter === expected;

    this.lastKey = { letter, correct, player: pNum };

    if (correct) {
      this.typed       += letter;
      this.letterIndex += 1;

      this.io.to(this.roomCode).emit('game:keyResult', {
        letter, correct: true, player: pNum,
        typed: this.typed,
        wordIndex: this.wordIndex,
      });

      // Word complete?
      if (this.letterIndex >= this._currentWord.length) {
        const timeBonus = Math.round(this.timeLeft);
        this.totalScore += 100 + timeBonus;
        this.wordsComplete += 1;

        this.io.to(this.roomCode).emit('game:wordComplete', {
          word:     this._currentWord,
          score:    100 + timeBonus,
          total:    this.wordsComplete,
        });

        this.wordIndex   += 1;
        this.letterIndex  = 0;
        this.typed        = '';

        if (this.wordIndex >= TOTAL_WORDS) {
          this._endGame('complete');
        }
      }
    } else {
      // Wrong key — no penalty except the feedback
      this.io.to(this.roomCode).emit('game:keyResult', {
        letter, correct: false, player: pNum,
        typed: this.typed,
        wordIndex: this.wordIndex,
      });
    }
  }

  // ─── End ───────────────────────────────────────────────────────────────────

  _endGame(reason) {
    this.finished = true;
    this.phase    = reason === 'complete' ? 'complete' : 'timeout';

    const maxScore = TOTAL_WORDS * (100 + TIME_LIMIT_S);
    const pct      = this.totalScore / maxScore;

    let stars = 0;
    if (this.wordsComplete >= TOTAL_WORDS && pct >= 0.6) stars = 3;
    else if (this.wordsComplete >= TOTAL_WORDS * 0.8)     stars = 2;
    else if (this.wordsComplete >= TOTAL_WORDS * 0.5)     stars = 1;

    this.setWin(stars, this.totalScore, {
      wordsComplete: this.wordsComplete,
      totalWords:    TOTAL_WORDS,
      reason,
    });
  }

  // ─── State ─────────────────────────────────────────────────────────────────

  getState() {
    const word = this._currentWord;
    return {
      ...super.getState(),
      phase:          this.phase,
      words:          this.words,
      wordIndex:      this.wordIndex,
      totalWords:     TOTAL_WORDS,
      currentWord:    word,
      typed:          this.typed,
      letterIndex:    this.letterIndex,
      expectedPlayer: this._expectedPlayer,
      expectedLetter: this._expectedLetter,
      wordsComplete:  this.wordsComplete,
      totalScore:     this.totalScore,
      timeLeft:       Math.round(this.timeLeft),
      duration:       TIME_LIMIT_S,
      lastKey:        this.lastKey,
    };
  }
}

module.exports = { TandemTypingEngine };
