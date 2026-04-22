import React, { useRef, useState, useCallback, useEffect } from 'react'
import { useGame } from '../../context/GameContext.jsx'
import { useGameState } from '../../hooks/useGameState.js'

// ─── Drawing canvas ───────────────────────────────────────────────────────────

function DrawCanvas({ onStrokeStart, onStrokePoint, onStrokeEnd, strokes, ghostStrokes, readOnly }) {
  const canvasRef    = useRef(null)
  const isDrawingRef = useRef(false)

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    const src  = e.touches ? e.touches[0] : e
    const x    = ((src.clientX - rect.left) / rect.width) * 100
    const y    = ((src.clientY - rect.top)  / rect.height) * 100
    return { x, y }
  }

  const onStart = useCallback((e) => {
    if (readOnly) return
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    isDrawingRef.current = true
    const pos = getPos(e, canvas)
    onStrokeStart()
    onStrokePoint(pos.x, pos.y)
  }, [readOnly, onStrokeStart, onStrokePoint])

  const onMove = useCallback((e) => {
    if (!isDrawingRef.current || readOnly) return
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const pos = getPos(e, canvas)
    onStrokePoint(pos.x, pos.y)
  }, [readOnly, onStrokePoint])

  const onEnd = useCallback((e) => {
    if (!isDrawingRef.current || readOnly) return
    e.preventDefault()
    isDrawingRef.current = false
    onStrokeEnd()
  }, [readOnly, onStrokeEnd])

  // Render strokes on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const w = canvas.width
    const h = canvas.height

    ctx.clearRect(0, 0, w, h)

    const drawStrokes = (strokesToDraw, style) => {
      ctx.strokeStyle = style.color
      ctx.lineWidth   = style.width
      ctx.lineCap     = 'round'
      ctx.lineJoin    = 'round'
      ctx.globalAlpha = style.alpha || 1
      for (const stroke of (strokesToDraw || [])) {
        if (stroke.length < 2) continue
        ctx.beginPath()
        ctx.moveTo((stroke[0].x / 100) * w, (stroke[0].y / 100) * h)
        for (let i = 1; i < stroke.length; i++) {
          ctx.lineTo((stroke[i].x / 100) * w, (stroke[i].y / 100) * h)
        }
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }

    // Ghost strokes (mirrored P1 drawing for P2)
    if (ghostStrokes && ghostStrokes.length > 0) {
      drawStrokes(ghostStrokes, { color: '#C77DFF', width: 3, alpha: 0.35 })
    }

    // Main strokes
    drawStrokes(strokes, { color: '#3D0057', width: 3, alpha: 1 })
  }, [strokes, ghostStrokes])

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={300}
      className="w-full h-full rounded-xl touch-none"
      style={{ background: '#FDF8FF', border: '2px solid rgba(106,5,114,0.2)', cursor: readOnly ? 'default' : 'crosshair' }}
      onMouseDown={onStart}
      onMouseMove={onMove}
      onMouseUp={onEnd}
      onMouseLeave={onEnd}
      onTouchStart={onStart}
      onTouchMove={onMove}
      onTouchEnd={onEnd}
    />
  )
}

// ─── Timer bar ────────────────────────────────────────────────────────────────

function TimerBar({ timeLeft, maxTime }) {
  const pct   = Math.max(0, Math.min(1, timeLeft / maxTime))
  const color = pct > 0.5 ? '#6A0572' : pct > 0.25 ? '#E8873A' : '#D94F3D'
  return (
    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.1)' }}>
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${pct * 100}%`, background: color }}
      />
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function MirrorDrawGame() {
  const { myRole } = useGame()
  const { gameState, sendInput } = useGameState()

  const isP1  = myRole === 'player1'
  const gs    = gameState || {}
  const { phase, phaseTimer, drawDuration, traceDuration,
          p1Strokes, ghostStrokes, p2Strokes, overlapScore } = gs

  // Local strokes state (rendered immediately without waiting for server roundtrip)
  const [localStrokes, setLocalStrokes] = useState([])
  const currentStrokeRef = useRef([])

  const handleStrokeStart = useCallback(() => {
    currentStrokeRef.current = []
    sendInput('strokeStart', {})
  }, [sendInput])

  const handleStrokePoint = useCallback((x, y) => {
    currentStrokeRef.current.push({ x, y })
    setLocalStrokes(prev => {
      const copy = [...prev]
      if (copy.length === 0 || currentStrokeRef.current.length === 1) {
        copy.push([{ x, y }])
      } else {
        copy[copy.length - 1] = [...currentStrokeRef.current]
      }
      return copy
    })
    sendInput('strokePoint', { x, y })
  }, [sendInput])

  const handleStrokeEnd = useCallback(() => {
    if (currentStrokeRef.current.length > 0) {
      setLocalStrokes(prev => [...prev])
    }
    sendInput('strokeEnd', {})
  }, [sendInput])

  const handleDone = useCallback(() => {
    sendInput('done', {})
  }, [sendInput])

  // Sync local strokes from server state when phase changes
  useEffect(() => {
    if (phase === 'tracing') setLocalStrokes([])
  }, [phase])

  const maxTime  = phase === 'drawing' ? (drawDuration || 30) : (traceDuration || 20)
  const myStrokes = isP1 ? localStrokes : (p2Strokes || [])
  const ghosts    = isP1 ? [] : (ghostStrokes || [])

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
        <div className="font-handwriting text-5xl">🪞</div>
        <div className="font-handwriting text-3xl font-bold text-paper-card-dark text-center">Mirror Complete!</div>
        <div className="font-handwriting text-xl text-paper-card-dark/70">Overlap: {overlapScore || 0}%</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-paper-cream overflow-hidden select-none">
      {/* Header */}
      <div className="px-5 pt-5 pb-3" style={{ background: '#1A0027' }}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="font-handwriting text-xl font-bold text-white">Mirror Draw</div>
            <div className="text-xs text-white/50 font-body">
              {isP1
                ? (phase === 'drawing' ? 'Draw a shape' : 'Watch your partner trace…')
                : (phase === 'drawing' ? 'Wait for your partner…' : 'Trace the mirrored shape!')}
            </div>
          </div>
          <div className="text-right">
            <div className="font-handwriting text-xl font-bold text-purple-300">{Math.ceil(phaseTimer || 0)}s</div>
            <div className="text-xs text-white/40 font-body">{phase}</div>
          </div>
        </div>
        <TimerBar timeLeft={phaseTimer || 0} maxTime={maxTime} />
      </div>

      {/* Phase banner */}
      <div className="px-5 py-2 text-center" style={{ background: 'rgba(106,5,114,0.08)' }}>
        {phase === 'drawing' && isP1 && (
          <div className="font-handwriting text-sm text-paper-card-dark/80">
            Draw freely — your partner sees a mirror image
          </div>
        )}
        {phase === 'drawing' && !isP1 && (
          <div className="font-handwriting text-sm text-paper-card-dark/80 animate-pulse">
            Your partner is drawing…
          </div>
        )}
        {phase === 'tracing' && (
          <div className="font-handwriting text-sm text-paper-card-dark/80">
            {isP1 ? 'Your partner is tracing your drawing' : 'Trace over the purple ghost!'}
          </div>
        )}
      </div>

      {/* Canvas area */}
      <div className="flex-1 p-4 flex flex-col gap-3">
        {/* Show canvas if P1 is drawing, or P2 is tracing, or P1 can see their drawing */}
        {(isP1 && phase === 'drawing') || (!isP1 && phase === 'tracing') ? (
          <div className="flex-1 relative">
            <DrawCanvas
              onStrokeStart={handleStrokeStart}
              onStrokePoint={handleStrokePoint}
              onStrokeEnd={handleStrokeEnd}
              strokes={myStrokes}
              ghostStrokes={ghosts}
              readOnly={false}
            />
          </div>
        ) : (
          <div className="flex-1 relative">
            <DrawCanvas
              onStrokeStart={() => {}}
              onStrokePoint={() => {}}
              onStrokeEnd={() => {}}
              strokes={isP1 ? (p1Strokes || []) : (p2Strokes || [])}
              ghostStrokes={ghosts}
              readOnly
            />
          </div>
        )}

        {/* Done button */}
        {((isP1 && phase === 'drawing') || (!isP1 && phase === 'tracing')) && localStrokes.length > 0 && (
          <button
            onClick={handleDone}
            className="w-full py-3 rounded-xl font-handwriting text-white text-lg shadow-md active:scale-95 transition-transform"
            style={{ background: '#6A0572' }}
          >
            Done ✓
          </button>
        )}
      </div>
    </div>
  )
}
