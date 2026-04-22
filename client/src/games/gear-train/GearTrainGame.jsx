import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useGame } from '../../context/GameContext.jsx'
import { useGameState } from '../../hooks/useGameState.js'

// ─── Gear SVG ─────────────────────────────────────────────────────────────────

function GearSVG({ spinning, rpm, size = 120, color = '#B5651D' }) {
  const rotRef  = useRef(0)
  const animRef = useRef(null)
  const lastRef = useRef(null)
  const svgRef  = useRef(null)

  useEffect(() => {
    const animate = (ts) => {
      if (lastRef.current === null) lastRef.current = ts
      const dt = (ts - lastRef.current) / 1000
      lastRef.current = ts

      // deg/sec from rpm: rpm * 360 / 60
      const speed = (rpm || 0) * 6
      rotRef.current = (rotRef.current + speed * dt) % 360

      if (svgRef.current) {
        svgRef.current.style.transform = `rotate(${rotRef.current.toFixed(1)}deg)`
      }
      animRef.current = requestAnimationFrame(animate)
    }
    animRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animRef.current)
  }, [rpm])

  // Build gear teeth path
  const teeth  = 8
  const R      = size / 2
  const rInner = R * 0.65
  const rTooth = R * 0.88
  const cx     = R
  const cy     = R

  let d = ''
  for (let i = 0; i < teeth; i++) {
    const a0 = (i / teeth) * Math.PI * 2 - Math.PI / (teeth * 2)
    const a1 = a0 + Math.PI / (teeth * 2)
    const a2 = a1 + Math.PI / teeth
    const a3 = a2 + Math.PI / (teeth * 2)

    const pts = [
      [cx + rInner * Math.cos(a0), cy + rInner * Math.sin(a0)],
      [cx + rTooth * Math.cos(a1), cy + rTooth * Math.sin(a1)],
      [cx + rTooth * Math.cos(a2), cy + rTooth * Math.sin(a2)],
      [cx + rInner * Math.cos(a3), cy + rInner * Math.sin(a3)],
    ]

    d += i === 0
      ? `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)} `
      : `L ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)} `
    pts.slice(1).forEach(([x, y]) => { d += `L ${x.toFixed(1)} ${y.toFixed(1)} ` })
  }
  d += 'Z'

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ willChange: 'transform', display: 'block' }}
    >
      <path d={d} fill={color} opacity="0.9" />
      <circle cx={cx} cy={cy} r={R * 0.22} fill="#2C1810" />
      <circle cx={cx} cy={cy} r={R * 0.09} fill={color} />
    </svg>
  )
}

// ─── RPM Gauge (P2 view) ──────────────────────────────────────────────────────

function RPMGauge({ currentRPM, targetRPM, direction }) {
  const maxRPM = 160
  const pct    = Math.min(1, (currentRPM || 0) / maxRPM)
  const tPct   = Math.min(1, (targetRPM  || 0) / maxRPM)

  const gaugeColor =
    direction === 'hold'   ? '#44CC44' :
    direction === 'faster' ? '#FFAA00' : '#FF5555'

  const arrow = direction === 'faster' ? '▲ FASTER' :
                direction === 'slower' ? '▼ SLOWER' : '● HOLD'

  return (
    <div className="flex flex-col items-center gap-3 w-full px-6">
      {/* Numeric display */}
      <div className="flex items-end gap-2">
        <span className="font-handwriting text-5xl font-bold text-amber-900 tabular-nums leading-none">
          {Math.round(currentRPM || 0)}
        </span>
        <span className="font-body text-sm text-amber-700/60 mb-1">RPM</span>
      </div>

      {/* Bar gauge */}
      <div className="w-full relative">
        <div className="w-full h-5 rounded-full bg-amber-200 border-2 border-amber-400 overflow-hidden relative">
          {/* Target marker */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-amber-900/70 z-10"
            style={{ left: `${tPct * 100}%`, transform: 'translateX(-50%)' }}
          />
          {/* Current fill */}
          <div
            className="h-full rounded-full transition-all duration-150"
            style={{ width: `${pct * 100}%`, background: gaugeColor }}
          />
        </div>
        {/* Labels */}
        <div className="flex justify-between text-xs text-amber-700/60 font-body mt-1 px-1">
          <span>0</span>
          <span>Target: {targetRPM}</span>
          <span>{maxRPM}</span>
        </div>
      </div>

      {/* Direction hint */}
      <div
        className="font-handwriting text-2xl font-bold transition-all duration-200 py-2 px-6 rounded-xl border-2"
        style={{
          color:            gaugeColor,
          borderColor:      gaugeColor,
          backgroundColor:  gaugeColor + '22',
        }}
      >
        {arrow}
      </div>
    </div>
  )
}

// ─── Hold progress bar ────────────────────────────────────────────────────────

function HoldBar({ progress }) {
  return (
    <div className="w-full px-6">
      <div className="text-xs font-body text-amber-700/60 mb-1 text-center">
        Hold steady — {Math.round(progress * 5)}s / 5s
      </div>
      <div className="w-full h-4 rounded-full bg-amber-200 border-2 border-amber-400 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${Math.round(progress * 100)}%`,
            background: 'linear-gradient(90deg, #44CC44, #22AA22)',
          }}
        />
      </div>
    </div>
  )
}

// ─── Timer strip ─────────────────────────────────────────────────────────────

function TimerStrip({ timeLeft, duration }) {
  const pct = Math.max(0, Math.min(100, (timeLeft / duration) * 100))
  const color = pct > 50 ? '#B5651D' : pct > 25 ? '#E8873A' : '#D94F3D'
  return (
    <div className="w-full px-4">
      <div className="flex justify-between text-xs font-body text-amber-700/60 mb-1">
        <span>Time</span>
        <span>{timeLeft}s</span>
      </div>
      <div className="w-full h-2 rounded-full bg-amber-200 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

// ─── P1 View — tap the gear ───────────────────────────────────────────────────

function P1View({ gameState, sendInput }) {
  const [tapFlash, setTapFlash] = useState(false)
  const { currentRPM, targetRPM, direction, onTarget, holdProgress, timeLeft, duration } = gameState || {}

  const handleTap = useCallback(() => {
    sendInput('tap', { timestamp: Date.now() })
    setTapFlash(true)
    setTimeout(() => setTapFlash(false), 80)
  }, [sendInput])

  return (
    <div className="flex flex-col h-full bg-amber-50 select-none">
      {/* Header */}
      <div className="bg-amber-800 text-white px-4 py-3">
        <div className="text-xs opacity-70 font-body">Your role</div>
        <div className="font-handwriting text-xl font-bold">Gear Operator</div>
        <div className="text-xs opacity-70 font-body mt-0.5">Tap the gear — your partner guides you</div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
        {/* Gear tap area */}
        <button
          onPointerDown={handleTap}
          className={[
            'rounded-full flex items-center justify-center transition-all duration-75 active:scale-95',
            'bg-amber-100 border-4 shadow-xl',
            tapFlash
              ? 'border-amber-600 shadow-amber-400/60 scale-105'
              : onTarget
                ? 'border-green-500 shadow-green-300/40'
                : 'border-amber-400',
          ].join(' ')}
          style={{ width: 180, height: 180 }}
        >
          <GearSVG spinning size={140} rpm={currentRPM} color={tapFlash ? '#8B3A00' : '#B5651D'} />
        </button>

        <div className="font-handwriting text-lg text-amber-800/70">
          Tap rapidly to spin!
        </div>

        {/* Mini gauge for P1 awareness */}
        <div className="w-full">
          <div className="text-center text-xs font-body text-amber-600/60 mb-2">
            Current: {Math.round(currentRPM || 0)} RPM &nbsp;|&nbsp; Target: {targetRPM} RPM
          </div>
          {onTarget && <HoldBar progress={holdProgress || 0} />}
        </div>
      </div>

      <div className="p-4">
        <TimerStrip timeLeft={timeLeft || 0} duration={duration || 60} />
      </div>
    </div>
  )
}

// ─── P2 View — read the gauge ─────────────────────────────────────────────────

function P2View({ gameState }) {
  const { currentRPM, targetRPM, direction, onTarget, holdProgress, timeLeft, duration } = gameState || {}

  return (
    <div className="flex flex-col h-full bg-stone-100 select-none">
      {/* Header */}
      <div className="bg-stone-700 text-white px-4 py-3">
        <div className="text-xs opacity-70 font-body">Your role</div>
        <div className="font-handwriting text-xl font-bold">Gauge Reader</div>
        <div className="text-xs opacity-70 font-body mt-0.5">Tell your partner how fast to spin</div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
        {/* Decorative gear */}
        <div className="opacity-30">
          <GearSVG size={70} rpm={currentRPM} color="#B5651D" />
        </div>

        <RPMGauge currentRPM={currentRPM} targetRPM={targetRPM} direction={direction} />

        {onTarget && <HoldBar progress={holdProgress || 0} />}

        <div className="text-center font-body text-sm text-stone-500 max-w-xs">
          Shout "{direction === 'faster' ? 'Faster!' : direction === 'slower' ? 'Slower!' : 'Hold it!'}" to your partner
        </div>
      </div>

      <div className="p-4">
        <TimerStrip timeLeft={timeLeft || 0} duration={duration || 60} />
      </div>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function GearTrainGame() {
  const { myRole } = useGame()
  const { gameState, sendInput } = useGameState()

  const isP1 = myRole === 'player1'

  if (!gameState) {
    return (
      <div className="flex items-center justify-center h-full bg-amber-50">
        <div className="font-handwriting text-xl text-amber-800">Starting the gears…</div>
      </div>
    )
  }

  if (gameState.phase === 'won' || gameState.phase === 'failed') {
    const won = gameState.phase === 'won'
    return (
      <div className="flex flex-col items-center justify-center h-full bg-amber-50 gap-5 px-8">
        <div className="text-6xl">{won ? '⚙️' : '💨'}</div>
        <div className="font-handwriting text-3xl font-bold text-amber-900 text-center">
          {won ? 'Perfectly Tuned!' : 'The Gears Stopped…'}
        </div>
        {won && (
          <div className="font-body text-sm text-amber-700">
            Target: {gameState.targetRPM} RPM • Final: {Math.round(gameState.currentRPM || 0)} RPM
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-full overflow-hidden">
      {isP1
        ? <P1View gameState={gameState} sendInput={sendInput} />
        : <P2View gameState={gameState} />
      }
    </div>
  )
}
