import React, { useCallback } from 'react'
import { useGame } from '../../context/GameContext.jsx'
import { useGameState } from '../../hooks/useGameState.js'

// ─── Creature config ──────────────────────────────────────────────────────────

const CREATURE_CONFIG = {
  crab:     { emoji: '🦀', color: '#D94F3D' },
  starfish: { emoji: '⭐', color: '#D4AC35' },
  urchin:   { emoji: '🌵', color: '#9B72C4' },
  shell:    { emoji: '🐚', color: '#E8873A' },
  fish:     { emoji: '🐟', color: '#3D7BC4' },
}

// ─── Creature grid ────────────────────────────────────────────────────────────

function CreatureGrid({ cells, heldCreature, onHold, gridCols = 3 }) {
  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}
    >
      {(cells || []).map((cell) => {
        const cfg     = CREATURE_CONFIG[cell.creature] || { emoji: '?', color: '#999' }
        const isHeld  = cell.held
        const isDone  = cell.matched

        return (
          <button
            key={cell.index}
            disabled={isDone}
            onClick={() => !isDone && onHold(cell.index)}
            className="flex flex-col items-center justify-center gap-1 rounded-2xl py-3 transition-all active:scale-90"
            style={{
              background: isDone
                ? 'rgba(100,200,120,0.15)'
                : isHeld
                  ? `${cfg.color}30`
                  : 'rgba(255,255,255,0.5)',
              border: isDone
                ? '2px solid rgba(100,200,120,0.4)'
                : isHeld
                  ? `2px solid ${cfg.color}`
                  : '2px solid rgba(0,0,0,0.08)',
              boxShadow: isHeld ? `0 0 10px ${cfg.color}66` : 'none',
              opacity: isDone ? 0.4 : 1,
            }}
          >
            <span style={{ fontSize: '28px', filter: isDone ? 'grayscale(1)' : 'none' }}>
              {isDone ? '✓' : cfg.emoji}
            </span>
            <span className="font-handwriting text-xs capitalize" style={{ color: isDone ? '#999' : cfg.color }}>
              {isDone ? 'matched' : cell.creature}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Held banner ─────────────────────────────────────────────────────────────

function HeldBanner({ p1HeldCreature, p2HeldCreature, isP1 }) {
  const myHeld  = isP1 ? p1HeldCreature : p2HeldCreature
  const theirHeld = isP1 ? p2HeldCreature : p1HeldCreature
  const myCfg   = myHeld ? CREATURE_CONFIG[myHeld] : null
  const theirCfg = theirHeld ? CREATURE_CONFIG[theirHeld] : null

  return (
    <div
      className="rounded-2xl px-4 py-3 flex items-center justify-between"
      style={{ background: 'rgba(2,62,138,0.08)', border: '1px solid rgba(0,119,182,0.2)' }}
    >
      <div className="flex items-center gap-2">
        <span className="text-2xl">{myCfg ? myCfg.emoji : '🤲'}</span>
        <div className="flex flex-col">
          <div className="font-body text-xs text-gray-500">You hold</div>
          <div className="font-handwriting text-sm font-bold capitalize" style={{ color: myCfg ? myCfg.color : '#999' }}>
            {myHeld || 'nothing'}
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center">
        <div className="font-body text-xs text-gray-400">vs</div>
      </div>
      <div className="flex items-center gap-2 flex-row-reverse">
        <span className="text-2xl">{theirCfg ? theirCfg.emoji : '🤲'}</span>
        <div className="flex flex-col items-end">
          <div className="font-body text-xs text-gray-500">Partner holds</div>
          <div className="font-handwriting text-sm font-bold capitalize" style={{ color: theirCfg ? theirCfg.color : '#999' }}>
            {theirHeld || 'nothing'}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function TidePoolsGame() {
  const { myRole } = useGame()
  const { gameState, sendInput } = useGameState()

  const isP1 = myRole === 'player1'
  const gs   = gameState || {}
  const { p1Grid, p2Grid, p1HeldCreature, p2HeldCreature, matchCount,
          winMatches, timeLeft, duration, phase, gridCols } = gs

  const myGrid = isP1 ? (p1Grid || []) : (p2Grid || [])

  const handleHold = useCallback((index) => {
    sendInput('hold', { index })
  }, [sendInput])

  const timePct = duration ? Math.max(0, Math.min(1, (timeLeft || 0) / duration)) : 1
  const timerColor = timePct > 0.5 ? '#0077B6' : timePct > 0.25 ? '#E8873A' : '#D94F3D'

  if (!gameState) {
    return (
      <div className="flex items-center justify-center h-full bg-paper-cream">
        <div className="font-handwriting text-xl text-paper-card-dark/60">Loading…</div>
      </div>
    )
  }

  if (phase === 'done' || matchCount >= (winMatches || 5)) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-paper-cream gap-5 px-8">
        <div className="text-6xl">🦀</div>
        <div className="font-handwriting text-3xl font-bold text-paper-card-dark text-center">
          Tide Pool Complete!
        </div>
        <div className="font-handwriting text-xl text-paper-card-dark/70">{matchCount || 0} matches made</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-paper-cream overflow-hidden select-none">
      {/* Header */}
      <div className="px-5 pt-5 pb-2" style={{ background: '#03045E' }}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="font-handwriting text-xl font-bold text-white">Tide Pools</div>
            <div className="text-xs text-white/50 font-body">
              {isP1 ? 'Your left pools' : 'Your right pools'}
            </div>
          </div>
          <div className="text-right flex flex-col gap-1">
            <div className="font-handwriting text-xl font-bold text-cyan-300">{timeLeft || 0}s</div>
            <div className="font-handwriting text-sm font-bold text-white">
              {matchCount || 0} / {winMatches || 5} matches
            </div>
          </div>
        </div>
        {/* Timer bar */}
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${timePct * 100}%`, background: timerColor }}
          />
        </div>
      </div>

      {/* Match progress dots */}
      <div className="px-4 py-2 flex justify-center gap-1.5" style={{ background: 'rgba(0,119,182,0.1)' }}>
        {Array.from({ length: winMatches || 5 }).map((_, i) => (
          <div
            key={i}
            className="w-4 h-4 rounded-full transition-all"
            style={{
              background: i < (matchCount || 0) ? '#4A9E6B' : 'rgba(0,0,0,0.12)',
              transform: i === (matchCount || 0) ? 'scale(1.2)' : 'scale(1)',
            }}
          />
        ))}
      </div>

      {/* Held banner */}
      <div className="px-4 pt-3">
        <HeldBanner
          p1HeldCreature={p1HeldCreature}
          p2HeldCreature={p2HeldCreature}
          isP1={isP1}
        />
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="font-handwriting text-sm text-paper-card-dark/70 mb-2 text-center">
          Tap a creature to hold it up — match what your partner holds!
        </div>
        <CreatureGrid
          cells={myGrid}
          heldCreature={isP1 ? p1HeldCreature : p2HeldCreature}
          onHold={handleHold}
          gridCols={gridCols || 3}
        />
      </div>
    </div>
  )
}
