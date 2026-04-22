import React, { useRef, useState, useCallback, useEffect } from 'react'
import { useGame } from '../../context/GameContext.jsx'
import { useGameState } from '../../hooks/useGameState.js'

// ─── Circle-gesture detector ──────────────────────────────────────────────────
// Tracks pointer movement and detects CW vs CCW circles, plus rough speed.

function useCircleGesture(onStir) {
  const points = useRef([])
  const active = useRef(false)

  const handlePointerDown = useCallback((e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    active.current = true
    points.current = [{ x: e.clientX, y: e.clientY, t: Date.now() }]
  }, [])

  const handlePointerMove = useCallback((e) => {
    if (!active.current) return
    points.current.push({ x: e.clientX, y: e.clientY, t: Date.now() })
    // Keep last 20 points
    if (points.current.length > 20) points.current.shift()

    if (points.current.length >= 6) {
      const pts = points.current
      // Compute signed area (shoelace) → positive = CCW, negative = CW (screen coords)
      let area = 0
      for (let i = 0; i < pts.length - 1; i++) {
        area += (pts[i].x * pts[i + 1].y) - (pts[i + 1].x * pts[i].y)
      }
      const dir = area > 0 ? 'ccw' : 'cw'

      // Speed: average distance between consecutive points per ms
      let dist = 0
      let dt   = 0
      for (let i = 1; i < pts.length; i++) {
        const dx = pts[i].x - pts[i - 1].x
        const dy = pts[i].y - pts[i - 1].y
        dist += Math.sqrt(dx * dx + dy * dy)
        dt   += pts[i].t - pts[i - 1].t
      }
      const speed = dt > 0 ? Math.min(100, Math.round((dist / dt) * 100)) : 0

      onStir(dir, speed)
    }
  }, [onStir])

  const handlePointerUp = useCallback(() => {
    active.current = false
    points.current = []
  }, [])

  return { handlePointerDown, handlePointerMove, handlePointerUp }
}

// ─── Soup pot ─────────────────────────────────────────────────────────────────

function SoupPot({ soupColor, syncScore }) {
  const r = soupColor ? soupColor[0] : 120
  const g = soupColor ? soupColor[1] : 110
  const b = soupColor ? soupColor[2] : 105
  const col = `rgb(${r},${g},${b})`

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Pot body */}
      <div
        className="rounded-b-[50%] rounded-t-lg relative overflow-hidden transition-all duration-500"
        style={{
          width: 120, height: 100,
          background: '#5C4033',
          boxShadow: `inset 0 -6px 16px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.4)`,
        }}
      >
        {/* Liquid */}
        <div
          className="absolute bottom-0 left-0 right-0 rounded-b-[50%] transition-all duration-500"
          style={{
            height: '65%',
            background: col,
            boxShadow: `0 0 ${syncScore / 3}px ${col}`,
          }}
        />
        {/* Steam bubbles */}
        {syncScore > 40 && (
          <div className="absolute inset-0 flex items-end justify-center gap-2 pb-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-white/30 animate-bounce"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        )}
      </div>
      {/* Handles */}
      <div className="flex items-center justify-between" style={{ width: 144 }}>
        <div className="w-5 h-5 rounded-full border-4 border-stone-600" style={{ marginTop: -60 }} />
        <div className="w-5 h-5 rounded-full border-4 border-stone-600" style={{ marginTop: -60 }} />
      </div>
      {/* Sync label */}
      <div
        className="text-xs font-bold mt-1 transition-all"
        style={{ color: col }}
      >
        {syncScore}% sync
      </div>
    </div>
  )
}

// ─── Stir zone (half-screen for each player) ──────────────────────────────────

function StirZone({ label, dir, speed, onStir, color }) {
  const { handlePointerDown, handlePointerMove, handlePointerUp } = useCircleGesture(onStir)

  return (
    <div
      className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 cursor-grab active:cursor-grabbing select-none"
      style={{
        flex: 1,
        borderColor: color,
        background: `${color}11`,
        touchAction: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <div className="text-2xl">🥄</div>
      <div className="text-xs font-semibold" style={{ color }}>
        {label}
      </div>
      <div className="text-xs text-gray-500">
        {dir ? `${dir === 'cw' ? '↻ CW' : '↺ CCW'} · ${speed}%` : 'Draw circles to stir'}
      </div>
    </div>
  )
}

// ─── Sync meter ───────────────────────────────────────────────────────────────

function SyncMeter({ syncScore }) {
  const color = syncScore > 70 ? '#D94F3D' : syncScore > 40 ? '#E8873A' : '#AAA'
  return (
    <div className="flex items-center gap-2 px-4">
      <div className="text-xs font-semibold text-gray-600 w-12">Sync</div>
      <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${syncScore}%`, background: color }}
        />
      </div>
      <div className="text-xs font-bold w-10 text-right" style={{ color }}>
        {syncScore}%
      </div>
    </div>
  )
}

// ─── Root ──────────────────────────────────────────────────────────────────────

export default function StirGame() {
  const { myRole } = useGame()
  const { gameState, sendInput } = useGameState()

  const [myDir,   setMyDir]   = useState(null)
  const [mySpeed, setMySpeed] = useState(0)

  const isP1 = myRole === 'player1'

  const handleStir = useCallback((dir, speed) => {
    setMyDir(dir)
    setMySpeed(speed)
    sendInput('stir', { direction: dir, speed })
  }, [sendInput])

  if (!gameState) {
    return (
      <div className="flex items-center justify-center h-full bg-stone-50">
        <div className="text-stone-600 font-semibold">Heating up the pot…</div>
      </div>
    )
  }

  const { stirP1, stirP2, syncScore, soupColor, timeLeft, duration, phase } = gameState

  if (phase === 'done') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-stone-50 gap-4 px-8">
        <div className="text-6xl">🍲</div>
        <div className="text-2xl font-bold text-stone-800">Soup's Done!</div>
        <div className="text-stone-600">Sync: {syncScore}%</div>
      </div>
    )
  }

  const ptrInfo = isP1
    ? { myStir: { dir: myDir, speed: mySpeed }, partnerStir: stirP2 }
    : { myStir: { dir: myDir, speed: mySpeed }, partnerStir: stirP1 }

  const timePct = duration > 0 ? (timeLeft / duration) * 100 : 0

  return (
    <div className="flex flex-col h-full overflow-hidden bg-stone-50">
      {/* Timer */}
      <div className="px-4 pt-4 pb-1">
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs font-semibold text-stone-600">Time</div>
          <div className="text-sm font-bold text-stone-800 tabular-nums">{Math.ceil(timeLeft || 0)}s</div>
        </div>
        <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
          <div className="h-full bg-amber-500 rounded-full transition-all duration-500"
            style={{ width: `${timePct}%` }} />
        </div>
      </div>

      {/* Sync meter */}
      <div className="py-2">
        <SyncMeter syncScore={syncScore || 0} />
      </div>

      {/* Central pot */}
      <div className="flex justify-center py-2">
        <SoupPot soupColor={soupColor} syncScore={syncScore || 0} />
      </div>

      {/* Direction legend */}
      <div className="flex justify-center gap-8 text-xs text-gray-400 pb-1">
        <div>↺ CCW = counter-clockwise</div>
        <div>↻ CW = clockwise</div>
      </div>

      {/* Stir zones */}
      <div className="flex-1 grid grid-cols-2 gap-3 px-4 pb-4">
        <StirZone
          label={isP1 ? 'You (left)' : 'Partner (left)'}
          dir={isP1 ? myDir : stirP1?.dir}
          speed={isP1 ? mySpeed : stirP1?.speed}
          onStir={isP1 ? handleStir : undefined}
          color="#B5651D"
        />
        <StirZone
          label={isP1 ? 'Partner (right)' : 'You (right)'}
          dir={isP1 ? stirP2?.dir : myDir}
          speed={isP1 ? stirP2?.speed : mySpeed}
          onStir={isP1 ? undefined : handleStir}
          color="#CD7F32"
        />
      </div>
    </div>
  )
}
