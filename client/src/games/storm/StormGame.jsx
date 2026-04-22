import React, { useState, useCallback, useRef } from 'react'
import { useGame } from '../../context/GameContext.jsx'
import { useGameState } from '../../hooks/useGameState.js'

// ─── Mini map ─────────────────────────────────────────────────────────────────

function MiniMap({ boat, rocks, harbor, worldSize, harborRadius }) {
  const W    = 160
  const H    = 160
  const s    = W / (worldSize || 400)
  const bx   = (boat && boat.x || 0) * s
  const by   = (boat && boat.y || 0) * s
  const hx   = (harbor && harbor.x || 380) * s
  const hy   = (harbor && harbor.y || 60) * s
  const hr   = (harborRadius || 30) * s

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="rounded-xl"
      style={{ background: '#03045E', border: '1px solid rgba(0,119,182,0.4)' }}>
      {/* Harbor */}
      <circle cx={hx} cy={hy} r={hr} fill="rgba(255,220,80,0.2)" stroke="#F4C842" strokeWidth="1.5" />
      <text x={hx} y={hy + 3} textAnchor="middle" fontSize="10" fill="#F4C842">⚓</text>

      {/* Rocks */}
      {(rocks || []).map((r, i) => (
        <circle key={i} cx={r.x * s} cy={r.y * s} r={8} fill="rgba(200,100,50,0.4)" stroke="#E8873A" strokeWidth="1" />
      ))}

      {/* Wind arrow (simplified) */}
      {/* Boat */}
      <circle cx={bx} cy={by} r={5} fill="#C77DFF" />
      <circle cx={bx} cy={by} r={5} fill="none" stroke="white" strokeWidth="1.5" />

      {/* Heading indicator */}
      {boat && (
        <line
          x1={bx}
          y1={by}
          x2={bx + Math.cos((boat.heading * Math.PI) / 180) * 10}
          y2={by - Math.sin((boat.heading * Math.PI) / 180) * 10}
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      )}
    </svg>
  )
}

// ─── Sail slider (P1) ─────────────────────────────────────────────────────────

function SailControl({ sailAngle, onSailChange }) {
  const [local, setLocal] = useState(sailAngle || 45)

  const handleChange = useCallback((e) => {
    const v = parseInt(e.target.value, 10)
    setLocal(v)
    onSailChange(v)
  }, [onSailChange])

  // Sync from server if changed externally
  React.useEffect(() => {
    if (sailAngle != null) setLocal(sailAngle)
  }, [sailAngle])

  const sailRad = (local * Math.PI) / 180
  const sailLen = 60
  const cx = 50, cy = 80
  const x2 = cx + Math.sin(sailRad) * sailLen
  const y2 = cy - Math.cos(sailRad) * sailLen

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Sail visualiser */}
      <svg width="100" height="100" viewBox="0 0 100 100">
        {/* Mast */}
        <line x1="50" y1="20" x2="50" y2="90" stroke="rgba(0,0,0,0.3)" strokeWidth="3" strokeLinecap="round" />
        {/* Sail */}
        <line x1={cx} y1={cy} x2={x2} y2={y2} stroke="#023E8A" strokeWidth="4" strokeLinecap="round" />
        <circle cx={x2} cy={y2} r="4" fill="#0077B6" />
        {/* Boat hull */}
        <ellipse cx="50" cy="92" rx="18" ry="6" fill="#0077B6" opacity="0.5" />
      </svg>

      <div className="font-handwriting text-paper-card-dark font-bold text-lg">{local}°</div>

      <input
        type="range"
        min="0"
        max="180"
        value={local}
        onChange={handleChange}
        className="w-full h-3 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(90deg, #023E8A ${local / 1.8}%, rgba(0,0,0,0.1) ${local / 1.8}%)`,
          WebkitAppearance: 'none',
        }}
      />
      <div className="flex justify-between w-full font-body text-xs text-paper-card-dark/50">
        <span>0°</span>
        <span>Sail Angle</span>
        <span>180°</span>
      </div>
    </div>
  )
}

// ─── Rudder slider (P2) ───────────────────────────────────────────────────────

function RudderControl({ rudderPos, onRudderChange }) {
  const [local, setLocal] = useState(rudderPos != null ? Math.round(rudderPos * 100) : 0)

  const handleChange = useCallback((e) => {
    const v = parseInt(e.target.value, 10)
    setLocal(v)
    onRudderChange(v / 100)
  }, [onRudderChange])

  React.useEffect(() => {
    if (rudderPos != null) setLocal(Math.round(rudderPos * 100))
  }, [rudderPos])

  const rudderAngle = (local / 100) * 35  // max 35 degrees

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Rudder visualiser */}
      <svg width="120" height="80" viewBox="0 0 120 80">
        {/* Hull */}
        <ellipse cx="60" cy="30" rx="45" ry="18" fill="#0077B6" opacity="0.3" stroke="#0077B6" strokeWidth="2" />
        {/* Rudder */}
        <line
          x1="60" y1="30"
          x2={60 + Math.sin((rudderAngle * Math.PI) / 180) * 35}
          y2={30 + Math.cos((rudderAngle * Math.PI) / 180) * 35}
          stroke="#023E8A"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <text x="60" y="72" textAnchor="middle" fontSize="10" fill="rgba(0,0,0,0.5)">
          {local > 5 ? 'Right →' : local < -5 ? '← Left' : 'Straight'}
        </text>
      </svg>

      <input
        type="range"
        min="-100"
        max="100"
        value={local}
        onChange={handleChange}
        className="w-full h-3 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(90deg, rgba(0,0,0,0.1) 50%, #023E8A ${50 + local / 2}%, rgba(0,0,0,0.1) ${50 + local / 2}%)`,
          WebkitAppearance: 'none',
        }}
      />
      <div className="flex justify-between w-full font-body text-xs text-paper-card-dark/50">
        <span>← Left</span>
        <span>Rudder</span>
        <span>Right →</span>
      </div>
    </div>
  )
}

// ─── Status panel (shared) ────────────────────────────────────────────────────

function StatusPanel({ boat, windAngle, rockHits, maxRockHits, timeLeft }) {
  const compassLabels = ['E', 'NE', 'N', 'NW', 'W', 'SW', 'S', 'SE']
  const compassDir    = compassLabels[Math.round(((boat && boat.heading || 0) % 360) / 45) % 8]
  return (
    <div
      className="rounded-2xl p-3 flex items-center justify-between gap-3"
      style={{ background: 'rgba(2,62,138,0.12)', border: '1px solid rgba(0,119,182,0.2)' }}
    >
      <div className="flex flex-col items-center">
        <div className="font-body text-xs text-gray-500">Heading</div>
        <div className="font-handwriting text-lg font-bold text-paper-card-dark">{compassDir}</div>
        <div className="font-body text-xs text-gray-400">{boat && Math.round(boat.heading || 0)}°</div>
      </div>
      <div className="flex flex-col items-center">
        <div className="font-body text-xs text-gray-500">Speed</div>
        <div className="font-handwriting text-lg font-bold text-paper-card-dark">
          {boat && (boat.speed || 0).toFixed(1)}
        </div>
      </div>
      <div className="flex flex-col items-center">
        <div className="font-body text-xs text-gray-500">Wind</div>
        <div className="font-handwriting text-lg font-bold text-paper-card-dark">{windAngle || 0}°</div>
      </div>
      <div className="flex flex-col items-center">
        <div className="font-body text-xs text-gray-500">Hits</div>
        <div className="flex gap-0.5">
          {Array.from({ length: maxRockHits || 3 }).map((_, i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-full"
              style={{ background: i < (rockHits || 0) ? '#D94F3D' : 'rgba(0,0,0,0.15)' }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function StormGame() {
  const { myRole } = useGame()
  const { gameState, sendInput } = useGameState()

  const isP1 = myRole === 'player1'  // P1 = sail
  const gs   = gameState || {}
  const { boat, sailAngle, rudderPos, windAngle, rocks, harbor, harborRadius,
          worldSize, rockHits, maxRockHits, timeLeft, duration, phase } = gs

  const handleSailChange = useCallback((angle) => {
    sendInput('sail', { angle })
  }, [sendInput])

  const handleRudderChange = useCallback((position) => {
    sendInput('rudder', { position })
  }, [sendInput])

  const timePct = duration ? Math.max(0, Math.min(1, (timeLeft || 0) / duration)) : 1
  const timerColor = timePct > 0.5 ? '#0077B6' : timePct > 0.25 ? '#E8873A' : '#D94F3D'

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
        <div className="text-5xl">⚓</div>
        <div className="font-handwriting text-3xl font-bold text-white text-center">Harbor Reached!</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-paper-cream overflow-hidden select-none">
      {/* Header */}
      <div className="px-5 pt-5 pb-2" style={{ background: '#03045E' }}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="font-handwriting text-xl font-bold text-white">The Storm</div>
            <div className="text-xs text-white/50 font-body">
              {isP1 ? 'You control the Sail' : 'You control the Rudder'}
            </div>
          </div>
          <div className="text-right">
            <div className="font-handwriting text-xl font-bold text-cyan-300">{timeLeft || 0}s</div>
          </div>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${timePct * 100}%`, background: timerColor }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
        {/* Mini map */}
        <div className="flex justify-center">
          <MiniMap
            boat={boat}
            rocks={rocks}
            harbor={harbor}
            harborRadius={harborRadius}
            worldSize={worldSize}
          />
        </div>

        {/* Status */}
        <StatusPanel
          boat={boat}
          windAngle={windAngle}
          rockHits={rockHits}
          maxRockHits={maxRockHits}
          timeLeft={timeLeft}
        />

        {/* Controls */}
        <div
          className="rounded-2xl p-4"
          style={{ background: 'rgba(2,62,138,0.08)', border: '1px solid rgba(0,119,182,0.15)' }}
        >
          {isP1 ? (
            <>
              <div className="font-handwriting text-sm font-bold text-paper-card-dark mb-3 text-center">
                Sail Angle — adjust to catch the wind
              </div>
              <SailControl sailAngle={sailAngle} onSailChange={handleSailChange} />
            </>
          ) : (
            <>
              <div className="font-handwriting text-sm font-bold text-paper-card-dark mb-3 text-center">
                Rudder — steer around rocks
              </div>
              <RudderControl rudderPos={rudderPos} onRudderChange={handleRudderChange} />
            </>
          )}
        </div>

        {/* Tip */}
        <div className="text-center">
          <div className="font-handwriting text-xs text-paper-card-dark/50">
            {isP1
              ? `Wind is at ${windAngle || 0}° — adjust sail to maximize speed`
              : 'Coordinate with your partner — they control speed, you control direction'}
          </div>
        </div>
      </div>
    </div>
  )
}
