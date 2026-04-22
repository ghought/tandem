import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useGame } from '../../context/GameContext.jsx'
import { useGameState } from '../../hooks/useGameState.js'

// ─── BPM metronome visualiser ─────────────────────────────────────────────────

function BpmMeter({ bpm, minBpm = 60, maxBpm = 180 }) {
  const pct = (bpm - minBpm) / (maxBpm - minBpm)
  const color = pct < 0.33 ? '#4A9E6B' : pct < 0.66 ? '#E8873A' : '#D94F3D'
  return (
    <div className="w-full flex flex-col items-center gap-1">
      <div className="font-handwriting text-5xl font-bold" style={{ color }}>
        {bpm}
      </div>
      <div className="font-body text-xs text-paper-card-dark/50">BPM</div>
      <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.1)' }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct * 100}%`, background: color }}
        />
      </div>
      <div className="flex justify-between w-full text-xs font-body text-paper-card-dark/40">
        <span>{minBpm}</span>
        <span>{maxBpm}</span>
      </div>
    </div>
  )
}

// ─── Note lane (musician view) ────────────────────────────────────────────────

function NoteLane({ notes, onTap, accuracy }) {
  const [tapFlash, setTapFlash] = useState(false)

  const handleTap = useCallback(() => {
    onTap()
    setTapFlash(true)
    setTimeout(() => setTapFlash(false), 100)
  }, [onTap])

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Lane */}
      <div
        className="w-full relative overflow-hidden rounded-2xl"
        style={{ height: '220px', background: '#0D0020' }}
      >
        {/* Hit line */}
        <div
          className="absolute left-0 right-0 h-1 rounded-full"
          style={{ bottom: '40px', background: 'rgba(199,125,255,0.6)' }}
        />

        {/* Notes */}
        {(notes || []).map(note => {
          const bottom = note.progress * 220 - 16
          const isNearLine = note.progress > 0.85 && note.progress < 1.15
          return (
            <div
              key={note.id}
              className="absolute left-1/2 -translate-x-1/2 w-14 h-8 rounded-full transition-none"
              style={{
                bottom: `${Math.max(-8, Math.min(220, bottom))}px`,
                background: note.hit === true
                  ? 'rgba(100,255,150,0.9)'
                  : isNearLine
                    ? '#C77DFF'
                    : '#6A0572',
                boxShadow: isNearLine ? '0 0 12px rgba(199,125,255,0.8)' : 'none',
                opacity: note.hit === true ? 0.4 : 1,
              }}
            />
          )
        })}
      </div>

      {/* Tap button */}
      <button
        onPointerDown={handleTap}
        className="w-36 h-16 rounded-2xl font-handwriting text-lg text-white shadow-lg active:scale-95 transition-transform"
        style={{
          background: tapFlash
            ? 'linear-gradient(135deg, #C77DFF, #6A0572)'
            : 'linear-gradient(135deg, #8B30B5, #3D0057)',
          boxShadow: tapFlash ? '0 0 25px rgba(199,125,255,0.8)' : '0 4px 20px rgba(0,0,0,0.4)',
        }}
      >
        TAP
      </button>

      {/* Accuracy */}
      <div className="font-handwriting text-2xl text-paper-card-dark font-bold">
        {accuracy}% accuracy
      </div>
    </div>
  )
}

// ─── Conductor baton view ─────────────────────────────────────────────────────

function ConductorView({ bpm, minBpm, maxBpm, onTap }) {
  const [tapFlash, setTapFlash]     = useState(false)
  const [beatAnim, setBeatAnim]     = useState(false)
  const beatRef = useRef(null)

  const handleTap = useCallback(() => {
    onTap()
    setTapFlash(true)
    setBeatAnim(true)
    setTimeout(() => setTapFlash(false), 150)
    setTimeout(() => setBeatAnim(false), 300)
  }, [onTap])

  // Auto beat pulse to guide tap timing
  useEffect(() => {
    if (!bpm) return
    const ms = 60000 / bpm
    clearInterval(beatRef.current)
    beatRef.current = setInterval(() => setBeatAnim(a => !a), ms / 2)
    return () => clearInterval(beatRef.current)
  }, [bpm])

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      <BpmMeter bpm={bpm || 90} minBpm={minBpm} maxBpm={maxBpm} />

      <div className="font-handwriting text-sm text-paper-card-dark/60 text-center">
        Tap to set the tempo — faster taps = faster music
      </div>

      {/* Baton button */}
      <button
        onPointerDown={handleTap}
        className="w-40 h-40 rounded-full flex flex-col items-center justify-center gap-2 shadow-2xl active:scale-90 transition-transform"
        style={{
          background: tapFlash
            ? 'radial-gradient(circle, #F9E4FF, #C77DFF)'
            : 'radial-gradient(circle, #9B40D4, #4D0080)',
          boxShadow: tapFlash ? '0 0 40px rgba(199,125,255,0.9)' : '0 8px 30px rgba(0,0,0,0.4)',
        }}
      >
        <span style={{ fontSize: '40px' }}>🎼</span>
        <span className="font-handwriting text-white text-sm font-bold">BEAT</span>
      </button>

      {/* Beat pulse indicator */}
      <div
        className="w-4 h-4 rounded-full transition-all duration-100"
        style={{
          background: beatAnim ? '#C77DFF' : 'rgba(199,125,255,0.2)',
          boxShadow: beatAnim ? '0 0 12px rgba(199,125,255,0.8)' : 'none',
        }}
      />
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function ConductorGame() {
  const { myRole } = useGame()
  const { gameState, sendInput } = useGameState()

  const isP1 = myRole === 'player1'   // P1 = conductor
  const gs   = gameState || {}
  const { bpm, minBpm, maxBpm, notes, p2Notes, hits, misses, accuracy,
          duration, elapsed } = gs

  const handleTap = useCallback(() => {
    sendInput('tap', { timestamp: Date.now() })
  }, [sendInput])

  const timeLeft = duration && elapsed != null ? Math.max(0, duration - elapsed) : null

  if (!gameState) {
    return (
      <div className="flex items-center justify-center h-full bg-paper-cream">
        <div className="font-handwriting text-xl text-paper-card-dark/60">Loading…</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-paper-cream overflow-hidden select-none">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between" style={{ background: '#1A0027' }}>
        <div>
          <div className="font-handwriting text-xl font-bold text-white">Conductor</div>
          <div className="text-xs text-white/50 font-body">
            {isP1 ? 'You: Conductor 🎼' : 'You: Musician 🎵'}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="font-handwriting text-xl font-bold text-purple-300">
            {timeLeft !== null ? `${timeLeft}s` : '…'}
          </div>
          {!isP1 && (
            <div className="text-xs text-white/50 font-body">{hits || 0} hits · {misses || 0} miss</div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4 overflow-hidden">
        {isP1
          ? <ConductorView bpm={bpm} minBpm={minBpm} maxBpm={maxBpm} onTap={handleTap} />
          : <NoteLane notes={notes || p2Notes || []} onTap={handleTap} accuracy={accuracy || 0} />
        }
      </div>

      {/* Shared BPM footer for musician */}
      {!isP1 && (
        <div className="px-6 pb-4 text-center">
          <div className="font-handwriting text-sm text-paper-card-dark/60">
            Current tempo: <span className="font-bold text-paper-card-dark">{bpm || 90} BPM</span>
          </div>
        </div>
      )}
    </div>
  )
}
