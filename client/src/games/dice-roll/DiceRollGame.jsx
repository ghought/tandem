import React, { useState, useEffect, useCallback } from 'react'
import { useGame } from '../../context/GameContext.jsx'
import { useGameState } from '../../hooks/useGameState.js'

// ─── Die face ─────────────────────────────────────────────────────────────────

const DOT_POSITIONS = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 20], [75, 20], [25, 50], [75, 50], [25, 80], [75, 80]],
}

function DieFace({ value = 1, held = false, size = 72, dimmed = false, onClick }) {
  const dots = DOT_POSITIONS[value] || DOT_POSITIONS[1]
  const r = size * 0.12

  return (
    <div
      onClick={onClick}
      className={`relative rounded-2xl transition-all duration-200 ${onClick ? 'cursor-pointer active:scale-95' : ''}`}
      style={{
        width:  size,
        height: size,
        background: held ? '#fef3c7' : '#fffdf5',
        border: held ? '3px solid #f59e0b' : '2px solid #d6c9a0',
        boxShadow: held
          ? '0 0 12px rgba(245,158,11,0.5), 0 2px 4px rgba(0,0,0,0.1)'
          : '0 2px 4px rgba(0,0,0,0.1)',
        opacity: dimmed ? 0.45 : 1,
      }}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full p-1">
        {dots.map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill={held ? '#b45309' : '#3c2a14'} />
        ))}
      </svg>
      {held && (
        <div className="absolute -top-2.5 -right-2 bg-amber-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow">
          H
        </div>
      )}
    </div>
  )
}

// ─── P1 – The Caller (sees target, controls holds) ────────────────────────────

function CallerView({ state, sendInput }) {
  const { target, sum, dice, held, round, rounds, score } = state || {}

  const diff   = (sum || 0) - (target || 0)
  const onTarget = diff === 0

  const handleHold = useCallback((i) => {
    sendInput('hold', { dieIndex: i })
  }, [sendInput])

  return (
    <div className="flex flex-col h-full bg-amber-50 px-4 py-5 gap-4">
      {/* Header */}
      <div className="text-center">
        <div className="text-xs uppercase tracking-widest text-amber-800/60 mb-1">Round {round || 1} of {rounds || 5}</div>
        <div className="font-handwriting text-2xl font-bold text-amber-900">You are the Caller</div>
        <div className="text-sm text-amber-700/70 mt-1">Tell your partner which dice to re-roll</div>
      </div>

      {/* Target */}
      <div className="bg-amber-200/60 rounded-2xl px-6 py-4 text-center">
        <div className="text-xs text-amber-800/60 uppercase tracking-wide mb-1">Target Sum</div>
        <div className="font-handwriting text-6xl font-bold text-amber-900 leading-none">{target}</div>
      </div>

      {/* Current sum indicator */}
      <div className="flex items-center justify-center gap-3">
        <div className="text-sm text-amber-700">Current sum:</div>
        <div
          className={`font-bold text-2xl transition-colors ${
            onTarget ? 'text-green-600' : Math.abs(diff) <= 3 ? 'text-amber-500' : 'text-red-500'
          }`}
        >
          {sum || 0}
        </div>
        {!onTarget && (
          <div className="text-sm text-amber-600/70">
            ({diff > 0 ? '+' : ''}{diff} from target)
          </div>
        )}
        {onTarget && <div className="text-green-600 font-bold">✓ On target!</div>}
      </div>

      {/* Dice — tappable to toggle hold */}
      <div>
        <div className="text-xs text-amber-700/60 text-center mb-2">Tap dice to hold/unhold</div>
        <div className="flex justify-center gap-3 flex-wrap">
          {(dice || []).map((v, i) => (
            <DieFace
              key={i}
              value={v}
              held={held?.[i]}
              size={68}
              onClick={() => handleHold(i)}
            />
          ))}
        </div>
      </div>

      {/* Score */}
      <div className="mt-auto text-center text-sm text-amber-700/60">
        Score: <span className="font-bold text-amber-800">{score || 0}</span>
      </div>
    </div>
  )
}

// ─── P2 – The Roller (sees dice faces, re-rolls and submits) ──────────────────

function RollerView({ state, sendInput, socket }) {
  const { dice, held, target, sum, round, rounds, score } = state || {}
  const [roundResult, setRoundResult] = useState(null)

  useEffect(() => {
    if (!socket) return
    const onResult = (data) => {
      setRoundResult(data)
      setTimeout(() => setRoundResult(null), 2000)
    }
    socket.on('game:roundResult', onResult)
    return () => socket.off('game:roundResult', onResult)
  }, [socket])

  const handleReroll = useCallback(() => {
    sendInput('reroll', {})
  }, [sendInput])

  const handleSubmit = useCallback(() => {
    sendInput('submit', {})
  }, [sendInput])

  const onTarget = (sum || 0) === (target || 0)

  return (
    <div className="flex flex-col h-full bg-stone-100 px-4 py-5 gap-4">
      {/* Header */}
      <div className="text-center">
        <div className="text-xs uppercase tracking-widest text-stone-500 mb-1">Round {round || 1} of {rounds || 5}</div>
        <div className="font-handwriting text-2xl font-bold text-stone-800">You are the Roller</div>
        <div className="text-sm text-stone-600/70 mt-1">Listen to your caller — roll the dice!</div>
      </div>

      {/* Held hint banner */}
      {(held || []).some(Boolean) && (
        <div className="bg-amber-100 border border-amber-400 rounded-xl px-4 py-2 text-xs text-amber-800 font-medium text-center">
          🔒 Your caller has held {(held || []).filter(Boolean).length} dice
        </div>
      )}

      {/* Dice display */}
      <div className="flex justify-center gap-3 flex-wrap py-2">
        {(dice || []).map((v, i) => (
          <DieFace
            key={i}
            value={v}
            held={held?.[i]}
            dimmed={held?.[i]}
            size={72}
          />
        ))}
      </div>

      {/* Sum display */}
      <div className="text-center">
        <div className="text-xs text-stone-500 uppercase tracking-wide mb-1">Current Sum</div>
        <div className={`font-handwriting text-5xl font-bold ${onTarget ? 'text-green-600' : 'text-stone-700'}`}>
          {sum || 0}
        </div>
      </div>

      {/* Round result overlay */}
      {roundResult && (
        <div className={`rounded-2xl p-4 text-center font-bold text-lg ${
          roundResult.won ? 'bg-green-200 text-green-800' : 'bg-red-100 text-red-700'
        }`}>
          {roundResult.won ? `🎉 Target hit! +${roundResult.score - (score || 0)} pts` : `❌ Missed (${roundResult.sum} vs ${roundResult.target})`}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 mt-2">
        <button
          onClick={handleReroll}
          className="flex-1 bg-stone-700 hover:bg-stone-800 active:scale-95 text-white font-bold py-4 rounded-2xl text-lg shadow transition-all"
        >
          🎲 Re-Roll
        </button>
        <button
          onClick={handleSubmit}
          className={`flex-1 font-bold py-4 rounded-2xl text-lg shadow transition-all active:scale-95 ${
            onTarget
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-amber-500 hover:bg-amber-600 text-white'
          }`}
        >
          {onTarget ? '✓ Lock In!' : '📌 Submit'}
        </button>
      </div>

      {/* Score */}
      <div className="mt-auto text-center text-sm text-stone-500">
        Score: <span className="font-bold text-stone-700">{score || 0}</span>
      </div>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function DiceRollGame() {
  const { myRole, socket } = useGame()
  const { gameState, sendInput } = useGameState()

  const isCaller = myRole === 'player1'

  if (!gameState) {
    return (
      <div className="flex items-center justify-center h-full bg-amber-50">
        <div className="text-amber-700 font-semibold">Rolling dice…</div>
      </div>
    )
  }

  if (gameState.phase === 'complete') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-amber-50 gap-4 px-8">
        <div className="text-6xl">🎲</div>
        <div className="font-handwriting text-2xl font-bold text-amber-900">All rounds done!</div>
        <div className="text-amber-700 text-lg">Final score: {gameState.score}</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {isCaller
        ? <CallerView state={gameState} sendInput={sendInput} />
        : <RollerView state={gameState} sendInput={sendInput} socket={socket} />
      }
    </div>
  )
}
