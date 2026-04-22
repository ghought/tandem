import React, { useState, useEffect, useCallback } from 'react'
import { useGame } from '../../context/GameContext.jsx'
import { useGameState } from '../../hooks/useGameState.js'

// ─── Timer bar ────────────────────────────────────────────────────────────────

function TimerBar({ timeLeft, duration }) {
  const pct = Math.max(0, Math.min(100, (timeLeft / duration) * 100))
  const color = pct > 50 ? '#4A7C59' : pct > 25 ? '#E8873A' : '#D94F3D'
  return (
    <div className="w-full h-3 bg-black/10 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  )
}

// ─── Recipe card (reader / player1) ───────────────────────────────────────────

function RecipeCard({ state, sendInput }) {
  const { readerSteps, recipeName, phase, currentStep } = state || {}

  const handleHint = useCallback((stepIndex) => {
    sendInput('hint', { step: stepIndex })
  }, [sendInput])

  const handleStartCooking = useCallback(() => {
    sendInput('startCooking', {})
  }, [sendInput])

  return (
    <div className="flex flex-col h-full bg-amber-50 p-4 gap-3"
      style={{ fontFamily: 'Georgia, serif' }}>

      {/* Title */}
      <div className="text-center">
        <div className="text-xs uppercase tracking-widest text-amber-800/60 mb-1">Recipe Card</div>
        <div className="text-2xl font-bold text-amber-900">{recipeName || '...'}</div>
      </div>

      <div className="w-full border-b-2 border-dashed border-amber-300" />

      {/* Your role label */}
      <div className="bg-amber-200/60 rounded-lg px-3 py-1.5 text-center">
        <span className="text-xs font-semibold text-amber-800">
          You are the Reader — describe the steps to your Cook!
        </span>
      </div>

      {/* Steps list */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-2">
        {(readerSteps || []).map((step) => (
          <button
            key={step.index}
            onClick={() => !step.done && handleHint(step.index)}
            className={[
              'w-full text-left rounded-xl px-4 py-3 border-2 transition-all',
              step.done
                ? 'bg-green-100 border-green-400 opacity-70'
                : step.highlighted
                  ? 'bg-yellow-100 border-yellow-500 shadow-md scale-[1.01]'
                  : step.index === currentStep
                    ? 'bg-white border-amber-400 shadow-sm'
                    : 'bg-amber-50 border-amber-200',
            ].join(' ')}
          >
            <div className="flex items-start gap-3">
              <span className={[
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5',
                step.done ? 'bg-green-400 text-white' : 'bg-amber-300 text-amber-900',
              ].join(' ')}>
                {step.done ? '✓' : step.index + 1}
              </span>
              <div>
                <div className={`text-sm font-semibold ${step.done ? 'line-through text-green-700' : 'text-amber-900'}`}>
                  {step.action} {step.ingredient}
                </div>
                <div className="text-xs text-amber-700/70">{step.amount}</div>
              </div>
            </div>
            {step.highlighted && !step.done && (
              <div className="mt-1 text-xs text-yellow-700 font-medium">✨ Highlighted for cook</div>
            )}
          </button>
        ))}
      </div>

      {/* Start cooking button */}
      {phase === 'reading' && (
        <button
          onClick={handleStartCooking}
          className="w-full bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold py-3 px-6 rounded-xl text-lg shadow-md transition-all"
        >
          🍳 Start Cooking!
        </button>
      )}

      {phase === 'cooking' && (
        <div className="text-center text-xs text-amber-700/60">
          Tap a step to highlight it for your Cook
        </div>
      )}
    </div>
  )
}

// ─── Cook's pantry (cook / player2) ───────────────────────────────────────────

function CookPantry({ state, sendInput }) {
  const {
    cookIngredients, cookActions, completedSteps,
    currentStep, phase, readerSteps,
  } = state || {}

  const [selectedIngredient, setSelectedIngredient] = useState(null)
  const [selectedAction, setSelectedAction]         = useState(null)
  const [shake, setShake]                           = useState(false)

  // Step count from readerSteps
  const totalSteps  = (readerSteps || []).length
  const doneCount   = (completedSteps || []).length

  const handleSubmit = useCallback(() => {
    if (!selectedIngredient || !selectedAction) return
    sendInput('action', { ingredient: selectedIngredient, action: selectedAction })
    setSelectedIngredient(null)
    setSelectedAction(null)
  }, [selectedIngredient, selectedAction, sendInput])

  // Listen for wrong-step event to shake UI
  useEffect(() => {
    if (shake) {
      const t = setTimeout(() => setShake(false), 600)
      return () => clearTimeout(t)
    }
  }, [shake])

  // Highlight if readerSteps has a highlighted step
  const highlightedStep = (readerSteps || []).find(s => s.highlighted)

  const waiting = phase === 'reading'

  return (
    <div className="flex flex-col h-full bg-stone-100 p-4 gap-3">

      {/* Role label */}
      <div className="bg-stone-200 rounded-lg px-3 py-1.5 text-center">
        <span className="text-xs font-semibold text-stone-700">
          You are the Cook — listen to your Reader!
        </span>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="text-xs text-stone-600 shrink-0">Progress</div>
        <div className="flex-1 h-2 bg-stone-300 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-500"
            style={{ width: totalSteps > 0 ? `${(doneCount / totalSteps) * 100}%` : '0%' }}
          />
        </div>
        <div className="text-xs text-stone-600 shrink-0">{doneCount}/{totalSteps}</div>
      </div>

      {/* Hint banner */}
      {highlightedStep && (
        <div className="bg-yellow-100 border border-yellow-400 rounded-lg px-3 py-2 text-xs text-yellow-800 font-medium text-center animate-pulse">
          ✨ Hint: step {highlightedStep.index + 1} — {highlightedStep.action} something…
        </div>
      )}

      {/* Waiting state */}
      {waiting ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-stone-500">
            <div className="text-4xl mb-2">📖</div>
            <div className="text-sm">Waiting for your partner to read the recipe…</div>
          </div>
        </div>
      ) : (
        <>
          {/* Ingredients grid */}
          <div>
            <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Ingredients</div>
            <div className="grid grid-cols-3 gap-1.5">
              {(cookIngredients || []).map(ing => (
                <button
                  key={ing}
                  onClick={() => setSelectedIngredient(ing === selectedIngredient ? null : ing)}
                  className={[
                    'text-center text-xs py-2 px-1 rounded-lg border-2 transition-all leading-tight',
                    selectedIngredient === ing
                      ? 'bg-amber-200 border-amber-500 font-bold'
                      : 'bg-white border-stone-200 text-stone-700',
                  ].join(' ')}
                >
                  {ing}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div>
            <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Action</div>
            <div className="flex flex-wrap gap-2">
              {(cookActions || []).map(act => (
                <button
                  key={act}
                  onClick={() => setSelectedAction(act === selectedAction ? null : act)}
                  className={[
                    'text-sm py-2 px-4 rounded-full border-2 transition-all font-semibold',
                    selectedAction === act
                      ? 'bg-stone-700 border-stone-700 text-white'
                      : 'bg-white border-stone-300 text-stone-700',
                  ].join(' ')}
                >
                  {act}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            disabled={!selectedIngredient || !selectedAction}
            onClick={handleSubmit}
            className={[
              'w-full py-3 rounded-xl font-bold text-lg shadow transition-all',
              selectedIngredient && selectedAction
                ? 'bg-stone-800 text-white active:scale-95'
                : 'bg-stone-300 text-stone-400 cursor-not-allowed',
            ].join(' ')}
          >
            {selectedIngredient && selectedAction
              ? `${selectedAction} ${selectedIngredient}`
              : 'Select ingredient & action'}
          </button>
        </>
      )}
    </div>
  )
}

// ─── Shared header ─────────────────────────────────────────────────────────────

function GameHeader({ state }) {
  const { recipeName, recipeIndex, totalRecipes, timeLeft, recipeDuration, phase } = state || {}
  return (
    <div className="px-4 pt-4 pb-2 bg-amber-700 text-white">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs opacity-70">Recipe {(recipeIndex || 0) + 1} of {totalRecipes || 3}</div>
          <div className="font-bold text-lg leading-tight">{recipeName || '…'}</div>
        </div>
        {phase === 'cooking' && (
          <div className="text-right">
            <div className="text-2xl font-bold tabular-nums">{Math.ceil(timeLeft || 0)}s</div>
            <div className="text-xs opacity-70">remaining</div>
          </div>
        )}
      </div>
      {phase === 'cooking' && (
        <div className="mt-2">
          <TimerBar timeLeft={timeLeft || 0} duration={recipeDuration || 120} />
        </div>
      )}
    </div>
  )
}

// ─── Root component ────────────────────────────────────────────────────────────

export default function RecipeRushGame() {
  const { myRole } = useGame()
  const { gameState, sendInput } = useGameState()

  const isReader = myRole === 'player1'

  if (!gameState) {
    return (
      <div className="flex items-center justify-center h-full bg-amber-50">
        <div className="text-amber-800 font-semibold text-lg">Loading kitchen…</div>
      </div>
    )
  }

  if (gameState.phase === 'complete') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-amber-50 gap-4 px-8">
        <div className="text-6xl">🎉</div>
        <div className="text-2xl font-bold text-amber-900">All recipes done!</div>
        <div className="text-amber-700">Score: {gameState.totalScore}</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <GameHeader state={gameState} />
      <div className="flex-1 overflow-hidden">
        {isReader
          ? <RecipeCard state={gameState} sendInput={sendInput} />
          : <CookPantry state={gameState} sendInput={sendInput} />
        }
      </div>
    </div>
  )
}
