import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useGame } from '../../context/GameContext.jsx'
import { useGameState } from '../../hooks/useGameState.js'

const FLAVOR_META = {
  sweet: { emoji: '🍬', label: 'Sweet',  color: '#E87CA0' },
  salty: { emoji: '🧂', label: 'Salty',  color: '#8CB4E0' },
  sour:  { emoji: '🍋', label: 'Sour',   color: '#D4C135' },
  spicy: { emoji: '🌶', label: 'Spicy',  color: '#D94F3D' },
}

const FLAVOR_KEYS = ['sweet', 'salty', 'sour', 'spicy']

// ─── Flavor bar (taster / player1) ────────────────────────────────────────────

function FlavorBars({ targetFlavors }) {
  return (
    <div className="flex-1 flex flex-col gap-4 justify-center px-4">
      <div className="text-center text-sm font-semibold text-gray-600 mb-2">
        Describe these flavors to your partner!
      </div>
      {FLAVOR_KEYS.map((key) => {
        const meta = FLAVOR_META[key]
        const val  = targetFlavors ? targetFlavors[key] : 0
        return (
          <div key={key} className="flex items-center gap-3">
            <div className="w-8 text-xl text-center shrink-0">{meta.emoji}</div>
            <div className="w-12 text-xs font-semibold text-gray-700 shrink-0">{meta.label}</div>
            <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden relative">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${val}%`, background: meta.color }}
              />
              <div className="absolute inset-0 flex items-center justify-end pr-2">
                <span className="text-xs font-bold text-white drop-shadow">{val}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Vertical slider (adjuster / player2) ─────────────────────────────────────

function FlavorSlider({ flavorKey, value, onChange }) {
  const meta     = FLAVOR_META[flavorKey]
  const trackRef = useRef(null)

  const calcValue = useCallback((clientY) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return value
    const raw = 1 - (clientY - rect.top) / rect.height
    return Math.round(Math.min(100, Math.max(0, raw * 100)))
  }, [value])

  const onPointerDown = useCallback((e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    onChange(calcValue(e.clientY))
  }, [calcValue, onChange])

  const onPointerMove = useCallback((e) => {
    if (e.buttons === 0) return
    onChange(calcValue(e.clientY))
  }, [calcValue, onChange])

  const thumbPct = value  // 0–100, 0 at bottom

  return (
    <div className="flex flex-col items-center gap-1 select-none" style={{ touchAction: 'none' }}>
      <div className="text-lg">{meta.emoji}</div>
      <div
        ref={trackRef}
        className="relative w-10 rounded-full bg-gray-200 cursor-pointer"
        style={{ height: 140 }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
      >
        {/* Fill */}
        <div
          className="absolute bottom-0 left-0 right-0 rounded-full transition-all"
          style={{ height: `${thumbPct}%`, background: meta.color }}
        />
        {/* Thumb */}
        <div
          className="absolute left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white border-2 shadow-md flex items-center justify-center"
          style={{ bottom: `calc(${thumbPct}% - 16px)`, borderColor: meta.color }}
        >
          <span className="text-[10px] font-bold" style={{ color: meta.color }}>{value}</span>
        </div>
      </div>
      <div className="text-[10px] font-semibold text-gray-500">{meta.label}</div>
    </div>
  )
}

function AdjusterPanel({ state, sendInput }) {
  const { guessFlavors, submitted, phase } = state || {}

  const handleSlider = useCallback((key, val) => {
    sendInput('setFlavor', { flavor: key, value: val })
  }, [sendInput])

  const handleSubmit = useCallback(() => {
    sendInput('submit', {})
  }, [sendInput])

  if (phase === 'reveal') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
        <div className="text-4xl">🎯</div>
        <div className="text-lg font-bold text-gray-800">Revealed!</div>
        <div className="text-sm text-gray-500">See how close you got…</div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col px-4 py-3 gap-4">
      <div className="text-center text-sm font-semibold text-gray-600">
        Move the sliders to match what your partner describes!
      </div>
      <div className="flex justify-around items-end flex-1">
        {FLAVOR_KEYS.map((key) => (
          <FlavorSlider
            key={key}
            flavorKey={key}
            value={guessFlavors ? guessFlavors[key] : 50}
            onChange={(val) => handleSlider(key, val)}
          />
        ))}
      </div>
      <button
        disabled={!!submitted}
        onClick={handleSubmit}
        className={[
          'w-full py-3 rounded-xl font-bold text-lg transition-all',
          submitted
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-rose-500 hover:bg-rose-600 active:scale-95 text-white shadow-md',
        ].join(' ')}
      >
        {submitted ? 'Submitted!' : 'Submit Guess'}
      </button>
    </div>
  )
}

// ─── Reveal overlay ────────────────────────────────────────────────────────────

function RevealPanel({ state }) {
  const { targetFlavors, guessFlavors, roundScore } = state || {}
  if (!targetFlavors || !guessFlavors) return null

  return (
    <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center gap-3 px-6 animate-fade-in z-10">
      <div className="text-2xl font-bold text-gray-800">Round Result</div>
      <div className="text-4xl font-bold" style={{ color: roundScore >= 80 ? '#4A9E6B' : roundScore >= 50 ? '#E8873A' : '#D94F3D' }}>
        {roundScore}/100
      </div>
      <div className="w-full flex flex-col gap-2">
        {FLAVOR_KEYS.map((key) => {
          const meta   = FLAVOR_META[key]
          const target = targetFlavors[key] || 0
          const guess  = guessFlavors[key]  || 0
          const diff   = Math.abs(target - guess)
          return (
            <div key={key} className="flex items-center gap-2">
              <div className="w-6 text-center">{meta.emoji}</div>
              <div className="w-10 text-xs text-gray-600">{meta.label}</div>
              <div className="flex-1 relative h-4 bg-gray-100 rounded-full overflow-hidden">
                {/* Target */}
                <div className="absolute top-0 bottom-0 rounded-full opacity-40"
                  style={{ left: 0, width: `${target}%`, background: meta.color }} />
                {/* Guess */}
                <div className="absolute top-0 bottom-0 w-1 rounded-full"
                  style={{ left: `${guess}%`, background: '#1a1a2e' }} />
              </div>
              <div className={`text-xs font-bold w-8 text-right ${diff <= 10 ? 'text-green-600' : diff <= 25 ? 'text-orange-500' : 'text-red-500'}`}>
                ±{diff}
              </div>
            </div>
          )
        })}
      </div>
      <div className="text-xs text-gray-400">Next round starting soon…</div>
    </div>
  )
}

// ─── Header ────────────────────────────────────────────────────────────────────

function Header({ state, isReader }) {
  const { round, totalRounds, timeLeft, roundDuration, phase, totalScore } = state || {}
  const pct = Math.max(0, Math.min(100, ((timeLeft || 0) / (roundDuration || 90)) * 100))

  return (
    <div className="px-4 pt-4 pb-2 bg-rose-700 text-white">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-xs opacity-70">Round {round || 1} of {totalRounds || 3}</div>
          <div className="font-bold text-base leading-tight">
            {isReader ? 'Describe the flavors!' : 'Adjust the sliders!'}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold">{totalScore || 0} pts</div>
          {phase === 'tasting' && (
            <div className="text-xs opacity-70">{Math.ceil(timeLeft || 0)}s left</div>
          )}
        </div>
      </div>
      {phase === 'tasting' && (
        <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-white/80 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  )
}

// ─── Root ──────────────────────────────────────────────────────────────────────

export default function TasteTestGame() {
  const { myRole } = useGame()
  const { gameState, sendInput } = useGameState()

  const isReader  = myRole === 'player1'
  const showReveal = gameState?.phase === 'reveal'

  if (!gameState) {
    return (
      <div className="flex items-center justify-center h-full bg-rose-50">
        <div className="text-rose-800 text-lg font-semibold">Setting up taste test…</div>
      </div>
    )
  }

  if (gameState.phase === 'done') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-rose-50 gap-4 px-8">
        <div className="text-6xl">🏆</div>
        <div className="text-2xl font-bold text-rose-900">Tasting Complete!</div>
        <div className="text-rose-700">Total score: {gameState.totalScore}</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      <Header state={gameState} isReader={isReader} />
      <div className="flex-1 overflow-hidden flex flex-col relative">
        {isReader
          ? <FlavorBars targetFlavors={gameState.targetFlavors} />
          : <AdjusterPanel state={gameState} sendInput={sendInput} />
        }
        {showReveal && <RevealPanel state={gameState} />}
      </div>
    </div>
  )
}
