import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useGame } from '../../context/GameContext.jsx'
import { useGameState } from '../../hooks/useGameState.js'

// ─── Vine segment ─────────────────────────────────────────────────────────────

function VineSegment({ index, filled }) {
  return (
    <div
      className="flex-1 h-4 rounded-full transition-all duration-300 relative overflow-hidden"
      style={{
        background: filled
          ? 'linear-gradient(90deg, #3a7d2c, #5cb85c)'
          : 'rgba(0,0,0,0.15)',
        boxShadow: filled ? '0 0 8px rgba(92,184,92,0.6)' : 'none',
      }}
    >
      {filled && (
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(255,255,255,0.15) 8px, rgba(255,255,255,0.15) 9px)',
          }}
        />
      )}
    </div>
  )
}

// ─── Life heart ───────────────────────────────────────────────────────────────

function Heart({ filled }) {
  return (
    <span className={`text-2xl transition-all ${filled ? 'opacity-100' : 'opacity-25'}`}>
      {filled ? '❤️' : '🤍'}
    </span>
  )
}

// ─── Timing feedback ──────────────────────────────────────────────────────────

function TimingFeedback({ message, success }) {
  if (!message) return null
  return (
    <div
      className={`absolute inset-x-0 top-1/3 flex items-center justify-center pointer-events-none z-10`}
    >
      <div
        className={`
          font-handwriting text-3xl font-bold px-6 py-3 rounded-2xl shadow-lg
          ${success ? 'bg-green-400/90 text-white' : 'bg-red-400/90 text-white'}
          animate-bounce
        `}
      >
        {message}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BridgeOfVinesGame() {
  const { socket } = useGame()
  const { gameState, sendInput } = useGameState()

  const [tapFlash, setTapFlash]           = useState(false)
  const [feedback, setFeedback]           = useState(null)  // { msg, success }
  const [partnerTapped, setPartnerTapped] = useState(false)
  const feedbackTimeout                   = useRef(null)

  const connections = gameState?.connections || 0
  const needed      = gameState?.needed      || 5
  const lives       = gameState?.lives       || 3
  const maxLives    = gameState?.maxLives    || 3
  const windowMs    = gameState?.currentWindow || 150

  // Listen for vine events
  useEffect(() => {
    if (!socket) return

    const onConnect = (data) => {
      showFeedback(`Connected! (${data.diffMs}ms)`, true)
    }
    const onMiss = (data) => {
      showFeedback(`Too ${data.diffMs > data.windowMs ? 'slow' : 'off'}! (${data.diffMs}ms)`, false)
    }
    const onTap = (data) => {
      // Flash partner indicator
      setPartnerTapped(true)
      setTimeout(() => setPartnerTapped(false), 300)
    }

    socket.on('game:vineConnect', onConnect)
    socket.on('game:vineMiss',    onMiss)
    socket.on('game:tap',         onTap)

    return () => {
      socket.off('game:vineConnect', onConnect)
      socket.off('game:vineMiss',    onMiss)
      socket.off('game:tap',         onTap)
    }
  }, [socket])

  function showFeedback(msg, success) {
    clearTimeout(feedbackTimeout.current)
    setFeedback({ msg, success })
    feedbackTimeout.current = setTimeout(() => setFeedback(null), 1200)
  }

  const handleTap = useCallback(() => {
    sendInput('tap', { timestamp: Date.now() })
    setTapFlash(true)
    setTimeout(() => setTapFlash(false), 180)
  }, [sendInput])

  if (!gameState) {
    return (
      <div className="flex items-center justify-center h-full bg-green-50">
        <div className="text-green-700 font-semibold">Weaving vines…</div>
      </div>
    )
  }

  const progress = connections / needed

  return (
    <div
      className="relative flex flex-col h-full select-none overflow-hidden"
      style={{
        touchAction: 'none',
        cursor: 'pointer',
        background: 'linear-gradient(180deg, #1a4a2e 0%, #2d6a3f 40%, #1a3a20 100%)',
      }}
      onTouchStart={handleTap}
      onClick={handleTap}
    >
      {/* Tap flash overlay */}
      {tapFlash && (
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{ background: 'radial-gradient(circle at 50% 70%, rgba(92,184,92,0.3) 0%, transparent 60%)' }}
        />
      )}

      {/* Feedback */}
      {feedback && <TimingFeedback message={feedback.msg} success={feedback.success} />}

      {/* Top — lives */}
      <div className="flex justify-center gap-2 pt-6 pb-2">
        {Array.from({ length: maxLives }).map((_, i) => (
          <Heart key={i} filled={i < lives} />
        ))}
      </div>

      {/* Window indicator */}
      <div className="text-center text-xs text-green-200/70 pb-2">
        Timing window: <span className="font-bold text-green-200">{windowMs}ms</span>
      </div>

      {/* Vine bridge graphic */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 gap-6">

        {/* Vine segments */}
        <div className="w-full flex items-center gap-2">
          {Array.from({ length: needed }).map((_, i) => (
            <VineSegment key={i} index={i} filled={i < connections} />
          ))}
        </div>

        {/* Chasm / gap visual */}
        <div className="relative w-full h-32 flex items-end justify-center">
          {/* Left cliff */}
          <div
            className="absolute left-0 bottom-0 rounded-tr-2xl"
            style={{
              width: `${(connections / needed) * 50 + 5}%`,
              height: '70%',
              background: 'linear-gradient(180deg, #5a8a4a, #2d4a20)',
            }}
          />
          {/* Right cliff */}
          <div
            className="absolute right-0 bottom-0 rounded-tl-2xl"
            style={{
              width: `${((needed - connections) / needed) * 50 + 5}%`,
              height: '70%',
              background: 'linear-gradient(180deg, #5a8a4a, #2d4a20)',
            }}
          />
          {/* Vine rope */}
          {connections > 0 && (
            <svg
              className="absolute bottom-0 left-0 w-full h-full pointer-events-none"
              viewBox="0 0 100 50" preserveAspectRatio="none"
            >
              <path
                d={`M 5 35 Q 50 ${45 - connections * 6} 95 35`}
                fill="none"
                stroke="#5cb85c"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          )}
        </div>

        {/* Partner indicator */}
        <div className="flex justify-center">
          <div
            className={`w-4 h-4 rounded-full transition-all duration-150 border-2 border-white/50`}
            style={{
              background: partnerTapped ? '#f5e642' : 'rgba(255,255,255,0.15)',
              boxShadow:  partnerTapped ? '0 0 10px #f5e642' : 'none',
            }}
          />
        </div>
        <div className="text-center text-xs text-green-200/60">
          Partner tapped {partnerTapped ? '⚡' : '...'}
        </div>
      </div>

      {/* Bottom — instruction */}
      <div className="px-8 pb-10 text-center">
        <div className="font-handwriting text-2xl font-bold text-white/90 mb-1">
          Tap together!
        </div>
        <div className="text-sm text-green-200/70">
          Both tap within <span className="font-bold">{windowMs}ms</span> of each other
          to grow a vine • {connections}/{needed} connected
        </div>
      </div>
    </div>
  )
}
