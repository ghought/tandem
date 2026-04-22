'use strict';

const BaseGameEngine = require('./BaseGameEngine');
const { GAME_IDS } = require('../../shared/constants');

// ─── Recipe definitions ───────────────────────────────────────────────────────

const RECIPES = [
  {
    name: 'Rainbow Soup',
    steps: [
      { ingredient: 'moonbeam carrots', action: 'chop',   amount: '3 handfuls' },
      { ingredient: 'starlight broth',  action: 'pour',   amount: '2 cups' },
      { ingredient: 'cloud mushrooms',  action: 'stir',   amount: '1 bunch' },
      { ingredient: 'fairy dust',       action: 'sprinkle', amount: 'a pinch' },
      { ingredient: 'rainbow berries',  action: 'toss',   amount: '7 berries' },
    ],
  },
  {
    name: 'Butterfly Toast',
    steps: [
      { ingredient: 'petal bread',      action: 'slice',  amount: '2 slices' },
      { ingredient: 'honey dew cream',  action: 'spread', amount: '1 spoonful' },
      { ingredient: 'blossom jam',      action: 'drizzle', amount: 'a swirl' },
      { ingredient: 'crystal sugar',    action: 'sprinkle', amount: 'lightly' },
    ],
  },
  {
    name: 'Starlight Pudding',
    steps: [
      { ingredient: 'moonmilk',         action: 'pour',   amount: '1 cup' },
      { ingredient: 'stardust powder',  action: 'whisk',  amount: '2 spoonfuls' },
      { ingredient: 'violet essence',   action: 'add',    amount: '3 drops' },
      { ingredient: 'dreamberry syrup', action: 'fold',   amount: 'a ribbon' },
      { ingredient: 'shooting star chips', action: 'top', amount: 'generously' },
    ],
  },
];

// All unique ingredients across all recipes
const ALL_INGREDIENTS = [...new Set(RECIPES.flatMap(r => r.steps.map(s => s.ingredient)))];

// All unique actions
const ALL_ACTIONS = [...new Set(RECIPES.flatMap(r => r.steps.map(s => s.action)))];

const RECIPE_TIME_S = 120;   // seconds per recipe
const TOTAL_RECIPES = RECIPES.length;

// ─── Engine ───────────────────────────────────────────────────────────────────

class RecipeRushEngine extends BaseGameEngine {
  constructor(roomCode, config, io, room) {
    super(roomCode, { ...config, gameId: GAME_IDS.RECIPE_RUSH }, io, room);
    this.tickRate = 5;

    this.recipeIndex    = 0;
    this.currentStep    = 0;
    this.completedSteps = [];
    this.totalScore     = 0;
    this.phase          = 'reading';   // 'reading' | 'cooking' | 'complete'
    this.timeLeft       = RECIPE_TIME_S;
    this.lastTickAt     = null;
    this.highlightedStep = null;    // reader hint

    this.finished = false;
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  get currentRecipe() {
    return RECIPES[this.recipeIndex] || RECIPES[0];
  }

  _playerNum(playerId) {
    const players = this.room.players || [];
    const idx = players.findIndex(p => p.id === playerId);
    return idx + 1; // 1 or 2
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

    if (this.phase === 'cooking') {
      this.timeLeft = Math.max(0, this.timeLeft - delta);

      if (this.timeLeft <= 0) {
        // Time out — advance with partial score
        this._advanceRecipe(false);
      }
    }
  }

  // ─── Input ─────────────────────────────────────────────────────────────────

  processInput(playerId, inputType, inputData) {
    if (this.finished) return;

    const playerNum = this._playerNum(playerId);
    const type = inputType || (inputData && inputData.type);

    // Reader: send hint about a step
    if (type === 'hint' && playerNum === 1) {
      this.highlightedStep = inputData.step != null ? inputData.step : null;
      return;
    }

    // Reader: start cooking phase
    if (type === 'startCooking' && playerNum === 1 && this.phase === 'reading') {
      this.phase = 'cooking';
      return;
    }

    // Cook: perform an action
    if (type === 'action' && playerNum === 2 && this.phase === 'cooking') {
      const { ingredient, action } = inputData || {};
      const recipe = this.currentRecipe;
      const expected = recipe.steps[this.currentStep];

      if (!expected) return;

      if (
        ingredient === expected.ingredient &&
        action     === expected.action
      ) {
        // Correct step
        this.completedSteps.push(this.currentStep);
        this.currentStep++;
        this.highlightedStep = null;

        this.io.to(this.roomCode).emit('game:stepComplete', {
          step:        this.currentStep - 1,
          stepName:    expected.ingredient,
          timeLeft:    Math.round(this.timeLeft),
        });

        if (this.currentStep >= recipe.steps.length) {
          this._advanceRecipe(true);
        }
      } else {
        // Wrong step — small time penalty
        this.timeLeft = Math.max(0, this.timeLeft - 5);
        this.io.to(this.roomCode).emit('game:stepWrong', { timeLeft: Math.round(this.timeLeft) });
      }
    }
  }

  // ─── Recipe advancement ────────────────────────────────────────────────────

  _advanceRecipe(completed) {
    const recipe = this.currentRecipe;
    const stepsCompleted = this.completedSteps.length;
    const totalSteps     = recipe.steps.length;

    // Score: time bonus + step completion
    const stepScore  = Math.round((stepsCompleted / totalSteps) * 300);
    const timeBonus  = completed ? Math.round(this.timeLeft * 2) : 0;
    this.totalScore += stepScore + timeBonus;

    this.recipeIndex++;
    this.currentStep    = 0;
    this.completedSteps = [];
    this.highlightedStep = null;
    this.timeLeft       = RECIPE_TIME_S;
    this.phase          = 'reading';

    if (this.recipeIndex >= TOTAL_RECIPES) {
      this._endGame();
    }
  }

  // ─── End ───────────────────────────────────────────────────────────────────

  _endGame() {
    this.finished = true;
    this.phase    = 'complete';

    const maxScore = TOTAL_RECIPES * (300 + RECIPE_TIME_S * 2);
    const pct      = this.totalScore / maxScore;

    let stars = 0;
    if (pct >= 0.8)       stars = 3;
    else if (pct >= 0.5)  stars = 2;
    else if (pct >= 0.2)  stars = 1;

    this.setWin(stars, this.totalScore, { recipesCompleted: TOTAL_RECIPES });
  }

  // ─── State ─────────────────────────────────────────────────────────────────

  getState() {
    const recipe = this.currentRecipe;
    return {
      ...super.getState(),
      // Common
      phase:           this.phase,
      recipeIndex:     this.recipeIndex,
      totalRecipes:    TOTAL_RECIPES,
      currentStep:     this.currentStep,
      completedSteps:  [...this.completedSteps],
      totalScore:      this.totalScore,
      timeLeft:        Math.round(this.timeLeft),
      recipeDuration:  RECIPE_TIME_S,
      // For reader (player1): full recipe details
      readerSteps: recipe.steps.map((s, i) => ({
        index:      i,
        ingredient: s.ingredient,
        action:     s.action,
        amount:     s.amount,
        done:       this.completedSteps.includes(i),
        highlighted: this.highlightedStep === i,
      })),
      recipeName: recipe.name,
      // For cook (player2): available ingredients & actions
      cookIngredients: ALL_INGREDIENTS,
      cookActions:     ALL_ACTIONS,
      highlightedStep: this.highlightedStep,
    };
  }
}

module.exports = { RecipeRushEngine, RECIPES, ALL_INGREDIENTS, ALL_ACTIONS };
