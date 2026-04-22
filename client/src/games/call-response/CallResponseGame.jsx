import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useGame } from '../../context/GameContext.jsx'
import { useGameState } from '../../hooks/useGameState.js'

// ─── Beat visualiser: shows dots for taps ────────────────────────────────────

function BeatDots({ count, max = 8, color = '#6A0572' }) {
  return (
    <div className="flex gap-2 justify-center flex-wrap">
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          className="w-5 h-5 rounded-full border-2 transition-all duration-150"
          style={{
            background: i < count ? color : 'transparent',
            borderColor: i < count ? color : 'rgba(106,5,114,0.3)',
            transform: i < count ? 'scale(1.15)' : 'scale(1)',
          }}
        />
      ))}
    </div>
  )
}

// ─── Pattern playback visualiser ─────────────────────────────────────────────

function PatternVisualiser({ pattern, label, color }) {
  if (!pattern || pattern.length === 0) return null
  return (
    <div className="flex flex-col gap-1 items-center">
      {label && <div className="text-xs text-paper-card-dark/60 font-handwriting">{label}</div>}
      <div className="flex gap-1 items-end h-8">
        {pattern.map((v, i) => (
          <div
            key={i}
            className="w-3 rounded-sm transition-all"
            style={{ height: `${Math.max(8, (v / 100) * 32 + 8)}px`, background: color || '#6A0572' }}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Timer ring ──────────────────────────────────────────────────────────────

function PhaseTimer({ timeLeft, maxTime, color }) {
  const pct = Math.max(0, Math.min(1, timeLeft / maxTime))
  const r   = 28
  const circ = 2 * Math.PI * r
  return (
    <svg width="70" height="70" viewBox="0 0 70 70">
      <circle cx="35" cy="35" r={r} fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="5" />
      <circle
        cx="35" cy="35" r={r}
        fill="none"
        stroke={color || '#6A0572'}
        strokeWidth="5"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round"
        transform="rotate(-90 35 35)"
        style={{ transition: 'stroke-dashoffset 0.2s linear' }}
      />
      <text x="35" y="40" textAnchor="middle" fontSize="14" fontWeight="bold" fill={color || '#6A0572'}>
        {Math.ceil(timeLeft)}
      </text>
    </svg>
  )
}

// ─── Main game component ──────────────────────────────────────────────────────

export default function CallResponseGame() {
  const { myRole } = useGame()
  const { gameState, sendInput } = useGameState()

  const [tapFlash, setTapFlash]     = useState(false)
  const [lastPhase, setLastPhase]   = useState(null)
  const [showReveal, setShowReveal] = useState(null)
  const [playbackTick, setPlaybackTick] = useState(0)
  const playbackRef = useRef(null)

  const isP1 = myRole === 'player1'
  const gs   = gameState || {}
  const { phase, round, totalRounds, phaseTimer, p1TapCount, p2TapCount,
          p1Pattern, p2Pattern, totalScore } = gs

  // Detect phase changes
  useEffect(() => {
    if (!phase) return
    if (phase !== lastPhase) {
      setLastPhase(phase)
      if (phase === 'playback' && p1Pattern && p1Pattern.length > 0) {
        // Animate playback dots
        let i = 0
        clearInterval(playbackRef.current)
        playbackRef.current = setInterval(() => {
          setPlaybackTick(i)
          i++
          if (i >= p1Pattern.length) clearInterval(playbackRef.current)
        }, 300)
      }
    }
  }, [phase, lastPhase, p1Pattern])

  useEffect(() => () => clearInterval(playbackRef.current), [])

  const handleTap = useCallback(() => {
    sendInput('tap', { timestamp: Date.now() })
    setTapFlash(true)
    setTimeout(() => setTapFlash(false), 120)
  }, [sendInput])

  const handleDone = useCallback(() => {
    sendInput('done', {})
  }, [sendInput])

  if (!gameState) {
    return (
      <div className="flex items-center justify-center h-full bg-paper-cream">
        <div className="font-handwriting text-xl text-paper-card-dark/60">Loading…</div>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-paper-cream gap-5 px-8">
        <div className="font-handwriting text-5xl">🎵</div>
        <div className="font-handwriting text-3xl font-bold text-paper-card-dark text-center">Call &amp; Response Complete!</div>
        <div className="font-handwriting text-xl text-paper-card-dark/70">Score: {totalScore}</div>
      </div>
    )
  }

  const phaseMaxTime = phase === 'recording' ? 8 : phase === 'echoing' ? 10 : phase === 'playback' ? 3 : 3

  return (
    <div className="flex flex-col h-full bg-paper-cream select-none overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between" style={{ background: '#1A0027' }}>
        <div>
          <div className="text-xs text-white/50 font-body">Round {round || 1} of {totalRounds || 3}</div>
          <div className="font-handwriting text-xl font-bold text-white">Call &amp; Response</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="text-xs text-white/50 font-body">Score</div>
          <div className="font-handwriting text-xl font-bold text-purple-300">{totalScore || 0}</div>
        </div>
      </div>

      {/* Phase badge */}
      <div className="flex justify-center py-2" style={{ background: '#1A0027' }}>
        <div className="font-handwriting px-4 py-1 rounded-full text-sm text-white"
          style={{ background: 'rgba(199,125,255,0.25)', border: '1px solid rgba(199,125,255,0.4)' }}>
          {phase === 'recording' && (isP1 ? 'Your Turn — Tap a Rhythm!' : 'Listen — partner is creating a pattern…')}
          {phase === 'playback'  && 'Watch the pattern…'}
          {phase === 'echoing'   && (isP1 ? 'Waiting for partner to echo…' : 'Echo it back!')}
          {phase === 'reveal'    && 'Result!'}
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">

        {/* Timer */}
        {(phase === 'recording' || phase === 'echoing' || phase === 'playback') && (
          <PhaseTimer timeLeft={phaseTimer || 0} maxTime={phaseMaxTime} color="#C77DFF" />
        )}

        {/* P1 recording phase */}
        {phase === 'recording' && isP1 && (
          <div className="flex flex-col items-center gap-4 w-full">
            <BeatDots count={p1TapCount || 0} color="#C77DFF" />
            <button
              onPointerDown={handleTap}
              className="w-48 h-48 rounded-full flex items-center justify-center text-6xl shadow-2xl active:scale-95 transition-transform"
              style={{
                background: tapFlash
                  ? 'radial-gradient(circle, #C77DFF, #6A0572)'
                  : 'radial-gradient(circle, #8B30B5, #3D0057)',
                boxShadow: tapFlash ? '0 0 40px rgba(199,125,255,0.7)' : '0 8px 30px rgba(0,0,0,0.4)',
              }}
            >
              🎵
            </button>
            <div className="font-handwriting text-paper-card-dark/70 text-sm text-center">
              Tap your rhythm (2–8 taps), then press Done
            </div>
            {(p1TapCount || 0) >= 2 && (
              <button
                onClick={handleDone}
                className="px-6 py-2 rounded-full font-handwriting text-white text-sm"
                style={{ background: '#6A0572' }}
              >
                Done ✓
              </button>
            )}
          </div>
        )}

        {/* P1 waiting while P2 echoes */}
        {phase === 'echoing' && isP1 && (
          <div className="flex flex-col items-center gap-4">
            <div className="text-5xl animate-pulse">👂</div>
            <div className="font-handwriting text-paper-card-dark/70 text-center">
              Waiting for partner to echo your rhythm…
            </div>
            <PatternVisualiser pattern={p1Pattern} label="Your pattern" color="#C77DFF" />
          </div>
        )}

        {/* P2 waiting during recording */}
        {phase === 'recording' && !isP1 && (
          <div className="flex flex-col items-center gap-4">
            <div className="text-5xl animate-pulse">🎶</div>
            <div className="font-handwriting text-paper-card-dark/70 text-center">
              Your partner is tapping a rhythm…
            </div>
            <BeatDots count={p1TapCount || 0} color="#C77DFF" />
          </div>
        )}

        {/* Playback phase — both players see the pattern animation */}
        {phase === 'playback' && (
          <div className="flex flex-col items-center gap-4 w-full">
            <div className="font-handwriting text-paper-card-dark text-center text-lg">
              {isP1 ? 'Your pattern:' : 'Remember this pattern:'}
            </div>
            <div className="flex gap-3 justify-center flex-wrap">
              {(p1Pattern || []).map((v, i) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded-full transition-all duration-200"
                  style={{
                    background: i <= playbackTick ? '#C77DFF' : 'rgba(199,125,255,0.2)',
                    transform: i === playbackTick ? 'scale(1.5)' : 'scale(1)',
                    boxShadow: i === playbackTick ? '0 0 12px #C77DFF' : 'none',
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* P2 echoing phase */}
        {phase === 'echoing' && !isP1 && (
          <div className="flex flex-col items-center gap-4 w-full">
            <PatternVisualiser pattern={p1Pattern} label="Pattern to echo" color="rgba(199,125,255,0.5)" />
            <BeatDots count={p2TapCount || 0} color="#E87CA0" />
            <button
              onPointerDown={handleTap}
              className="w-44 h-44 rounded-full flex items-center justify-center text-5xl shadow-2xl active:scale-95 transition-transform"
              style={{
                background: tapFlash
                  ? 'radial-gradient(circle, #F4A8C4, #B54070)'
                  : 'radial-gradient(circle, #C45080, #6B1A35)',
                boxShadow: tapFlash ? '0 0 35px rgba(232,124,160,0.7)' : '0 8px 30px rgba(0,0,0,0.4)',
              }}
            >
              🎵
            </button>
            <div className="font-handwriting text-paper-card-dark/70 text-sm text-center">
              Echo the rhythm, then press Done
            </div>
            {(p2TapCount || 0) >= 2 && (
              <button
                onClick={handleDone}
                className="px-6 py-2 rounded-full font-handwriting text-white text-sm"
                style={{ background: '#B54070' }}
              >
                Done ✓
              </button>
            )}
          </div>
        )}

        {/* Reveal */}
        {phase === 'reveal' && (
          <div className="flex flex-col items-center gap-4 w-full">
            <div className="font-handwriting text-xl font-bold text-paper-card-dark">Round Result</div>
            <div className="flex gap-6 items-end justify-center w-full">
              <PatternVisualiser pattern={p1Pattern} label="Original" color="#C77DFF" />
              <PatternVisualiser pattern={p2Pattern} label="Echo" color="#E87CA0" />
            </div>
          </div>
        )}
      </div>

      {/* Role indicator */}
      <div className="px-5 pb-5 pt-2 text-center">
        <div className="inline-block px-3 py-1 rounded-full font-handwriting text-xs"
          style={{ background: 'rgba(106,5,114,0.1)', color: '#6A0572' }}>
          {isP1 ? 'You are the Caller 🎵' : 'You are the Echo 🎶'}
        </div>
      </div>
    </div>
  )
}
