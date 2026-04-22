import React, { useRef, useEffect, useCallback, useState } from 'react'
import { useGame } from '../../context/GameContext.jsx'
import { useGameState } from '../../hooks/useGameState.js'
import { useDeviceTilt } from '../../hooks/useDeviceTilt.js'

// Lerp helper for smooth interpolation
function lerp(a, b, t) { return a + (b - a) * t }

// Default demo maze for when no server state is present
const DEMO_MAZE = {
  width: 8,
  height: 10,
  walls: [
    // Format: [col, row, side] where side: 0=top 1=right 2=bottom 3=left
    [0,0,0],[1,0,0],[2,0,0],[3,0,0],[4,0,0],[5,0,0],[6,0,0],[7,0,0],
    [0,0,3],[7,0,1],
    [0,1,3],[2,1,1],[4,1,3],[7,1,1],
    [0,2,3],[1,2,2],[3,2,1],[5,2,0],[7,2,1],
    [0,3,3],[2,3,0],[4,3,2],[6,3,1],
    [0,4,3],[1,4,1],[3,4,0],[5,4,2],[7,4,1],
    [0,5,3],[2,5,2],[4,5,1],[6,5,0],
    [0,6,3],[1,6,0],[3,6,2],[5,6,1],[7,6,1],
    [0,7,3],[2,7,1],[4,7,0],[6,7,2],
    [0,8,3],[1,8,2],[3,8,1],[5,8,0],[7,8,1],
    [0,9,2],[1,9,2],[2,9,2],[3,9,2],[4,9,2],[5,9,2],[6,9,2],[7,9,2],
    [7,9,1],
  ],
  marbleStart: { x: 0.5, y: 0.5 },
  exitPos:     { x: 7.5, y: 9.5 },
  holes: [
    { x: 2.5, y: 3.5 },
    { x: 5.5, y: 5.5 },
    { x: 3.5, y: 7.5 },
  ],
}

const MARBLE_COLOR = { body: '#4A90D9', highlight: '#A8D4FF', shadow: '#1A4A8A' }
const WALL_COLOR   = '#8B6914'
const FLOOR_COLOR  = '#F5ECD7'
const HOLE_COLOR   = '#2A1A0A'

function drawMaze(ctx, maze, cellW, cellH) {
  const { width, height, walls } = maze

  // Floor
  ctx.fillStyle = FLOOR_COLOR
  ctx.fillRect(0, 0, width * cellW, height * cellH)

  // Subtle grid lines
  ctx.strokeStyle = 'rgba(61,43,31,0.06)'
  ctx.lineWidth = 0.5
  for (let c = 0; c <= width; c++) {
    ctx.beginPath(); ctx.moveTo(c * cellW, 0); ctx.lineTo(c * cellW, height * cellH); ctx.stroke()
  }
  for (let r = 0; r <= height; r++) {
    ctx.beginPath(); ctx.moveTo(0, r * cellH); ctx.lineTo(width * cellW, r * cellH); ctx.stroke()
  }

  // Walls
  ctx.strokeStyle = WALL_COLOR
  ctx.lineWidth = Math.max(3, cellW * 0.12)
  ctx.lineCap = 'round'

  walls.forEach(([col, row, side]) => {
    const x = col * cellW
    const y = row * cellH
    ctx.beginPath()
    switch (side) {
      case 0: ctx.moveTo(x, y); ctx.lineTo(x + cellW, y); break           // top
      case 1: ctx.moveTo(x + cellW, y); ctx.lineTo(x + cellW, y + cellH); break // right
      case 2: ctx.moveTo(x, y + cellH); ctx.lineTo(x + cellW, y + cellH); break // bottom
      case 3: ctx.moveTo(x, y); ctx.lineTo(x, y + cellH); break           // left
    }
    ctx.stroke()
  })
}

function drawHoles(ctx, holes, cellW, cellH) {
  holes.forEach(hole => {
    const cx = hole.x * cellW
    const cy = hole.y * cellH
    const r = cellW * 0.3

    // Torn paper shadow
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.5)'
    ctx.shadowBlur = r * 0.8
    ctx.shadowOffsetY = r * 0.3

    // Jagged torn edge
    ctx.beginPath()
    const points = 10
    for (let i = 0; i < points; i++) {
      const angle = (i / points) * Math.PI * 2
      const jitter = r * (0.85 + Math.sin(i * 2.7) * 0.15)
      const px = cx + Math.cos(angle) * jitter
      const py = cy + Math.sin(angle) * jitter
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.fillStyle = HOLE_COLOR
    ctx.fill()
    ctx.restore()

    // Dark void gradient
    const grad = ctx.createRadialGradient(cx - r*0.2, cy - r*0.2, 0, cx, cy, r)
    grad.addColorStop(0, '#1a0a00')
    grad.addColorStop(1, '#000000')
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.8, 0, Math.PI * 2)
    ctx.fillStyle = grad; ctx.fill()
  })
}

function drawExit(ctx, exit, cellW, cellH, t) {
  const cx = exit.x * cellW
  const cy = exit.y * cellH
  const r = cellW * 0.38

  // Pulsing glow
  const pulse = 0.7 + Math.sin(t * 0.003) * 0.3
  ctx.save()
  ctx.shadowColor = `rgba(255,220,60,${pulse * 0.8})`
  ctx.shadowBlur = 16 * pulse

  // Star shape
  const spikes = 5
  const outerR = r
  const innerR = r * 0.42
  ctx.beginPath()
  for (let i = 0; i < spikes * 2; i++) {
    const angle = (i * Math.PI / spikes) - Math.PI / 2
    const rad = i % 2 === 0 ? outerR : innerR
    const px = cx + Math.cos(angle) * rad
    const py = cy + Math.sin(angle) * rad
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fillStyle = `rgba(255,210,40,${0.8 + pulse * 0.2})`
  ctx.fill()
  ctx.strokeStyle = '#C8860A'
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.restore()
}

function drawMarble(ctx, mx, my, cellW, cellH) {
  const cx = mx * cellW
  const cy = my * cellH
  const r = cellW * 0.32

  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.4)'
  ctx.shadowBlur = 6
  ctx.shadowOffsetY = 3

  // Body gradient
  const grad = ctx.createRadialGradient(cx - r*0.3, cy - r*0.3, r*0.05, cx, cy, r)
  grad.addColorStop(0, MARBLE_COLOR.highlight)
  grad.addColorStop(0.45, MARBLE_COLOR.body)
  grad.addColorStop(1, MARBLE_COLOR.shadow)
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = grad; ctx.fill()

  // Specular highlight
  ctx.beginPath(); ctx.ellipse(cx - r*0.25, cy - r*0.25, r*0.22, r*0.14, -Math.PI/4, 0, Math.PI*2)
  ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fill()

  ctx.restore()
}

export default function LabyrinthGame() {
  const canvasRef = useRef(null)
  const stateRef  = useRef({ mx: 0.5, my: 0.5, targetX: 0.5, targetY: 0.5, t: 0 })
  const rafRef    = useRef(null)
  const touchRef  = useRef(null)

  const { myRole } = useGame()
  const { gameState, sendInput } = useGameState()
  const { tiltX, tiltY, supported, permissionGranted, requestPermission } = useDeviceTilt()

  const maze  = gameState?.maze  || DEMO_MAZE
  const role  = myRole || gameState?.role || 'player1'

  // Sync target from server
  useEffect(() => {
    if (gameState?.marble) {
      stateRef.current.targetX = gameState.marble.x
      stateRef.current.targetY = gameState.marble.y
    }
  }, [gameState])

  // Handle tilt input
  useEffect(() => {
    if (!permissionGranted) return
    const SPEED = 0.015
    const dx = role === 'player1' ? tiltX * SPEED : 0
    const dy = role === 'player2' ? tiltY * SPEED : 0
    if (dx !== 0 || dy !== 0) {
      sendInput('tilt', { dx, dy })
    }
  }, [tiltX, tiltY, role, permissionGranted, sendInput])

  // Touch swipe
  const handleTouchStart = useCallback((e) => {
    const t = e.touches[0]
    touchRef.current = { x: t.clientX, y: t.clientY }
  }, [])

  const handleTouchMove = useCallback((e) => {
    e.preventDefault()
    if (!touchRef.current) return
    const t = e.touches[0]
    const dx = (t.clientX - touchRef.current.x) * 0.002
    const dy = (t.clientY - touchRef.current.y) * 0.002
    touchRef.current = { x: t.clientX, y: t.clientY }

    if (role === 'player1') sendInput('tilt', { dx, dy: 0 })
    else sendInput('tilt', { dx: 0, dy })
  }, [role, sendInput])

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const resize = () => {
      canvas.width  = canvas.offsetWidth  * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
    resize()
    window.addEventListener('resize', resize)

    const loop = () => {
      const s = stateRef.current
      s.t++

      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      const cols = maze.width
      const rows = maze.height
      const cellW = w / cols
      const cellH = h / rows

      // Smooth lerp toward server target
      s.mx = lerp(s.mx, s.targetX, 0.15)
      s.my = lerp(s.my, s.targetY, 0.15)

      ctx.clearRect(0, 0, w, h)
      drawMaze(ctx, maze, cellW, cellH)
      drawHoles(ctx, maze.holes || [], cellW, cellH)
      drawExit(ctx, maze.exitPos || { x: cols - 0.5, y: rows - 0.5 }, cellW, cellH, s.t)
      drawMarble(ctx, s.mx, s.my, cellW, cellH)

      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [maze])

  const isX = role === 'player1'
  const isY = role === 'player2'

  return (
    <div className="relative w-full h-full bg-paper-card-dark flex flex-col">
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="game-canvas"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        style={{ touchAction: 'none' }}
      />

      {/* Role indicator */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center pb-3
        safe-bottom pointer-events-none">
        <div className="px-5 py-2.5 rounded-2xl bg-paper-cream/90 shadow-paper flex items-center gap-3">
          {isX && (
            <>
              <span className="text-lg">←</span>
              <span className="font-handwriting text-lg font-bold text-paper-card-dark">YOU</span>
              <span className="text-lg">→</span>
            </>
          )}
          {isY && (
            <>
              <span className="text-lg">↑</span>
              <span className="font-handwriting text-lg font-bold text-paper-card-dark">YOU</span>
              <span className="text-lg">↓</span>
            </>
          )}
        </div>
      </div>

      {/* Tilt permission button for iOS */}
      {supported && !permissionGranted && (
        <div className="absolute inset-0 flex items-center justify-center bg-paper-card-dark/60 z-10">
          <div className="paper-card rounded-3xl px-6 py-6 mx-8 shadow-paper-lg text-center">
            <div className="text-4xl mb-3">📱</div>
            <p className="font-handwriting text-xl text-paper-card-dark mb-4">
              Enable tilt controls?
            </p>
            <button onClick={requestPermission} className="washi-btn-primary px-8 py-3 rounded-xl">
              Enable Tilt
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
