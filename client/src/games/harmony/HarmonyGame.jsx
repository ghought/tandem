import React, { useRef, useEffect, useState, useCallback } from 'react'
import { useGame } from '../../context/GameContext.jsx'
import { useGameState } from '../../hooks/useGameState.js'
import AudioManager from '../../audio/AudioManager.js'

const PALETTE_HEX = {
  red: '#D94F3D', blue: '#3D7BC4', green: '#4A9E6B', orange: '#E8873A',
  lavender: '#9B72C4', yellow: '#D4AC35', pink: '#E87CA0', mint: '#4ABCAA',
}

const NOTES_SCALE = ['C4','D4','E4','G4','A4','C5']
const NOTE_COLORS  = ['#E8A598','#98B8E8','#A8D5A2','#E8CE98','#C4A8D5','#E87CA0']

// Generate demo notes for standalone play
function generateDemoNotes(laneCount, now) {
  const notes = []
  for (let i = 0; i < 12; i++) {
    notes.push({
      id: `demo-${i}`,
      lane: i % laneCount,
      y: -i * 120 - 80,
      note: NOTES_SCALE[i % NOTES_SCALE.length],
      hit: false,
      missed: false,
    })
  }
  return notes
}

const LANE_COUNT         = 3
const NOTE_HEIGHT        = 36
const NOTE_SPEED         = 2.2    // px per frame (at 60fps)
const NOTE_SPEED_PX_MS   = NOTE_SPEED * 60 / 1000  // px per ms
const HIT_ZONE_Y         = 0.82   // fraction from top where target line is
const HIT_WINDOW         = 60     // pixels from target center = success

function LaneButton({ laneIdx, color, label, onTap }) {
  const [pressed, setPressed] = useState(false)

  const handlePress = () => {
    setPressed(true)
    setTimeout(() => setPressed(false), 120)
    onTap(laneIdx)
  }

  return (
    <button
      onPointerDown={handlePress}
      className="flex-1 flex items-center justify-center rounded-xl border-2 transition-all active:scale-95"
      style={{
        background: pressed ? `${color}60` : `${color}20`,
        borderColor: pressed ? color : `${color}50`,
        boxShadow: pressed ? `0 0 12px ${color}60` : 'none',
        height: '60px',
      }}
      aria-label={`Lane ${laneIdx + 1}`}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center font-handwriting font-bold text-sm text-white"
        style={{ background: color }}
      >
        {label}
      </div>
    </button>
  )
}

export default function HarmonyGame() {
  const { player, partner, myRole, socket } = useGame()
  const { gameState, sendInput } = useGameState()

  const [notes, setNotes]         = useState(() => generateDemoNotes(LANE_COUNT, Date.now()))
  const [partnerNotes, setPartnerNotes] = useState([])
  const [harmonyLevel, setHarmonyLevel] = useState(0)
  const [hitFeedback, setHitFeedback] = useState([]) // {id, x, y, type}
  const [floatingNotes, setFloatingNotes] = useState([]) // decorative ♩ symbols

  const containerRef    = useRef(null)
  const animRef         = useRef(null)
  const gameStateRef    = useRef(null)   // always holds latest gameState without triggering re-render
  const frameRef        = useRef(0)

  // Keep gameStateRef in sync (no re-render side-effects)
  useEffect(() => {
    gameStateRef.current = gameState
  }, [gameState])

  // ── Sync notes from server state ─────────────────────────────────────────
  // Runs whenever gameState updates; merges server note list into local state
  // while preserving the animated y-position for notes already on screen.
  useEffect(() => {
    if (!gameState) return

    if (gameState.notes) {
      const h        = containerRef.current?.clientHeight || 600
      const hitZoneY = h * HIT_ZONE_Y
      const songTime = gameState.songTime || 0

      setNotes(prev => {
        const prevMap = new Map(prev.map(n => [n.id, n]))
        const next = gameState.notes.map(sn => {
          const id      = sn.noteId || sn.id
          const existing = prevMap.get(id)
          if (existing) {
            // Keep animated y; just update server-authoritative flags
            return { ...existing, hit: sn.hit, missed: sn.missed }
          }
          // New note arriving from server: calculate starting y from timing
          const dt = sn.time - songTime  // ms until note hits the target line
          const y  = hitZoneY - dt * NOTE_SPEED_PX_MS
          return {
            id,
            lane:   sn.lane,
            y,
            note:   sn.note || NOTES_SCALE[sn.lane % NOTES_SCALE.length],
            hit:    sn.hit    || false,
            missed: sn.missed || false,
          }
        })
        return next
      })
    }

    if (gameState.harmonyMeter !== undefined) {
      setHarmonyLevel(gameState.harmonyMeter / 100)
    }
  }, [gameState])

  // ── Animation loop — runs once, never restarts ────────────────────────────
  useEffect(() => {
    const frame = () => {
      frameRef.current++
      const h       = containerRef.current?.clientHeight || 600
      const targetY = h * HIT_ZONE_Y

      setNotes(prev => {
        const moved = prev.map(n => ({
          ...n,
          y:      n.y + NOTE_SPEED,
          missed: !n.hit && !n.missed && n.y > targetY + NOTE_HEIGHT * 2,
        }))
        // Only filter out notes that have scrolled way past the bottom
        return moved.filter(n => n.y < h + NOTE_HEIGHT * 2)
      })

      // Demo-mode respawn — only when there's no live server state
      setNotes(prev => {
        if (prev.length < 6 && !gameStateRef.current?.notes) {
          const topNote = prev.reduce((min, n) => n.y < min ? n.y : min, 0)
          const newNote = {
            id:     `n-${Date.now()}-${Math.random()}`,
            lane:   Math.floor(Math.random() * LANE_COUNT),
            y:      Math.min(topNote - 120, -80),
            note:   NOTES_SCALE[Math.floor(Math.random() * NOTES_SCALE.length)],
            hit:    false,
            missed: false,
          }
          return [...prev, newNote]
        }
        return prev
      })

      setHarmonyLevel(prev => Math.max(0, prev - 0.001))
      setHitFeedback(prev => prev.filter(f => Date.now() - f.ts < 600))
      setFloatingNotes(prev =>
        prev
          .map(fn => ({ ...fn, y: fn.y - 1.2, opacity: fn.opacity - 0.02 }))
          .filter(fn => fn.opacity > 0)
      )

      animRef.current = requestAnimationFrame(frame)
    }
    animRef.current = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(animRef.current)
  }, [])  // ← empty deps: loop starts once and never restarts

  // ── React to server note events (hit/miss broadcast) ─────────────────────
  useEffect(() => {
    if (!socket) return
    const onNoteHit = ({ noteId, harmony }) => {
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, hit: true } : n))
      if (harmony !== undefined) setHarmonyLevel(harmony / 100)
    }
    const onNoteMiss = ({ noteId, harmony }) => {
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, missed: true } : n))
      if (harmony !== undefined) setHarmonyLevel(harmony / 100)
    }
    socket.on('game:noteHit',  onNoteHit)
    socket.on('game:noteMiss', onNoteMiss)
    return () => {
      socket.off('game:noteHit',  onNoteHit)
      socket.off('game:noteMiss', onNoteMiss)
    }
  }, [socket])

  const handleLaneTap = useCallback(async (laneIdx) => {
    const h = containerRef.current?.clientHeight || 600
    const targetY = h * HIT_ZONE_Y
    const now = Date.now()

    let hit = false
    setNotes(prev => {
      const updated = [...prev]
      for (let i = 0; i < updated.length; i++) {
        const n = updated[i]
        if (n.lane === laneIdx && !n.hit && !n.missed) {
          const dist = Math.abs(n.y - targetY)
          if (dist < HIT_WINDOW) {
            updated[i] = { ...n, hit: true }
            hit = true

            // Hit feedback
            const laneW = (containerRef.current?.clientWidth || 320) / LANE_COUNT
            setHitFeedback(fb => [...fb, {
              id: `fb-${now}`,
              x: laneIdx * laneW + laneW / 2,
              y: targetY,
              type: dist < HIT_WINDOW * 0.4 ? 'perfect' : 'good',
              ts: now,
            }])

            // Floating note symbol
            setFloatingNotes(fn => [...fn, {
              id: `fn-${now}`,
              x: laneIdx * laneW + laneW / 2 + (Math.random() - 0.5) * 40,
              y: targetY - 20,
              symbol: ['♩','♪','♫','♬'][Math.floor(Math.random() * 4)],
              opacity: 1,
            }])

            // Harmony boost
            setHarmonyLevel(prev => Math.min(1, prev + 0.12))

            // Play audio
            AudioManager.init().then(() => {
              AudioManager.playNote('piano', n.note, '8n')
            }).catch(() => {})

            sendInput('tap', { laneIdx, noteId: n.id, timestamp: now })
            break
          }
        }
      }
      return updated
    })

    if (!hit) {
      // Miss feedback
      try {
        await AudioManager.init()
        AudioManager.playBoop()
      } catch (_) {}
      setHarmonyLevel(prev => Math.max(0, prev - 0.08))
    }
  }, [sendInput])

  const myColor  = PALETTE_HEX[player?.palette]  || '#3D7BC4'
  const ptrColor = PALETTE_HEX[partner?.palette] || '#E87CA0'

  // Background: warm pulse at high harmony
  const bgLight = Math.round(harmonyLevel * 40)

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex flex-col overflow-hidden select-none"
      style={{
        background: `linear-gradient(180deg,
          rgb(${20 + bgLight},${20 + bgLight},${35 + bgLight}) 0%,
          rgb(${30 + bgLight},${28 + bgLight},${45 + bgLight}) 100%)`,
        transition: 'background 0.3s ease',
      }}
    >
      {/* Floating note symbols */}
      {floatingNotes.map(fn => (
        <div
          key={fn.id}
          className="absolute pointer-events-none font-handwriting text-2xl"
          style={{
            left: fn.x,
            top: fn.y,
            opacity: fn.opacity,
            color: myColor,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {fn.symbol}
        </div>
      ))}

      {/* Harmony meter */}
      <div className="px-5 pt-3 pb-2">
        <div className="flex items-center gap-3">
          <span className="font-handwriting text-xs text-white/50">Harmony</span>
          <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-200"
              style={{
                width: `${harmonyLevel * 100}%`,
                background: `linear-gradient(90deg, ${myColor}, ${ptrColor})`,
                boxShadow: harmonyLevel > 0.6 ? `0 0 10px rgba(168,213,162,0.6)` : 'none',
              }}
            />
          </div>
          <span className="font-handwriting text-xs text-white/50">{Math.round(harmonyLevel * 100)}%</span>
        </div>
      </div>

      {/* Note lanes */}
      <div className="flex-1 relative">
        {/* Lane dividers */}
        {[...Array(LANE_COUNT - 1)].map((_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-px bg-white/8"
            style={{ left: `${(i + 1) * (100 / LANE_COUNT)}%` }}
          />
        ))}

        {/* Target line */}
        <div
          className="absolute left-0 right-0 h-1 rounded-full"
          style={{
            top: `${HIT_ZONE_Y * 100}%`,
            background: `linear-gradient(90deg, ${myColor}80, ${ptrColor}80)`,
            boxShadow: `0 0 8px ${myColor}60`,
          }}
        />

        {/* Target circles per lane */}
        {[...Array(LANE_COUNT)].map((_, i) => {
          const laneW = 100 / LANE_COUNT
          return (
            <div
              key={i}
              className="absolute rounded-full border-2"
              style={{
                left: `${i * laneW + laneW / 2}%`,
                top: `${HIT_ZONE_Y * 100}%`,
                width: '44px',
                height: '44px',
                transform: 'translate(-50%, -50%)',
                borderColor: NOTE_COLORS[i],
                background: `${NOTE_COLORS[i]}15`,
              }}
            />
          )
        })}

        {/* Notes */}
        {notes.map(note => {
          const laneW = containerRef.current
            ? containerRef.current.clientWidth / LANE_COUNT
            : 100
          const x = note.lane * laneW + laneW / 2

          return (
            <div
              key={note.id}
              className="absolute rounded-xl flex items-center justify-center font-handwriting text-sm font-bold"
              style={{
                left: x - laneW * 0.35,
                top: note.y - NOTE_HEIGHT / 2,
                width: laneW * 0.7,
                height: NOTE_HEIGHT,
                background: note.hit
                  ? 'rgba(255,255,255,0.1)'
                  : note.missed
                    ? 'rgba(255,80,80,0.3)'
                    : NOTE_COLORS[note.lane],
                opacity: note.hit ? 0.3 : note.missed ? 0.4 : 1,
                boxShadow: note.hit || note.missed ? 'none'
                  : `0 0 8px ${NOTE_COLORS[note.lane]}80`,
                border: `2px solid ${note.hit || note.missed ? 'transparent' : 'rgba(255,255,255,0.3)'}`,
                transition: 'opacity 0.15s',
              }}
            >
              {!note.hit && !note.missed && (
                <span style={{ color: 'rgba(255,255,255,0.9)' }}>
                  {['Do','Re','Mi','Sol','La','Do'][NOTES_SCALE.indexOf(note.note)] || '♪'}
                </span>
              )}
            </div>
          )
        })}

        {/* Partner notes (smaller, on side) */}
        {partnerNotes.map(note => {
          const h = containerRef.current?.clientHeight || 600
          return (
            <div
              key={`p-${note.id}`}
              className="absolute right-1 rounded-lg opacity-50"
              style={{
                top: note.y - 14,
                width: '18px',
                height: '28px',
                background: ptrColor,
                borderRadius: '4px',
              }}
            />
          )
        })}

        {/* Hit feedback labels */}
        {hitFeedback.map(fb => (
          <div
            key={fb.id}
            className="absolute pointer-events-none font-handwriting font-bold text-lg animate-slide-up"
            style={{
              left: fb.x,
              top: fb.y - 40,
              transform: 'translate(-50%, -50%)',
              color: fb.type === 'perfect' ? '#FFD700' : '#A8D5A2',
              textShadow: '0 2px 8px rgba(0,0,0,0.5)',
            }}
          >
            {fb.type === 'perfect' ? 'Perfect!' : 'Good!'}
          </div>
        ))}
      </div>

      {/* Tap buttons */}
      <div className="flex gap-2 px-4 pb-3 safe-bottom">
        {[...Array(LANE_COUNT)].map((_, i) => (
          <LaneButton
            key={i}
            laneIdx={i}
            color={NOTE_COLORS[i]}
            label={['1','2','3'][i]}
            onTap={handleLaneTap}
          />
        ))}
      </div>
    </div>
  )
}
