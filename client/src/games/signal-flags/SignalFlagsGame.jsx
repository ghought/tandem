import React, { useState, useCallback } from 'react'
import { useGame } from '../../context/GameContext.jsx'
import { useGameState } from '../../hooks/useGameState.js'

// ─── Flag color config ────────────────────────────────────────────────────────

const FLAG_CONFIG = {
  red:    { bg: '#D94F3D', text: 'white', emoji: '🚩' },
  blue:   { bg: '#3D7BC4', text: 'white', emoji: '🔵' },
  yellow: { bg: '#D4AC35', text: 'white', emoji: '🟡' },
  green:  { bg: '#4A9E6B', text: 'white', emoji: '🟢' },
  orange: { bg: '#E8873A', text: 'white', emoji: '🟠' },
  purple: { bg: '#9B72C4', text: 'white', emoji: '🟣' },
  white:  { bg: '#F5F5F5', text: '#333',  emoji: '⬜' },
  black:  { bg: '#2C2C2C', text: 'white', emoji: '⬛' },
}

// ─── Timer bar ────────────────────────────────────────────────────────────────

function TimerBar({ timeLeft, duration }) {
  const pct   = Math.max(0, Math.min(1, timeLeft / duration))
  const color = pct > 0.5 ? '#023E8A' : pct > 0.25 ? '#E8873A' : '#D94F3D'
  return (
    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.1)' }}>
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${pct * 100}%`, background: color }}
      />
    </div>
  )
}

// ─── P1 (Describer) view ──────────────────────────────────────────────────────

function DescriberView({ sequence, currentIndex, raised, sendInput }) {
  const handleHint = useCallback(() => {
    sendInput('hint', {})
  }, [sendInput])

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-amber-50 rounded-2xl p-4 border-2 border-amber-200">
        <div className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-3">
          Your Secret Sequence
        </div>
        <div className="flex gap-2 flex-wrap">
          {(sequence || []).map((color, i) => {
            const cfg    = FLAG_CONFIG[color] || { bg: '#999', text: 'white' }
            const isNext = i === currentIndex
            const isDone = i < (raised || []).length
            return (
              <div
                key={i}
                className="flex flex-col items-center gap-1"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold transition-all"
                  style={{
                    background: isDone ? '#ddd' : cfg.bg,
                    opacity: isDone ? 0.5 : 1,
                    border: isNext ? '3px solid #F4C842' : '2px solid rgba(0,0,0,0.1)',
                    boxShadow: isNext ? '0 0 10px rgba(244,200,66,0.7)' : 'none',
                    transform: isNext ? 'scale(1.1)' : 'scale(1)',
                  }}
                >
                  {isDone ? '✓' : color.charAt(0).toUpperCase()}
                </div>
                <div className="text-xs font-body text-gray-500 capitalize">{color}</div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
        <div className="text-sm font-handwriting text-blue-800 text-center">
          Describe the flag colors to your partner in order!
        </div>
        {currentIndex != null && currentIndex < (sequence || []).length && (
          <div className="mt-2 text-center">
            <div className="text-xs text-blue-600 font-body">Next to describe:</div>
            <div className="font-handwriting text-lg font-bold text-blue-800 capitalize">
              {(sequence || [])[currentIndex]}
            </div>
          </div>
        )}
      </div>

      <button
        onClick={handleHint}
        className="w-full py-2.5 rounded-xl font-handwriting text-white text-sm shadow active:scale-95 transition-transform"
        style={{ background: '#023E8A' }}
      >
        Send Hint 💡
      </button>
    </div>
  )
}

// ─── P2 (Adjuster) view ────────────────────────────────────────────────────────

function AdjusterView({ availableColors, raised, currentIndex, seqLength, sendInput }) {
  const [selected, setSelected] = useState(null)

  const handleSelect = useCallback((color) => {
    setSelected(color)
  }, [])

  const handleSubmit = useCallback(() => {
    if (!selected) return
    sendInput('selectFlag', { color: selected })
    setSelected(null)
  }, [selected, sendInput])

  return (
    <div className="flex flex-col gap-4">
      {/* Progress */}
      <div className="flex items-center gap-2">
        <div className="font-body text-xs text-gray-500 shrink-0">Flags raised:</div>
        <div className="flex gap-1.5">
          {Array.from({ length: seqLength || 4 }).map((_, i) => {
            const raiseColor = (raised || [])[i]
            const cfg = raiseColor ? FLAG_CONFIG[raiseColor] : null
            return (
              <div
                key={i}
                className="w-8 h-8 rounded-lg border-2 flex items-center justify-center text-xs font-bold"
                style={{
                  background: cfg ? cfg.bg : 'rgba(0,0,0,0.05)',
                  borderColor: cfg ? 'transparent' : 'rgba(0,0,0,0.15)',
                  color: cfg ? cfg.text : 'rgba(0,0,0,0.3)',
                }}
              >
                {cfg ? raiseColor.charAt(0).toUpperCase() : i + 1}
              </div>
            )
          })}
        </div>
      </div>

      {/* Flag grid */}
      <div>
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Choose a Flag</div>
        <div className="grid grid-cols-4 gap-2">
          {(availableColors || []).map(color => {
            const cfg  = FLAG_CONFIG[color] || { bg: '#999', text: 'white' }
            const isSel = selected === color
            return (
              <button
                key={color}
                onClick={() => handleSelect(color)}
                className="flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all active:scale-95"
                style={{
                  background: isSel ? cfg.bg : `${cfg.bg}20`,
                  borderColor: isSel ? cfg.bg : 'rgba(0,0,0,0.12)',
                  boxShadow: isSel ? `0 0 12px ${cfg.bg}88` : 'none',
                }}
              >
                <div
                  className="w-8 h-8 rounded-lg"
                  style={{ background: cfg.bg, border: `2px solid ${isSel ? 'white' : 'transparent'}` }}
                />
                <div className="text-xs font-body capitalize" style={{ color: isSel ? cfg.bg : '#555' }}>
                  {color}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <button
        disabled={!selected}
        onClick={handleSubmit}
        className="w-full py-3 rounded-xl font-handwriting text-lg shadow-md transition-all active:scale-95"
        style={{
          background: selected ? '#023E8A' : '#ccc',
          color: 'white',
          cursor: selected ? 'pointer' : 'not-allowed',
        }}
      >
        {selected ? `Raise ${selected.charAt(0).toUpperCase() + selected.slice(1)} Flag!` : 'Select a flag…'}
      </button>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function SignalFlagsGame() {
  const { myRole } = useGame()
  const { gameState, sendInput } = useGameState()

  const isP1 = myRole === 'player1'  // P1 = describer
  const gs   = gameState || {}
  const { phase, round, totalRounds, timeLeft, roundDuration, totalScore,
          sequence, raised, currentIndex, availableColors, seqLength } = gs

  const handleNextRound = useCallback(() => {
    sendInput('nextRound', {})
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
        <div className="text-5xl">🚩</div>
        <div className="font-handwriting text-3xl font-bold text-paper-card-dark text-center">Signals Complete!</div>
        <div className="font-handwriting text-xl text-paper-card-dark/70">Final Score: {totalScore || 0}</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-paper-cream overflow-hidden select-none">
      {/* Header */}
      <div className="px-5 pt-5 pb-3" style={{ background: '#03045E' }}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-xs text-white/50 font-body">Round {round || 1} of {totalRounds || 3}</div>
            <div className="font-handwriting text-xl font-bold text-white">Signal Flags</div>
          </div>
          <div className="text-right">
            <div className="font-handwriting text-xl font-bold text-cyan-300">{timeLeft || 0}s</div>
            <div className="font-handwriting text-sm text-white/60">{totalScore || 0} pts</div>
          </div>
        </div>
        <TimerBar timeLeft={timeLeft || 0} duration={roundDuration || 90} />
      </div>

      {/* Role badge */}
      <div className="px-4 py-2 text-center" style={{ background: 'rgba(2,62,138,0.12)' }}>
        <div className="font-handwriting text-sm text-blue-800">
          {isP1 ? 'You describe the flags 🗣️' : 'You raise the flags 🚩'}
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {phase === 'reveal' ? (
          <div className="flex flex-col items-center gap-4">
            <div className="font-handwriting text-xl font-bold text-paper-card-dark text-center">Round Result!</div>
            <div className="flex gap-2">
              {(sequence || []).map((color, i) => {
                const raisedColor = (raised || [])[i]
                const correct     = raisedColor === color
                const cfg         = FLAG_CONFIG[color] || { bg: '#999', text: 'white' }
                return (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                      style={{ background: cfg.bg, border: `3px solid ${correct ? '#4A9E6B' : '#D94F3D'}` }}
                    >
                      {correct ? '✓' : '✗'}
                    </div>
                    <div className="text-xs font-body text-gray-500 capitalize">{color}</div>
                  </div>
                )
              })}
            </div>
            <button
              onClick={handleNextRound}
              className="px-6 py-2 rounded-full font-handwriting text-white text-sm active:scale-95 transition-transform"
              style={{ background: '#023E8A' }}
            >
              Next Round →
            </button>
          </div>
        ) : isP1 ? (
          <DescriberView
            sequence={sequence}
            currentIndex={currentIndex}
            raised={raised}
            sendInput={sendInput}
          />
        ) : (
          <AdjusterView
            availableColors={availableColors}
            raised={raised}
            currentIndex={currentIndex}
            seqLength={seqLength}
            sendInput={sendInput}
          />
        )}
      </div>
    </div>
  )
}
