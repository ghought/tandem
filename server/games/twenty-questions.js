'use strict';

const BaseGameEngine = require('./BaseGameEngine');
const { GAME_IDS } = require('../../shared/constants');

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_QUESTIONS = 20;

const SECRET_WORDS = [
  'elephant', 'piano', 'cloud', 'bicycle', 'lighthouse',
  'umbrella', 'sunflower', 'telescope', 'candle', 'submarine',
  'typewriter', 'compass', 'lantern', 'kite', 'magnifying glass',
];

// Preset yes/no questions P2 can ask (grouped)
const PRESET_QUESTIONS = [
  { id: 'alive',      text: 'Is it alive?' },
  { id: 'animal',     text: 'Is it an animal?' },
  { id: 'plant',      text: 'Is it a plant?' },
  { id: 'manmade',    text: 'Is it man-made?' },
  { id: 'bigger_car', text: 'Is it bigger than a car?' },
  { id: 'fits_hand',  text: 'Can it fit in your hand?' },
  { id: 'indoor',     text: 'Is it usually found indoors?' },
  { id: 'outdoor',    text: 'Is it usually found outdoors?' },
  { id: 'food',       text: 'Is it a food or drink?' },
  { id: 'technology', text: 'Is it a type of technology?' },
  { id: 'tool',       text: 'Is it a tool?' },
  { id: 'cloth_worn', text: 'Is it worn or clothing?' },
  { id: 'makes_sound',text: 'Does it make a sound?' },
  { id: 'has_legs',   text: 'Does it have legs?' },
  { id: 'has_wings',  text: 'Does it have wings or can it fly?' },
  { id: 'water',      text: 'Is it related to water?' },
  { id: 'round',      text: 'Is it round or circular?' },
  { id: 'has_color',  text: 'Does it come in many colors?' },
  { id: 'found_home', text: 'Could you find it in a typical home?' },
  { id: 'used_daily', text: 'Is it used daily by most people?' },
];

// Final guess options (subset of secret words + distractors)
const GUESS_OPTIONS = SECRET_WORDS;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pickSecret() {
  return SECRET_WORDS[Math.floor(Math.random() * SECRET_WORDS.length)];
}

// ─── Engine ───────────────────────────────────────────────────────────────────

class TwentyQuestionsEngine extends BaseGameEngine {
  constructor(roomCode, config, io, room) {
    super(roomCode, { ...config, gameId: GAME_IDS.TWENTY_QUESTIONS }, io, room);
    this.tickRate = 5;

    this.secretWord        = pickSecret();
    this.questionsAsked    = [];  // { id, text, answer: 'yes'|'no' }
    this.questionsLeft     = MAX_QUESTIONS;
    this.phase             = 'playing';  // 'playing' | 'guessing' | 'complete'
    this.won               = false;
    this.finished          = false;
    this.pendingQuestion   = null;  // question P2 asked, waiting for P1 to answer
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
  }

  // ─── Input ─────────────────────────────────────────────────────────────────

  processInput(playerId, inputType, inputData) {
    if (this.finished) return;

    const playerNum = this._playerNum(playerId);

    // P2 asks a question
    if (inputType === 'question' && playerNum === 2 && this.phase === 'playing') {
      if (this.questionsLeft <= 0) return;
      const qId = inputData.questionId;
      const q   = PRESET_QUESTIONS.find(pq => pq.id === qId);
      if (!q) return;

      // Don't allow re-asking the same question
      if (this.questionsAsked.find(qa => qa.id === qId)) return;

      this.pendingQuestion = { id: q.id, text: q.text };
      this.io.to(this.roomCode).emit('game:questionAsked', {
        questionId: q.id,
        text:       q.text,
        questionsLeft: this.questionsLeft,
      });
      return;
    }

    // P1 answers (tap = yes, hold = no)
    if ((inputType === 'yes' || inputType === 'no') && playerNum === 1 && this.pendingQuestion) {
      const answer = inputType; // 'yes' or 'no'
      const q      = this.pendingQuestion;
      this.pendingQuestion = null;

      this.questionsAsked.push({ id: q.id, text: q.text, answer });
      this.questionsLeft--;

      this.io.to(this.roomCode).emit('game:questionAnswered', {
        questionId:    q.id,
        text:          q.text,
        answer,
        questionsLeft: this.questionsLeft,
        history:       this.questionsAsked,
      });

      if (this.questionsLeft <= 0) {
        // Move to final guess phase
        this.phase = 'guessing';
        this.io.to(this.roomCode).emit('game:phaseChange', { phase: 'guessing' });
      }
      return;
    }

    // P2 requests to go straight to guessing
    if (inputType === 'readyToGuess' && playerNum === 2 && this.phase === 'playing') {
      this.phase = 'guessing';
      this.io.to(this.roomCode).emit('game:phaseChange', { phase: 'guessing' });
      return;
    }

    // P2 makes a final guess
    if (inputType === 'guess' && playerNum === 2 && this.phase === 'guessing') {
      const guess   = inputData.word;
      const correct = guess && guess.toLowerCase() === this.secretWord.toLowerCase();

      this.won      = correct;
      this.finished = true;
      this.phase    = 'complete';

      this.io.to(this.roomCode).emit('game:guessResult', {
        guess,
        correct,
        secretWord: this.secretWord,
      });

      const stars = correct
        ? (this.questionsLeft >= 15 ? 3 : this.questionsLeft >= 8 ? 2 : 1)
        : 0;
      const score = correct ? (this.questionsLeft * 50 + 200) : 0;

      if (correct) {
        this.setWin(stars, score, { secretWord: this.secretWord, questionsUsed: MAX_QUESTIONS - this.questionsLeft });
      } else {
        this.setLoss('wrong_guess');
      }
    }
  }

  // ─── State ─────────────────────────────────────────────────────────────────

  getState() {
    return {
      ...super.getState(),
      phase:            this.phase,
      // P1 only: secret word
      secretWord:       this.secretWord,
      questionsLeft:    this.questionsLeft,
      maxQuestions:     MAX_QUESTIONS,
      questionsAsked:   this.questionsAsked,
      pendingQuestion:  this.pendingQuestion,
      // P2 question options (hide already-asked)
      availableQuestions: PRESET_QUESTIONS.filter(q =>
        !this.questionsAsked.find(qa => qa.id === q.id)
      ),
      guessOptions: GUESS_OPTIONS,
      won:          this.won,
    };
  }
}

module.exports = { TwentyQuestionsEngine };
