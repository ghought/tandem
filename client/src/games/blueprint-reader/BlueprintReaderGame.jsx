import React, { useState, useCallback, useEffect } from 'react'
import { useGame } from '../../context/GameContext.jsx'
import { useGameState } from '../../hooks/useGameState.js'

// ─── Shape icons ──────────────────────────────────────────────────────────────

function ShapeIcon({ shape, color, size = 40, dimmed = false }) {
  const opacity = dimmed ? 0.35 : 1
  switch (shape) {
    case 'circle':
      return (
        <svg width={size} height={size} viewBox="0 0 40 40" style={{ opacity }}>
          <circle cx="20" cy="20" r="17" fill={color} stroke="#2C1810" strokeWidth="2" />
        </svg>
      )
    case 'square':
      return (
        <svg width={size} height={size} viewBox="0 0 40 40" style={{ opacity }}>
          <rect x="4" y="4" width="32" height="32" rx="3" fill={color} stroke="#2C1810" strokeWidth="2" />
        </svg>
      )
    case 'triangle':
      return (
        <svg width={size} height={size} viewBox="0 0 40 40" style={{ opacity }}>
          <polygon points="20,4 36,36 4,36" fill={color} stroke="#2C1810" strokeWidth="2" />
        </svg>
      )
    default:
      return <div style={{ width: size, height: size, background: color, opacity }} />
  }
}

// ─── Timer bar ────────────────────────────────────────────────────────────────

function TimerBar({ timeLeft, duration }) {
  const pct   = Math.max(0, Math.min(100, (timeLeft / duration) * 100))
  const color = pct > 50 ? '#B5651D' : pct > 25 ? '#E8873A' : '#D94F3D'
  return (
    <div className="w-full h-2 bg-amber-200 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  )
}

// ─── Reader view (P1) ─────────────────────────────────────────────────────────

function ReaderView({ gameState }) {
  const {
    readerBlueprint, currentIndex, totalShapes,
    timeLeft, shapeDuration, totalScore,
  } = gameState || {}

  return (
    <div className="flex flex-col h-full bg-amber-50">
      {/* Header */}
      <div className="bg-amber-800 text-white px-4 py-3">
        <div className="text-xs opacity-70 font-body">Your role</div>
        <div className="font-handwriting text-xl font-bold">Blueprint Reader</div>
        <div className="text-xs opacity-70 mt-0.5 font-body">
          Describe the spec — no color names!
        </div>
      </div>

      {/* Progress */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex justify-between text-xs font-body text-amber-700/60 mb-1">
          <span>Shape {(currentIndex || 0) + 1} of {totalShapes || 5}</span>
          <span>Score: {totalScore || 0}</span>
        </div>
        <TimerBar timeLeft={timeLeft || 0} duration={shapeDuration || 30} />
      </div>

      {/* Blueprint spec list */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-2">
        <div className="text-xs font-body text-amber-700/60 uppercase tracking-widest mb-1">
          Blueprint Specifications
        </div>
        {(readerBlueprint || []).map((step) => (
          <div
            key={step.index}
            className={[
              'rounded-xl border-2 px-4 py-3 flex items-center gap-4 transition-all',
              step.done
                ? 'bg-green-50 border-green-300 opacity-60'
                : step.active
                  ? 'bg-amber-100 border-amber-500 shadow-md'
                  : 'bg-white border-amber-200',
            ].join(' ')}
          >
            {/* Step number */}
            <div className={[
              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
              step.done ? 'bg-green-400 text-white' : 'bg-amber-300 text-amber-900',
            ].join(' ')}>
              {step.done ? '✓' : step.index + 1}
            </div>

            {/* Shape preview */}
            <ShapeIcon
              shape={step.shape}
              color={step.colorHex}
              size={36}
              dimmed={step.done}
            />

            {/* Spec text */}
            <div className="flex-1 min-w-0">
              <div className={`font-handwriting text-base font-bold ${step.done ? 'line-through text-green-700' : 'text-amber-900'}`}>
                {step.shape.toUpperCase()}
              </div>
              <div className="font-mono text-xs text-amber-700/80 mt-0.5 tracking-wider">
                {step.colorLabel}
              </div>
            </div>

            {step.active && (
              <div className="text-xs font-body text-amber-600 font-semibold shrink-0">ACTIVE</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Builder view (P2) ───────────────────────────────────────────────────────

function BuilderView({ gameState, sendInput }) {
  const {
    builderShapes, builderColors, currentIndex, totalShapes,
    timeLeft, shapeDuration, totalScore, lastResult,
  } = gameState || {}

  const [selectedShape, setSelectedShape] = useState(null)
  const [selectedColor, setSelectedColor] = useState(null)
  const [shake, setShake]                 = useState(false)
  const [flash, setFlash]                 = useState(null)  // 'correct' | 'wrong'

  // Reset selections when shape advances
  useEffect(() => {
    setSelectedShape(null)
    setSelectedColor(null)
  }, [currentIndex])

  // Flash on placement result
  useEffect(() => {
    if (!lastResult) return
    setFlash(lastResult)
    if (lastResult === 'wrong') setShake(true)
    const t1 = setTimeout(() => setFlash(null), 700)
    const t2 = setTimeout(() => setShake(false), 600)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [lastResult])

  const handlePlace = useCallback(() => {
    if (!selectedShape || !selectedColor) return
    sendInput('place', { shape: selectedShape, colorHex: selectedColor })
  }, [selectedShape, selectedColor, sendInput])

  const canPlace = selectedShape && selectedColor

  return (
    <div className={`flex flex-col h-full bg-stone-100 ${shake ? 'animate-shake' : ''}`}>
      {/* Header */}
      <div className="bg-stone-700 text-white px-4 py-3">
        <div className="text-xs opacity-70 font-body">Your role</div>
        <div className="font-handwriting text-xl font-bold">Blueprint Builder</div>
        <div className="text-xs opacity-70 mt-0.5 font-body">Listen to your partner, place the shape</div>
      </div>

      {/* Progress + timer */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex justify-between text-xs font-body text-stone-500 mb-1">
          <span>Shape {(currentIndex || 0) + 1} of {totalShapes || 5}</span>
          <span>{timeLeft || 0}s left</span>
        </div>
        <TimerBar timeLeft={timeLeft || 0} duration={shapeDuration || 30} />
      </div>

      {/* Flash feedback overlay */}
      {flash && (
        <div className={[
          'mx-4 rounded-xl py-2 text-center font-handwriting font-bold text-lg transition-all',
          flash === 'correct' ? 'bg-green-100 text-green-700 border-2 border-green-400' : 'bg-red-100 text-red-700 border-2 border-red-400',
        ].join(' ')}>
          {flash === 'correct' ? '✓ Correct!' : '✗ Try again'}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-4 mt-2">
        {/* Shape selector */}
        <div>
          <div className="text-xs font-body text-stone-500 uppercase tracking-widest mb-2">Shape</div>
          <div className="flex gap-3 justify-center">
            {(builderShapes || []).map(shape => (
              <button
                key={shape}
                onClick={() => setSelectedShape(shape === selectedShape ? null : shape)}
                className={[
                  'flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl border-2 transition-all',
                  selectedShape === shape
                    ? 'bg-amber-100 border-amber-500 shadow-md scale-105'
                    : 'bg-white border-stone-200',
                ].join(' ')}
              >
                <ShapeIcon shape={shape} color={selectedColor || '#AAA'} size={36} />
                <span className="text-xs font-body text-stone-600 capitalize">{shape}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Color swatch selector */}
        <div>
          <div className="text-xs font-body text-stone-500 uppercase tracking-widest mb-2">Color Swatch</div>
          <div className="grid grid-cols-5 gap-2">
            {(builderColors || []).map(c => (
              <button
                key={c.hex}
                onClick={() => setSelectedColor(c.hex === selectedColor ? null : c.hex)}
                className={[
                  'flex flex-col items-center gap-1 py-2 rounded-xl border-2 transition-all',
                  selectedColor === c.hex
                    ? 'border-stone-700 shadow-md scale-105'
                    : 'border-stone-200 bg-white',
                ].join(' ')}
              >
                <div
                  className="w-8 h-8 rounded-full border border-black/20"
                  style={{ background: c.hex }}
                />
                <span className="text-xs font-body text-stone-500">{c.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        {canPlace && (
          <div className="flex justify-center py-2">
            <ShapeIcon shape={selectedShape} color={selectedColor} size={60} />
          </div>
        )}

        {/* Place button */}
        <button
          disabled={!canPlace}
          onClick={handlePlace}
          className={[
            'w-full py-3 rounded-xl font-handwriting text-lg font-bold shadow transition-all',
            canPlace
              ? 'bg-stone-800 text-white active:scale-95'
              : 'bg-stone-300 text-stone-400 cursor-not-allowed',
          ].join(' ')}
        >
          {canPlace ? 'Place It!' : 'Select shape & color'}
        </button>
      </div>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function BlueprintReaderGame() {
  const { myRole } = useGame()
  const { gameState, sendInput } = useGameState()

  const isReader = myRole === 'player1'

  if (!gameState) {
    return (
      <div className="flex items-center justify-center h-full bg-amber-50">
        <div className="font-handwriting text-xl text-amber-800">Unrolling the blueprint…</div>
      </div>
    )
  }

  if (gameState.phase === 'complete') {
    const { correctPlacements, totalShapes, totalScore } = gameState
    return (
      <div className="flex flex-col items-center justify-center h-full bg-amber-50 gap-5 px-8">
        <div className="text-6xl">📐</div>
        <div className="font-handwriting text-3xl font-bold text-amber-900 text-center">
          Blueprint Complete!
        </div>
        <div className="font-body text-sm text-amber-700 text-center">
          {correctPlacements}/{totalShapes} shapes correct • Score: {totalScore}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-hidden">
      {isReader
        ? <ReaderView gameState={gameState} />
        : <BuilderView gameState={gameState} sendInput={sendInput} />
      }
    </div>
  )
}
