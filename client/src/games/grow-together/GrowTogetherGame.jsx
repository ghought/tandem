import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useGame } from '../../context/GameContext.jsx'
import { useGameState } from '../../hooks/useGameState.js'

// ─── Plant SVG ────────────────────────────────────────────────────────────────

function Plant({ bloomed, index, total }) {
  const pct    = total > 0 ? bloomed / total : 0
  const active = index < bloomed
  const size   = 28 + (active ? 10 : 0)

  return (
    <div
      className="transition-all duration-500 flex flex-col items-center"
      style={{ opacity: active ? 1 : 0.25 }}
    >
      <div
        className="rounded-full flex items-center justify-center transition-all duration-500"
        style={{
          width:  size,
          height: size,
          background: active ? '#4A9E6B' : '#ccc',
          boxShadow: active ? '0 0 10px rgba(74,158,107,0.5)' : 'none',
        }}
      >
        <span style={{ fontSize: size * 0.55 }}>{active ? '🌸' : '🌱'}</span>
      </div>
    </div>
  )
}

// ─── Beat indicator ───────────────────────────────────────────────────────────

function BeatPulse({ nextBeatAt, beatIntervalMs, active }) {
  const [scale, setScale] = useState(1)
  const rafRef = useRef(null)

  useEffect(() => {
    if (!active || !nextBeatAt || !beatIntervalMs) return

    const animate = () => {
      const now      = Date.now()
      const timeToNext = nextBeatAt - now
      const progress   = 1 - Math.min(1, Math.max(0, timeToNext / beatIntervalMs))
      // Pulse as we approach the beat
      const s = 1 + Math.sin(progress * Math.PI) * 0.25
      setScale(s)
      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [nextBeatAt, beatIntervalMs, active])

  return (
    <div
      className="w-20 h-20 rounded-full flex items-center justify-center transition-transform"
      style={{
        background: 'radial-gradient(circle, #A8D8A8, #4A7C59)',
        transform: `scale(${scale})`,
        boxShadow: `0 0 ${20 * (scale - 1) * 4}px rgba(74,124,89,0.5)`,
      }}
    >
      <span className="text-3xl">🌿</span>
    </div>
  )
}

// ─── Tap button (per player side) ─────────────────────────────────────────────

function TapButton({ label, onTap, color }) {
  const [flash, setFlash] = useState(false)

  const handleTap = useCallback(() => {
    onTap()
    setFlash(true)
    setTimeout(() => setFlash(false), 120)
  }, [onTap])

  return (
    <button
      onPointerDown={handleTap}
      className="w-full h-full rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-all select-none"
      style={{
        background: flash ? color : `${color}33`,
        border: `3px solid ${color}`,
        boxShadow: flash ? `0 0 20px ${color}88` : 'none',
      }}
    >
      <div className="text-3xl">💧</div>
      <div className="font-bold text-sm" style={{ color }}>
        {label}
      </div>
      <div className="text-xs opacity-60" style={{ color }}>tap on the beat</div>
    </button>
  )
}

// ─── Sparkles overlay ─────────────────────────────────────────────────────────

function Sparkles({ active }) {
  if (!active) return null
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="absolute text-xl animate-bounce"
          style={{
            left:  `${10 + i * 11}%`,
            top:   `${15 + (i % 3) * 25}%`,
            animationDelay: `${i * 0.1}s`,
            opacity: 0.8,
          }}
        >
          ✨
        </div>
      ))}
    </div>
  )
}

// ─── Root ──────────────────────────────────────────────────────────────────────

export default function GrowTogetherGame() {
  const { myRole } = useGame()
  const { gameState, sendInput } = useGameState()
  const [synced, setSynced] = useState(false)

  const isP1 = myRole === 'player1'

  const handleTap = useCallback(() => {
    sendInput('tap', { timestamp: Date.now() })
  }, [sendInput])

  // Flash synced effect when beat event fires
  useEffect(() => {
    if (!gameState) return
    // We detect sync from syncStreak increasing
  }, [gameState])

  if (!gameState) {
    return (
      <div className="flex items-center justify-center h-full bg-green-50">
        <div className="text-green-800 text-lg font-semibold">Planting seeds…</div>
      </div>
    )
  }

  const {
    phase, bloomed, totalNeeded, syncStreak,
    beat, beatsPerSequence, sequence, totalSequences,
    nextBeatAt, beatIntervalMs, syncWindowMs,
  } = gameState

  const playing = phase === 'playing'

  if (phase === 'done') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4"
        style={{ background: 'linear-gradient(135deg, #1B4332 0%, #4A7C59 100%)' }}>
        <div className="text-6xl">🌺</div>
        <div className="text-2xl font-bold text-white">Garden in Bloom!</div>
        <div className="text-green-200">{bloomed} / {totalNeeded} flowers</div>
      </div>
    )
  }

  const bloomPct = totalNeeded > 0 ? bloomed / totalNeeded : 0
  const beatNum  = beat || 1

  return (
    <div className="relative flex flex-col h-full overflow-hidden select-none"
      style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)' }}>

      <Sparkles active={syncStreak >= 3} />

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="text-green-200 text-xs">
          Sequence {sequence || 1}/{totalSequences || 3}
        </div>
        <div className="text-green-200 text-xs">
          Beat {beatNum}/{beatsPerSequence || 8}
        </div>
        {syncStreak > 0 && (
          <div className="text-yellow-300 text-xs font-bold">
            🔥 Streak ×{syncStreak}
          </div>
        )}
      </div>

      {/* Plants row */}
      <div className="flex items-center justify-center gap-2 px-4 py-2">
        {[...Array(totalNeeded || 24)].map((_, i) => (
          <Plant key={i} bloomed={bloomed || 0} index={i} total={totalNeeded || 24} />
        ))}
      </div>

      {/* Bloom progress */}
      <div className="px-6 pb-2">
        <div className="w-full h-2 bg-green-900 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${bloomPct * 100}%`, background: '#A8D8A8' }}
          />
        </div>
        <div className="text-center text-xs text-green-300 mt-1">
          {bloomed || 0} / {totalNeeded || 24} bloomed
        </div>
      </div>

      {/* Center beat indicator */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        {phase === 'waiting' ? (
          <div className="text-green-200 text-center">
            <div className="text-4xl mb-3">🌱</div>
            <div className="text-sm">Get ready to water your garden…</div>
          </div>
        ) : (
          <BeatPulse nextBeatAt={nextBeatAt} beatIntervalMs={beatIntervalMs} active={playing} />
        )}
        <div className="text-green-300/60 text-xs">
          Tap together within {syncWindowMs || 200}ms
        </div>
      </div>

      {/* Tap zones — split left/right */}
      <div className="grid grid-cols-2 gap-3 px-4 pb-6" style={{ height: 140 }}>
        <TapButton
          label={isP1 ? 'Your side' : 'Left garden'}
          onTap={isP1 ? handleTap : () => {}}
          color="#A8D8A8"
        />
        <TapButton
          label={isP1 ? 'Right garden' : 'Your side'}
          onTap={isP1 ? () => {} : handleTap}
          color="#F6E596"
        />
      </div>
    </div>
  )
}
