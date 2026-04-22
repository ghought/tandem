import React, { useRef, useEffect, useState, useCallback } from 'react'
import { useGame } from '../../context/GameContext.jsx'
import { useGameState } from '../../hooks/useGameState.js'
import AudioManager from '../../audio/AudioManager.js'

const PALETTE_HEX = {
  red: '#D94F3D', blue: '#3D7BC4', green: '#4A9E6B', orange: '#E8873A',
  lavender: '#9B72C4', yellow: '#D4AC35', pink: '#E87CA0', mint: '#4ABCAA',
}

// Build an EKG-style path for an array of amplitude values [0..1]
function buildEKGPath(values, width, height, baseline) {
  if (values.length < 2) return ''
  const stepX = width / (values.length - 1)
  return values.map((v, i) => {
    const x = i * stepX
    const y = baseline - v * (height * 0.35)
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
  }).join(' ')
}

// Generate one heartbeat pulse shape at position t in [0,1]
function heartbeatPulse(t) {
  if (t < 0 || t > 1) return 0
  // Classic EKG: flat → small bump (P) → big spike (QRS) → dip → bump (T) → flat
  if (t < 0.25) return Math.sin(t * Math.PI * 2) * 0.12  // P wave
  if (t < 0.35) return -0.08 * Math.sin((t - 0.25) * Math.PI / 0.1)  // Q dip
  if (t < 0.45) return Math.sin((t - 0.35) * Math.PI / 0.1)  // R spike
  if (t < 0.55) return -0.3 * Math.sin((t - 0.45) * Math.PI / 0.1)  // S dip
  if (t < 0.75) return Math.sin((t - 0.55) * Math.PI / 0.2) * 0.4  // T wave
  return 0
}

// Generate trace buffer from beat history
function generateTrace(beats, now, windowMs, points) {
  const arr = new Array(points).fill(0)
  beats.forEach(beatTime => {
    const age = now - beatTime
    if (age > windowMs) return
    for (let i = 0; i < points; i++) {
      const t = i / (points - 1)  // 0 = oldest, 1 = newest
      const beatProgress = (age / windowMs)
      const offset = t - (1 - beatProgress)
      if (offset >= 0 && offset < 1) {
        arr[i] += heartbeatPulse(offset)
      }
    }
  })
  return arr
}

export default function HeartbeatGame() {
  const { player, partner } = useGame()
  const { gameState, sendInput } = useGameState()

  const [myBeats, setMyBeats]       = useState([])
  const [partnerBeats, setPartnerBeats] = useState([])
  const [syncLevel, setSyncLevel]   = useState(0)  // 0..1
  const [tapFlash, setTapFlash]     = useState(false)

  const svgRef  = useRef(null)
  const animRef = useRef(null)
  const nowRef  = useRef(Date.now())

  const WINDOW_MS = 3000
  const TRACE_PTS = 120

  // Receive partner beats from server
  useEffect(() => {
    if (!gameState) return
    if (gameState.partnerBeats) setPartnerBeats(gameState.partnerBeats)
    if (gameState.sync !== undefined) setSyncLevel(gameState.sync)
  }, [gameState])

  const handleTap = useCallback(async () => {
    const now = Date.now()
    setMyBeats(prev => [...prev.filter(t => now - t < WINDOW_MS * 1.5), now])
    setTapFlash(true)
    setTimeout(() => setTapFlash(false), 150)
    sendInput('beat', { timestamp: now })
    try {
      await AudioManager.init()
      AudioManager.playNote('piano', 'C4', '16n')
    } catch (_) {}
  }, [sendInput])

  // Animation loop — redraw traces every frame
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    const frame = () => {
      nowRef.current = Date.now()
      const now = nowRef.current
      const w = svg.clientWidth || 320
      const h = svg.clientHeight || 160
      const baseline = h * 0.5

      const myTrace  = generateTrace(myBeats,      now, WINDOW_MS, TRACE_PTS)
      const ptrTrace = generateTrace(partnerBeats, now, WINDOW_MS, TRACE_PTS)

      const myPath  = svg.querySelector('#my-trace')
      const ptrPath = svg.querySelector('#partner-trace')
      const synPath = svg.querySelector('#sync-trace')

      if (myPath)  myPath.setAttribute('d',  buildEKGPath(myTrace,  w, h, baseline))
      if (ptrPath) ptrPath.setAttribute('d', buildEKGPath(ptrTrace, w, h, baseline))

      // Blended sync trace
      if (synPath && syncLevel > 0.3) {
        const merged = myTrace.map((v, i) => (v + ptrTrace[i]) / 2)
        synPath.setAttribute('d', buildEKGPath(merged, w, h, baseline))
        synPath.setAttribute('opacity', String(Math.min(1, (syncLevel - 0.3) * 3)))
      } else if (synPath) {
        synPath.setAttribute('d', '')
      }

      // Trim old beats
      const cutoff = now - WINDOW_MS * 2
      setMyBeats(prev => prev.filter(t => t > cutoff))
      setPartnerBeats(prev => prev.filter(t => t > cutoff))

      animRef.current = requestAnimationFrame(frame)
    }
    animRef.current = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(animRef.current)
  }, [myBeats, partnerBeats, syncLevel])

  const myColor  = PALETTE_HEX[player?.palette]  || '#3D7BC4'
  const ptrColor = PALETTE_HEX[partner?.palette] || '#E87CA0'

  // Background fill based on sync
  const bgOpacity = syncLevel * 0.35
  const bgColor = `rgba(168,213,162,${bgOpacity})`

  return (
    <div
      className="relative w-full h-full flex flex-col items-center justify-center select-none"
      style={{
        background: `linear-gradient(180deg, #1a1a2e 0%, ${bgColor ? `rgba(26,26,46,0.95) 40%, ${bgColor}` : '#1a1a2e'} 100%)`,
        transition: 'background 0.5s ease',
      }}
      onClick={handleTap}
    >
      {/* Tap ripple */}
      {tapFlash && (
        <div
          className="absolute inset-0 pointer-events-none animate-fade-in"
          style={{ background: `radial-gradient(circle at 50% 50%, ${myColor}25 0%, transparent 70%)` }}
        />
      )}

      {/* Sync level ring */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="rounded-full border-2 transition-all duration-500"
          style={{
            width: `${60 + syncLevel * 120}px`,
            height: `${60 + syncLevel * 120}px`,
            borderColor: `rgba(168,213,162,${syncLevel * 0.6})`,
            boxShadow: syncLevel > 0.5 ? `0 0 ${syncLevel * 40}px rgba(168,213,162,${syncLevel * 0.4})` : 'none',
          }}
        />
      </div>

      {/* EKG SVG canvas */}
      <div className="w-full px-4" style={{ height: '200px' }}>
        <svg
          ref={svgRef}
          className="w-full h-full"
          viewBox={`0 0 320 160`}
          preserveAspectRatio="none"
        >
          {/* Grid */}
          {[...Array(8)].map((_, i) => (
            <line
              key={i}
              x1={i * 40} y1="0" x2={i * 40} y2="160"
              stroke="rgba(255,255,255,0.05)" strokeWidth="1"
            />
          ))}
          {[...Array(5)].map((_, i) => (
            <line
              key={i}
              x1="0" y1={i * 40} x2="320" y2={i * 40}
              stroke="rgba(255,255,255,0.05)" strokeWidth="1"
            />
          ))}

          {/* Partner trace */}
          <path
            id="partner-trace"
            fill="none"
            stroke={ptrColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.7"
          />

          {/* My trace */}
          <path
            id="my-trace"
            fill="none"
            stroke={myColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.9"
          />

          {/* Merged sync trace */}
          <path
            id="sync-trace"
            fill="none"
            stroke="rgba(168,213,162,0.9)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0"
          />
        </svg>
      </div>

      {/* Sync meter */}
      <div className="w-full px-8 mb-4">
        <div className="flex items-center gap-3">
          <div className="font-handwriting text-sm text-white/60 w-12 text-right shrink-0">sync</div>
          <div className="flex-1 h-2.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${syncLevel * 100}%`,
                background: `linear-gradient(90deg, ${myColor}, ${ptrColor})`,
                boxShadow: syncLevel > 0.6 ? '0 0 8px rgba(168,213,162,0.6)' : 'none',
              }}
            />
          </div>
          <div className="font-handwriting text-sm text-white/60 w-10 shrink-0">
            {Math.round(syncLevel * 100)}%
          </div>
        </div>
      </div>

      {/* Tap prompt */}
      <div
        className={`font-handwriting text-2xl font-bold transition-all duration-150
          ${tapFlash ? 'text-white scale-110' : 'text-white/40 scale-100'}`}
      >
        Tap to the beat
      </div>

      {/* Legend */}
      <div className="absolute top-4 left-4 right-4 flex justify-between pointer-events-none">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 rounded-full" style={{ background: myColor }} />
          <span className="font-body text-xs text-white/50">{player?.name || 'You'}</span>
        </div>
        {partner && (
          <div className="flex items-center gap-1.5">
            <span className="font-body text-xs text-white/50">{partner.name}</span>
            <div className="w-4 h-0.5 rounded-full" style={{ background: ptrColor }} />
          </div>
        )}
      </div>
    </div>
  )
}
