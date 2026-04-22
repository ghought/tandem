import React, { useState, useCallback } from 'react'
import { useGame } from '../../context/GameContext.jsx'
import { useGameState } from '../../hooks/useGameState.js'

const COLUMNS = 3
const COL_LABELS = ['◆', '●', '▲']
const COL_COLORS = ['#C77DFF', '#E87CA0', '#F4C842']

// ─── Note lane for one player ─────────────────────────────────────────────────

function NoteLane({ notes, onTap, accuracy, hits, label, playerLabel }) {
  const [flashCols, setFlashCols] = useState({})

  const handleTap = useCallback((col) => {
    onTap(col)
    setFlashCols(prev => ({ ...prev, [col]: true }))
    setTimeout(() => setFlashCols(prev => ({ ...prev, [col]: false })), 120)
  }, [onTap])

  return (
    <div className="flex flex-col h-full">
      {/* Stats */}
      <div className="flex items-center justify-between px-3 py-2" style={{ background: '#1A0027' }}>
        <div className="font-handwriting text-sm text-white/70">{playerLabel}</div>
        <div className="font-handwriting text-sm font-bold text-purple-300">{accuracy}%</div>
      </div>

      {/* Lane area */}
      <div
        className="relative flex-1"
        style={{ background: 'linear-gradient(180deg, #0D0020 0%, #1A003A 100%)' }}
      >
        {/* Column dividers */}
        <div className="absolute inset-0 flex">
          {Array.from({ length: COLUMNS }).map((_, c) => (
            <div key={c} className="flex-1 border-r border-white/5 last:border-r-0" />
          ))}
        </div>

        {/* Hit line */}
        <div
          className="absolute left-0 right-0 h-px"
          style={{ bottom: '48px', background: 'rgba(255,255,255,0.3)' }}
        />

        {/* Notes */}
        {(notes || []).map(note => {
          const bottom = note.progress * (100) - 2  // % from bottom of lane
          const isNear = note.progress > 0.88 && note.progress < 1.12
          const colW   = 100 / COLUMNS
          const leftPct = note.column * colW + colW * 0.15
          const widthPct = colW * 0.7
          return (
            <div
              key={note.id}
              className="absolute rounded-md transition-none"
              style={{
                bottom:  `${Math.max(-4, Math.min(100, bottom))}%`,
                left:    `${leftPct}%`,
                width:   `${widthPct}%`,
                height:  '24px',
                background: note.hit === true
                  ? 'rgba(100,255,130,0.7)'
                  : isNear
                    ? COL_COLORS[note.column]
                    : `${COL_COLORS[note.column]}88`,
                boxShadow: isNear ? `0 0 10px ${COL_COLORS[note.column]}` : 'none',
                opacity: note.hit === true ? 0.3 : 1,
              }}
            />
          )
        })}
      </div>

      {/* Tap buttons */}
      <div className="flex" style={{ background: '#110025' }}>
        {Array.from({ length: COLUMNS }).map((_, c) => (
          <button
            key={c}
            onPointerDown={() => handleTap(c)}
            className="flex-1 flex items-center justify-center py-3 text-xl font-bold transition-all active:scale-95 border-r border-white/10 last:border-r-0"
            style={{
              color: COL_COLORS[c],
              background: flashCols[c]
                ? `${COL_COLORS[c]}40`
                : 'transparent',
            }}
          >
            {COL_LABELS[c]}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function DuetGame() {
  const { myRole } = useGame()
  const { gameState, sendInput } = useGameState()

  const isP1 = myRole === 'player1'
  const gs   = gameState || {}
  const { p1Notes, p2Notes, p1Accuracy, p2Accuracy, p1Hits, p2Hits,
          simultaneousHits, duration, elapsed } = gs

  const handleTap = useCallback((col) => {
    sendInput('tap', { column: col, timestamp: Date.now() })
  }, [sendInput])

  const timeLeft = duration && elapsed != null ? Math.max(0, duration - elapsed) : null

  if (!gameState) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: '#0D0020' }}>
        <div className="font-handwriting text-xl text-white/60">Loading…</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden select-none" style={{ background: '#0D0020' }}>
      {/* Header */}
      <div
        className="px-5 pt-4 pb-3 flex items-center justify-between"
        style={{ background: 'rgba(106,5,114,0.5)', borderBottom: '1px solid rgba(199,125,255,0.2)' }}
      >
        <div>
          <div className="font-handwriting text-lg font-bold text-white">The Duet</div>
          <div className="text-xs text-white/50 font-body">
            {isP1 ? 'Treble — right hand' : 'Bass — left hand'}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="font-handwriting text-xl font-bold text-purple-300">
            {timeLeft !== null ? `${timeLeft}s` : '…'}
          </div>
          <div className="text-xs text-white/50 font-body">
            {simultaneousHits || 0} duet moments ✨
          </div>
        </div>
      </div>

      {/* Combined accuracy bar */}
      <div className="px-4 py-2 flex items-center gap-3" style={{ background: 'rgba(0,0,0,0.3)' }}>
        <div className="font-body text-xs text-white/40 shrink-0">P1</div>
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${p1Accuracy || 0}%`, background: '#C77DFF' }}
          />
        </div>
        <div className="font-body text-xs text-white/40 shrink-0">P2</div>
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${p2Accuracy || 0}%`, background: '#E87CA0' }}
          />
        </div>
      </div>

      {/* Note lane */}
      <div className="flex-1 overflow-hidden">
        {isP1
          ? <NoteLane
              notes={p1Notes || []}
              onTap={handleTap}
              accuracy={p1Accuracy || 0}
              hits={p1Hits || 0}
              playerLabel="You — Treble ♪"
            />
          : <NoteLane
              notes={p2Notes || []}
              onTap={handleTap}
              accuracy={p2Accuracy || 0}
              hits={p2Hits || 0}
              playerLabel="You — Bass ♩"
            />
        }
      </div>
    </div>
  )
}
