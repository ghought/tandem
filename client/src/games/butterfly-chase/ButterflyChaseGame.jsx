import React, { useRef, useEffect, useCallback, useState } from 'react'
import { useGame } from '../../context/GameContext.jsx'
import { useGameState } from '../../hooks/useGameState.js'

// ─── Butterfly SVG ────────────────────────────────────────────────────────────

function Butterfly({ x, y, color, scared, caught, size = 36 }) {
  if (caught) return null
  return (
    <g
      transform={`translate(${x - size / 2}, ${y - size / 2})`}
      style={{ transition: scared ? 'none' : 'transform 0.05s linear' }}
    >
      {/* Wings */}
      <ellipse cx={size * 0.3}  cy={size * 0.45} rx={size * 0.28} ry={size * 0.22} fill={color} opacity={scared ? 0.5 : 0.85} />
      <ellipse cx={size * 0.7}  cy={size * 0.45} rx={size * 0.28} ry={size * 0.22} fill={color} opacity={scared ? 0.5 : 0.85} />
      <ellipse cx={size * 0.28} cy={size * 0.62} rx={size * 0.18} ry={size * 0.14} fill={color} opacity={scared ? 0.4 : 0.7} />
      <ellipse cx={size * 0.72} cy={size * 0.62} rx={size * 0.18} ry={size * 0.14} fill={color} opacity={scared ? 0.4 : 0.7} />
      {/* Body */}
      <ellipse cx={size * 0.5} cy={size * 0.5} rx={size * 0.06} ry={size * 0.22} fill="#5c3d11" />
      {/* Antennae */}
      <line x1={size * 0.5} y1={size * 0.3} x2={size * 0.38} y2={size * 0.1} stroke="#5c3d11" strokeWidth="1.5" />
      <line x1={size * 0.5} y1={size * 0.3} x2={size * 0.62} y2={size * 0.1} stroke="#5c3d11" strokeWidth="1.5" />
      <circle cx={size * 0.37} cy={size * 0.08} r="2" fill="#5c3d11" />
      <circle cx={size * 0.63} cy={size * 0.08} r="2" fill="#5c3d11" />
    </g>
  )
}

// ─── Catch ripple ─────────────────────────────────────────────────────────────

function TapRipple({ x, y, color }) {
  return (
    <circle
      cx={x} cy={y} r="20"
      fill="none"
      stroke={color}
      strokeWidth="2"
      opacity="0.6"
      style={{ animation: 'rippleOut 0.4s ease-out forwards' }}
    />
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ButterflyChaseGame() {
  const { myRole } = useGame()
  const { gameState, sendInput } = useGameState()

  const [ripples, setRipples] = useState([])  // { id, x, y }
  const svgRef = useRef(null)
  const rippleId = useRef(0)

  const isP1 = myRole === 'player1'
  const playerNum = isP1 ? 1 : 2

  // Colors: P1 sees pink/rose, P2 sees blue/indigo
  const myColor      = isP1 ? '#e84393' : '#5b6ef5'
  const myColorLight = isP1 ? '#fce4f0' : '#e0e3ff'

  const myButterflies  = isP1 ? (gameState?.butterflies1 || []) : (gameState?.butterflies2 || [])
  const myCaught       = isP1 ? (gameState?.caught1 || 0) : (gameState?.caught2 || 0)
  const needed         = gameState?.needed || 5

  const handleTap = useCallback((e) => {
    const svg = svgRef.current
    if (!svg) return

    const rect = svg.getBoundingClientRect()
    const px = e.touches ? e.touches[0].clientX : e.clientX
    const py = e.touches ? e.touches[0].clientY : e.clientY

    const nx = (px - rect.left) / rect.width
    const ny = (py - rect.top)  / rect.height

    sendInput('tap', { x: nx, y: ny })

    // Add ripple at SVG coords
    const sx = (px - rect.left)
    const sy = (py - rect.top)
    const id = ++rippleId.current
    setRipples(prev => [...prev, { id, x: sx, y: sy }])
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 450)
  }, [sendInput])

  if (!gameState) {
    return (
      <div className="flex items-center justify-center h-full bg-amber-50">
        <div className="text-amber-700 font-semibold">Loading meadow…</div>
      </div>
    )
  }

  const svgW = 360
  const svgH = 580

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-sky-100 to-green-100 select-none overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ background: myColor }}>
        <div className="text-white font-bold text-sm">
          {isP1 ? 'Your butterflies: Pink' : 'Your butterflies: Blue'}
        </div>
        <div className="flex items-center gap-2">
          {Array.from({ length: needed }).map((_, i) => (
            <div
              key={i}
              className="w-5 h-5 rounded-full border-2 border-white transition-all"
              style={{ background: i < myCaught ? 'white' : 'transparent' }}
            />
          ))}
        </div>
        <div className="text-white font-bold">{myCaught}/{needed}</div>
      </div>

      {/* Role hint */}
      <div className="px-4 py-1.5 text-center text-xs text-stone-600 bg-amber-50/80">
        Tap your butterflies to catch them! Your partner's taps scare them away.
      </div>

      {/* SVG field */}
      <div className="flex-1 relative overflow-hidden">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="w-full h-full"
          onTouchStart={handleTap}
          onClick={handleTap}
          style={{ touchAction: 'none', cursor: 'crosshair' }}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Meadow background */}
          <rect width={svgW} height={svgH} fill="url(#meadow)" />
          <defs>
            <linearGradient id="meadow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#bfe9ff" />
              <stop offset="55%" stopColor="#d4f5b8" />
              <stop offset="100%" stopColor="#a8e07a" />
            </linearGradient>
          </defs>

          {/* Butterflies */}
          {myButterflies.map(b => (
            <Butterfly
              key={b.id}
              x={b.x * svgW}
              y={b.y * svgH}
              color={myColor}
              scared={b.scared}
              caught={b.caught}
            />
          ))}

          {/* Tap ripples */}
          {ripples.map(r => (
            <TapRipple key={r.id} x={r.x} y={r.y} color={myColor} />
          ))}
        </svg>

        {/* Scare zone indicators from server */}
        {(gameState.scareZones || [])
          .filter(z => z.owner !== playerNum)
          .map((z, i) => (
            <div
              key={i}
              className="absolute w-12 h-12 rounded-full pointer-events-none"
              style={{
                left: `${z.x * 100}%`,
                top:  `${z.y * 100}%`,
                transform: 'translate(-50%, -50%)',
                background: `radial-gradient(circle, rgba(255,100,100,0.25) 0%, transparent 70%)`,
              }}
            />
          ))
        }
      </div>

      {/* CSS for ripple */}
      <style>{`
        @keyframes rippleOut {
          from { r: 8; opacity: 0.7; }
          to   { r: 40; opacity: 0; }
        }
      `}</style>
    </div>
  )
}
