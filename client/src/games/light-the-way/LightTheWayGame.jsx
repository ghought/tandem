import React, { useCallback } from 'react'
import { useGame } from '../../context/GameContext.jsx'
import { useGameState } from '../../hooks/useGameState.js'

const GRID_SIZE = 8

// ─── P1 view: dark grid, only nearby cells revealed ───────────────────────────

function DarkGrid({ playerPos, visibleCells, gridSize, exit }) {
  const [pc, pr] = playerPos || [0, 7]
  const visSet   = new Set((visibleCells || []).map(([c, r]) => `${c},${r}`))
  const [ec, er] = exit || [7, 0]

  return (
    <div className="flex flex-col gap-0.5">
      {Array.from({ length: gridSize }).map((_, row) => (
        <div key={row} className="flex gap-0.5">
          {Array.from({ length: gridSize }).map((_, col) => {
            const isPlayer  = col === pc && row === pr
            const isExit    = col === ec && row === er
            const isVisible = visSet.has(`${col},${row}`)
            return (
              <div
                key={col}
                className="rounded-sm flex items-center justify-center text-xs"
                style={{
                  width: '36px',
                  height: '36px',
                  background: isPlayer
                    ? '#C77DFF'
                    : isExit && isVisible
                      ? 'rgba(255,220,80,0.6)'
                      : isVisible
                        ? 'rgba(255,255,255,0.12)'
                        : 'rgba(0,0,0,0.7)',
                  border: isPlayer
                    ? '2px solid #E9BBFF'
                    : isVisible
                      ? '1px solid rgba(255,255,255,0.15)'
                      : '1px solid rgba(255,255,255,0.04)',
                  boxShadow: isPlayer ? '0 0 12px rgba(199,125,255,0.8)' : 'none',
                }}
              >
                {isPlayer ? '◉' : isExit && isVisible ? '⚡' : ''}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ─── P2 view: full map ─────────────────────────────────────────────────────────

function FullMap({ playerPos, safePath, hazards, exit, gridSize }) {
  const [pc, pr]  = playerPos || [0, 7]
  const [ec, er]  = exit || [7, 0]
  const safeSet   = new Set((safePath || []).map(([c, r]) => `${c},${r}`))
  const hazardSet = new Set((hazards || []).map(([c, r]) => `${c},${r}`))

  return (
    <div className="flex flex-col gap-0.5">
      {Array.from({ length: gridSize }).map((_, row) => (
        <div key={row} className="flex gap-0.5">
          {Array.from({ length: gridSize }).map((_, col) => {
            const isPlayer  = col === pc && row === pr
            const isExit    = col === ec && row === er
            const isSafe    = safeSet.has(`${col},${row}`)
            const isHazard  = hazardSet.has(`${col},${row}`)
            return (
              <div
                key={col}
                className="rounded-sm flex items-center justify-center text-xs"
                style={{
                  width: '36px',
                  height: '36px',
                  background: isPlayer
                    ? '#C77DFF'
                    : isExit
                      ? 'rgba(255,220,80,0.8)'
                      : isSafe
                        ? 'rgba(100,200,120,0.3)'
                        : isHazard
                          ? 'rgba(220,60,60,0.2)'
                          : 'rgba(0,0,0,0.4)',
                  border: isPlayer
                    ? '2px solid #E9BBFF'
                    : isSafe
                      ? '1px solid rgba(100,200,120,0.4)'
                      : '1px solid rgba(255,255,255,0.08)',
                  boxShadow: isPlayer ? '0 0 10px rgba(199,125,255,0.8)' : 'none',
                  fontSize: '14px',
                }}
              >
                {isPlayer ? '◉' : isExit ? '⚡' : isHazard ? '×' : ''}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ─── D-pad ────────────────────────────────────────────────────────────────────

function DPad({ onDirection }) {
  const btn = (dir, label) => (
    <button
      onPointerDown={() => onDirection(dir)}
      className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold text-white shadow-md active:scale-90 transition-transform"
      style={{ background: 'rgba(106,5,114,0.7)', border: '1px solid rgba(199,125,255,0.4)' }}
    >
      {label}
    </button>
  )

  return (
    <div className="flex flex-col items-center gap-1.5">
      {btn('up', '↑')}
      <div className="flex gap-1.5">
        {btn('left', '←')}
        <div className="w-14 h-14" />
        {btn('right', '→')}
      </div>
      {btn('down', '↓')}
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function LightTheWayGame() {
  const { myRole } = useGame()
  const { gameState, sendInput } = useGameState()

  const isP1 = myRole === 'player1'   // P1 = lost in dark
  const gs   = gameState || {}
  const { playerPos, visibleCells, safePath, hazards, exit, gridSize,
          timeLeft, duration, hazardHits, maxHazards, phase } = gs

  const handleDirection = useCallback((dir) => {
    sendInput('move', { direction: dir })
  }, [sendInput])

  if (!gameState) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: '#03045E' }}>
        <div className="font-handwriting text-xl text-white/60">Loading…</div>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-5 px-8" style={{ background: '#03045E' }}>
        <div className="text-5xl">⚡</div>
        <div className="font-handwriting text-3xl font-bold text-white text-center">Beacon Reached!</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden select-none" style={{ background: '#03045E' }}>
      {/* Header */}
      <div
        className="px-5 pt-5 pb-3 flex items-center justify-between"
        style={{ background: 'rgba(2,62,138,0.8)', borderBottom: '1px solid rgba(0,119,182,0.4)' }}
      >
        <div>
          <div className="font-handwriting text-xl font-bold text-white">Light the Way</div>
          <div className="text-xs text-white/50 font-body">
            {isP1 ? 'Follow your partner\'s directions' : 'Guide your partner to the beacon ⚡'}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="font-handwriting text-xl font-bold text-cyan-300">{timeLeft || 0}s</div>
          <div className="flex gap-1">
            {Array.from({ length: maxHazards || 3 }).map((_, i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-full"
                style={{ background: i < (hazardHits || 0) ? '#E85050' : 'rgba(255,255,255,0.2)' }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4 overflow-hidden">
        {isP1 ? (
          <>
            <div className="font-handwriting text-sm text-white/60 text-center">
              You're in the dark — listen to your partner!
            </div>
            <div className="overflow-auto">
              <DarkGrid
                playerPos={playerPos}
                visibleCells={visibleCells}
                gridSize={gridSize || GRID_SIZE}
                exit={exit}
              />
            </div>
          </>
        ) : (
          <>
            <div className="font-handwriting text-sm text-white/60 text-center">
              You see the map — guide them with the buttons below!
            </div>
            <div className="overflow-auto">
              <FullMap
                playerPos={playerPos}
                safePath={safePath}
                hazards={hazards}
                exit={exit}
                gridSize={gridSize || GRID_SIZE}
              />
            </div>
            <DPad onDirection={handleDirection} />
          </>
        )}
      </div>

      {/* Legend */}
      <div className="px-5 pb-4 flex justify-center gap-4">
        {!isP1 && (
          <>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ background: 'rgba(100,200,120,0.5)' }} />
              <span className="font-body text-xs text-white/50">Safe path</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ background: 'rgba(220,60,60,0.4)' }} />
              <span className="font-body text-xs text-white/50">Hazard</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ background: 'rgba(255,220,80,0.8)' }} />
              <span className="font-body text-xs text-white/50">Beacon</span>
            </div>
          </>
        )}
        {isP1 && (
          <div className="font-handwriting text-sm text-white/50 text-center">
            ◉ = you · ⚡ = goal
          </div>
        )}
      </div>
    </div>
  )
}
