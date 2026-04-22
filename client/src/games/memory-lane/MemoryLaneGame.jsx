import React, { useState, useEffect, useCallback } from 'react'
import { useGame } from '../../context/GameContext.jsx'
import { useGameState } from '../../hooks/useGameState.js'

// ─── Color swatch ─────────────────────────────────────────────────────────────

const COLOR_MAP = {
  red:    '#e53e3e',
  blue:   '#3182ce',
  green:  '#38a169',
  yellow: '#d69e2e',
  purple: '#805ad5',
  orange: '#dd6b20',
  pink:   '#d53f8c',
  teal:   '#2c7a7b',
}

// ─── Object card (shown during memorization phase) ───────────────────────────

function ObjectCard({ obj, isActive }) {
  return (
    <div
      className={`
        rounded-2xl border-2 flex flex-col items-center justify-center gap-1 p-2 transition-all duration-300
        ${isActive
          ? 'border-amber-500 bg-amber-50 shadow-lg scale-105'
          : 'border-stone-200 bg-white/60 scale-100 opacity-70'}
      `}
      style={{ minHeight: 80 }}
    >
      <div style={{ fontSize: 36 }}>{obj.emoji}</div>
      <div
        className="w-5 h-5 rounded-full border border-stone-300 shadow"
        style={{ background: COLOR_MAP[obj.color] || obj.color }}
        title={obj.color}
      />
      <div className="text-xs text-stone-500 capitalize">{obj.position.label}</div>
    </div>
  )
}

// ─── Show phase — memorize the objects ───────────────────────────────────────

function ShowPhase({ state }) {
  const { objects = [], showIndex = 0, showTimer = 0, showDuration = 3 } = state || {}
  const progress = Math.min(1, showTimer / showDuration)

  return (
    <div className="flex flex-col h-full bg-amber-50 px-4 py-5 gap-4">
      {/* Header */}
      <div className="text-center">
        <div className="font-handwriting text-2xl font-bold text-amber-900">Memorize!</div>
        <div className="text-sm text-amber-700/70">Object {showIndex + 1} of {objects.length}</div>
      </div>

      {/* Timer bar */}
      <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-200"
          style={{
            width: `${(1 - progress) * 100}%`,
            background: progress > 0.6 ? '#e53e3e' : progress > 0.3 ? '#dd6b20' : '#38a169',
          }}
        />
      </div>

      {/* Objects grid */}
      <div className="flex-1 grid grid-cols-2 gap-3">
        {objects.map((obj, i) => (
          <ObjectCard key={obj.id} obj={obj} isActive={i === showIndex} />
        ))}
      </div>

      <div className="text-center text-xs text-amber-700/60">
        Both players see the same objects. Remember colors AND positions!
      </div>
    </div>
  )
}

// ─── Quiz phase — P1 (color questions) ───────────────────────────────────────

function ColorQuestion({ state, sendInput, lastResult }) {
  const { colorQuestion, quizIndex, totalQuestions, p1AnswerCount, score } = state || {}
  const [selected, setSelected] = useState(null)
  const alreadyAnswered = p1AnswerCount > quizIndex

  const handleAnswer = useCallback((choice) => {
    if (alreadyAnswered) return
    setSelected(choice)
    sendInput('answer', { choice })
  }, [alreadyAnswered, sendInput])

  // Reset selection on new question
  useEffect(() => {
    setSelected(null)
  }, [quizIndex])

  if (!colorQuestion) {
    return (
      <div className="flex-1 flex items-center justify-center text-amber-700">
        Waiting for question…
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-amber-50 px-4 py-5 gap-4">
      {/* Header */}
      <div className="text-center">
        <div className="text-xs uppercase tracking-widest text-amber-800/60 mb-1">
          Question {quizIndex + 1} of {totalQuestions}
        </div>
        <div className="font-handwriting text-xl font-bold text-amber-900">Your turn, Color Expert!</div>
      </div>

      {/* Your role card */}
      <div className="bg-amber-200/60 rounded-xl px-4 py-2 text-center text-sm text-amber-800 font-medium">
        You answer color questions • Your partner answers position questions
      </div>

      {/* Last result */}
      {lastResult && (
        <div className={`rounded-xl px-4 py-2 text-center text-sm font-bold ${
          lastResult.p1Correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {lastResult.p1Correct ? '✓ Correct!' : `✗ It was ${lastResult.colorAnswer}`}
        </div>
      )}

      {/* Question */}
      <div className="bg-white rounded-2xl border-2 border-amber-300 p-5 text-center">
        <div className="text-4xl mb-3">{colorQuestion.emoji}</div>
        <div className="font-handwriting text-xl font-bold text-amber-900">{colorQuestion.question}</div>
      </div>

      {/* Choices */}
      <div className="grid grid-cols-2 gap-3">
        {(colorQuestion.choices || []).map(choice => (
          <button
            key={choice}
            onClick={() => handleAnswer(choice)}
            disabled={alreadyAnswered}
            className={`
              py-4 rounded-2xl border-2 font-bold text-sm transition-all active:scale-95
              ${selected === choice
                ? 'border-amber-600 bg-amber-400 text-white'
                : alreadyAnswered
                  ? 'border-stone-200 bg-stone-100 text-stone-400 cursor-not-allowed'
                  : 'border-stone-300 bg-white text-stone-700 hover:border-amber-400 hover:bg-amber-50'
              }
            `}
          >
            <span
              className="inline-block w-4 h-4 rounded-full mr-2 border border-stone-300 align-middle"
              style={{ background: COLOR_MAP[choice] || choice }}
            />
            {choice}
          </button>
        ))}
      </div>

      {alreadyAnswered && (
        <div className="text-center text-sm text-amber-700/60">
          Waiting for your partner to answer…
        </div>
      )}

      <div className="mt-auto text-center text-sm text-amber-700/60">
        Score so far: <span className="font-bold text-amber-800">{score || 0}</span>
      </div>
    </div>
  )
}

// ─── Quiz phase — P2 (position questions) ────────────────────────────────────

function PositionQuestion({ state, sendInput, lastResult }) {
  const { positionQuestion, quizIndex, totalQuestions, p2AnswerCount, score } = state || {}
  const [selected, setSelected] = useState(null)
  const alreadyAnswered = p2AnswerCount > quizIndex

  const handleAnswer = useCallback((choice) => {
    if (alreadyAnswered) return
    setSelected(choice)
    sendInput('answer', { choice })
  }, [alreadyAnswered, sendInput])

  useEffect(() => {
    setSelected(null)
  }, [quizIndex])

  if (!positionQuestion) {
    return (
      <div className="flex-1 flex items-center justify-center text-stone-600">
        Waiting for question…
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-stone-50 px-4 py-5 gap-4">
      {/* Header */}
      <div className="text-center">
        <div className="text-xs uppercase tracking-widest text-stone-500 mb-1">
          Question {quizIndex + 1} of {totalQuestions}
        </div>
        <div className="font-handwriting text-xl font-bold text-stone-800">Your turn, Position Expert!</div>
      </div>

      {/* Your role card */}
      <div className="bg-stone-200/80 rounded-xl px-4 py-2 text-center text-sm text-stone-700 font-medium">
        You answer position questions • Your partner answers color questions
      </div>

      {/* Last result */}
      {lastResult && (
        <div className={`rounded-xl px-4 py-2 text-center text-sm font-bold ${
          lastResult.p2Correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {lastResult.p2Correct ? '✓ Correct!' : `✗ It was ${lastResult.posAnswer}`}
        </div>
      )}

      {/* Question */}
      <div className="bg-white rounded-2xl border-2 border-stone-300 p-5 text-center">
        <div className="text-4xl mb-3">{positionQuestion.emoji}</div>
        <div className="font-handwriting text-xl font-bold text-stone-800">{positionQuestion.question}</div>
      </div>

      {/* Position grid choices */}
      <div className="grid grid-cols-2 gap-3">
        {(positionQuestion.choices || []).map(choice => (
          <button
            key={choice}
            onClick={() => handleAnswer(choice)}
            disabled={alreadyAnswered}
            className={`
              py-4 rounded-2xl border-2 font-bold text-sm capitalize transition-all active:scale-95
              ${selected === choice
                ? 'border-stone-700 bg-stone-700 text-white'
                : alreadyAnswered
                  ? 'border-stone-200 bg-stone-100 text-stone-400 cursor-not-allowed'
                  : 'border-stone-300 bg-white text-stone-700 hover:border-stone-500 hover:bg-stone-100'
              }
            `}
          >
            {choice.replace('-', ' ')}
          </button>
        ))}
      </div>

      {alreadyAnswered && (
        <div className="text-center text-sm text-stone-500">
          Waiting for your partner to answer…
        </div>
      )}

      <div className="mt-auto text-center text-sm text-stone-500">
        Score so far: <span className="font-bold text-stone-700">{score || 0}</span>
      </div>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function MemoryLaneGame() {
  const { myRole, socket } = useGame()
  const { gameState, sendInput } = useGameState()

  const [lastResult, setLastResult] = useState(null)

  const isP1 = myRole === 'player1'

  // Listen for question results
  useEffect(() => {
    if (!socket) return
    const onResult = (data) => {
      setLastResult(data)
    }
    socket.on('game:questionResult', onResult)
    return () => socket.off('game:questionResult', onResult)
  }, [socket])

  // Clear last result on new question
  useEffect(() => {
    if (gameState?.quizIndex !== undefined) {
      setLastResult(null)
    }
  }, [gameState?.quizIndex])

  if (!gameState) {
    return (
      <div className="flex items-center justify-center h-full bg-amber-50">
        <div className="text-amber-700 font-semibold">Setting up memory lane…</div>
      </div>
    )
  }

  if (gameState.phase === 'complete') {
    const maxScore = (gameState.totalQuestions || 10) * 100
    const pct = Math.round(((gameState.score || 0) / maxScore) * 100)
    return (
      <div className="flex flex-col items-center justify-center h-full bg-amber-50 gap-4 px-8">
        <div className="text-6xl">🧠</div>
        <div className="font-handwriting text-2xl font-bold text-amber-900">Memory complete!</div>
        <div className="text-amber-700 text-lg">Score: {gameState.score} ({pct}%)</div>
      </div>
    )
  }

  if (gameState.phase === 'show') {
    return <ShowPhase state={gameState} />
  }

  // Quiz phase
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {isP1
        ? <ColorQuestion state={gameState} sendInput={sendInput} lastResult={lastResult} />
        : <PositionQuestion state={gameState} sendInput={sendInput} lastResult={lastResult} />
      }
    </div>
  )
}
