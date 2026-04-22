import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useGame } from '../context/GameContext.jsx'
import { GAME_REGISTRY } from '../games/index.jsx'
import AudioManager from '../audio/AudioManager.js'

function CountdownOverlay({ onDone }) {
  // Sequence: 3 → 2 → 1 → GO! → done
  const SEQUENCE = [3, 2, 1, 0]
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState('show') // 'show' | 'fade'
  const doneRef = useRef(false)

  useEffect(() => {
    doneRef.current = false
    setIdx(0)
    setPhase('show')
  }, [])

  useEffect(() => {
    if (doneRef.current) return

    const fadeTimer  = setTimeout(() => setPhase('fade'), 600)
    const advTimer   = setTimeout(() => {
      const nextIdx = idx + 1
      if (nextIdx < SEQUENCE.length) {
        setIdx(nextIdx)
        setPhase('show')
      } else {
        doneRef.current = true
        onDone?.()
      }
    }, 900)

    return () => { clearTimeout(fadeTimer); clearTimeout(advTimer) }
  }, [idx, onDone]) // eslint-disable-line react-hooks/exhaustive-deps

  const count = SEQUENCE[idx]
  const label = count === 0 ? 'GO!' : String(count)
  const color = count === 0 ? '#4A9E6B' : count === 1 ? '#D94F3D' : '#3D7BC4'

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-paper-card-dark/50">
      <div
        key={label}
        className={`font-handwriting font-bold text-8xl select-none
          ${phase === 'show' ? 'countdown-num' : 'countdown-fade'}`}
        style={{ color, textShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
      >
        {label}
      </div>
    </div>
  )
}

function PartnerDot({ latency, connected }) {
  if (!connected) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="w-2.5 h-2.5 rounded-full bg-red-400 animate-pulse" />
        <span className="font-body text-xs text-paper-card-dark/50">Waiting</span>
      </div>
    )
  }
  const quality = latency === 0 || latency == null ? 'good'
    : latency < 80  ? 'good'
    : latency < 200 ? 'ok'
    : 'bad'
  const dotColor = quality === 'good' ? 'bg-green-400'
    : quality === 'ok' ? 'bg-yellow-400'
    : 'bg-red-400'
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
      <span className="font-body text-xs text-paper-card-dark/50">
        {latency > 0 ? `${latency}ms` : 'Connected'}
      </span>
    </div>
  )
}

function TopBar({ gameTitle, stars = 0, partner, latency, onPause }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-paper-cream/90 backdrop-blur-sm
      border-b border-paper-kraft/20 safe-top">
      <button
        onClick={onPause}
        className="p-2 rounded-full active:scale-90 transition-transform"
        aria-label="Pause"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <rect x="5" y="4" width="4" height="16" rx="1" />
          <rect x="15" y="4" width="4" height="16" rx="1" />
        </svg>
      </button>

      <div className="flex flex-col items-center">
        <div className="font-handwriting text-base font-bold text-paper-card-dark leading-none">
          {gameTitle}
        </div>
        <div className="flex gap-1 mt-0.5">
          {[...Array(3)].map((_, i) => (
            <span key={i} className={`text-xs ${i < stars ? 'star-shine' : 'opacity-20 grayscale'}`}>⭐</span>
          ))}
        </div>
      </div>

      <PartnerDot latency={latency} connected={!!partner} />
    </div>
  )
}

function HintOverlay({ hint, onClose }) {
  if (!hint) return null
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-paper-card-dark/40 animate-fade-in"
      onClick={onClose}>
      <div className="mx-8 paper-card rounded-3xl shadow-paper-lg px-6 py-6 animate-slide-up"
        onClick={e => e.stopPropagation()}>
        <div className="text-3xl text-center mb-3">💡</div>
        <p className="font-handwriting text-xl text-center text-paper-card-dark leading-relaxed">
          {hint}
        </p>
        <button
          onClick={onClose}
          className="mt-5 w-full washi-btn py-3 rounded-xl text-base"
        >
          Got it!
        </button>
      </div>
    </div>
  )
}

function PauseMenu({ onResume, onHome }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-paper-card-dark/50 animate-fade-in">
      <div className="mx-8 w-full max-w-xs paper-card rounded-3xl shadow-paper-lg px-6 py-8">
        <h2 className="font-handwriting text-3xl font-bold text-center text-paper-card-dark mb-8">
          Paused
        </h2>
        <div className="flex flex-col gap-3">
          <button
            onClick={onResume}
            className="w-full washi-btn-primary py-4 rounded-xl text-xl"
          >
            Resume
          </button>
          <button
            onClick={onHome}
            className="w-full paper-card shadow-paper rounded-xl py-4
              font-handwriting text-xl text-paper-card-dark active:scale-95 transition-transform"
          >
            Quit Game
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MiniGameShell({ gameId, gameTitle, hint, role, onComplete, onHome, onNext, onRestart }) {
  const { partner, latency, gameState } = useGame()
  const [phase, setPhase] = useState('countdown') // 'countdown' | 'playing' | 'results' | 'paused'
  const [showHint, setShowHint] = useState(false)
  const [stars, setStars] = useState(0)
  const [score, setScore] = useState(0)

  const GameComponent = GAME_REGISTRY[gameId]

  // Reset to countdown whenever gameId changes (new game started)
  useEffect(() => {
    setPhase('countdown')
    setStars(0)
    setScore(0)
  }, [gameId])

  useEffect(() => {
    if (gameState?.phase === 'results') {
      setStars(gameState.stars || 0)
      setScore(gameState.score || 0)
      setPhase('results')
    }
  }, [gameState])

  const handleCountdownDone = useCallback(() => {
    setPhase('playing')
  }, [])

  const handlePause = () => setPhase('paused')
  const handleResume = () => setPhase('playing')

  // Resolve callbacks: support both old onComplete API and new onNext/onRestart props
  const handleNext = useCallback(() => {
    if (onNext) {
      onNext()
    } else {
      onComplete?.('next')
    }
  }, [onNext, onComplete])

  const handleRestart = useCallback(() => {
    if (onRestart) {
      onRestart()
    } else {
      onComplete?.('restart')
    }
    setPhase('countdown')
  }, [onRestart, onComplete])

  // Role-specific hint: if hint is an object { player1, player2 } use role key
  const resolvedHint = hint && typeof hint === 'object'
    ? hint[role] || hint.player1 || hint.default
    : hint

  if (!GameComponent) {
    return (
      <div className="flex flex-col h-full bg-paper-cream paper-texture items-center justify-center gap-4 safe-top">
        <div className="text-5xl">🚧</div>
        <div className="font-handwriting text-2xl text-paper-card-dark">Coming Soon</div>
        <div className="font-body text-sm text-paper-card-dark/55 px-8 text-center">
          {gameTitle} is still being crafted with care.
        </div>
        <button onClick={onHome} className="washi-btn mt-4">Back to Menu</button>
      </div>
    )
  }

  const resultMessage = stars === 3 ? 'Perfect! 🎉' : stars === 2 ? 'Great work! ✨' : stars === 1 ? 'Nice try! 💪' : 'Keep going…'

  return (
    <div className="relative flex flex-col h-full bg-paper-card-dark overflow-hidden">
      {/* Top bar */}
      <TopBar
        gameTitle={gameTitle || gameId}
        stars={stars}
        partner={partner}
        latency={latency}
        onPause={handlePause}
      />

      {/* Hint button (floating) */}
      {resolvedHint && (
        <button
          onClick={() => setShowHint(true)}
          className="absolute bottom-24 right-4 z-10 w-12 h-12 rounded-full
            bg-paper-cream/90 shadow-paper flex items-center justify-center
            text-xl active:scale-90 transition-transform safe-bottom"
          aria-label="Show hint"
        >
          💡
        </button>
      )}

      {/* Game area */}
      <div className="flex-1 relative overflow-hidden">
        {(phase === 'playing' || phase === 'results') && (
          <GameComponent />
        )}

        {phase === 'countdown' && (
          <>
            {/* Show game behind countdown */}
            {GameComponent && <div className="absolute inset-0 opacity-30 pointer-events-none"><GameComponent /></div>}
            <CountdownOverlay onDone={handleCountdownDone} />
          </>
        )}

        {/* Overlays */}
        {showHint && <HintOverlay hint={resolvedHint} onClose={() => setShowHint(false)} />}
        {phase === 'paused' && <PauseMenu onResume={handleResume} onHome={onHome} />}

        {/* Results overlay */}
        {phase === 'results' && (
          <div
            className="absolute inset-0 z-20 flex items-end bg-paper-card-dark/30 animate-fade-in"
            style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
          >
            <div className="w-full mx-4 mb-4 paper-card rounded-3xl shadow-paper-lg px-6 py-6 animate-slide-up">
              {/* Message */}
              <div className="text-center mb-3">
                <div className="font-handwriting text-2xl font-bold text-paper-card-dark mb-2">
                  {resultMessage}
                </div>

                {/* Stars */}
                <div className="flex justify-center gap-2 mb-2">
                  {[...Array(3)].map((_, i) => (
                    <span
                      key={i}
                      className={`text-3xl ${i < stars ? 'animate-star-pop star-shine' : 'opacity-20 grayscale'}`}
                      style={{ animationDelay: `${i * 0.2}s` }}
                    >
                      ⭐
                    </span>
                  ))}
                </div>

                {/* Score */}
                {score > 0 && (
                  <div className="font-handwriting text-lg text-paper-card-dark/70">
                    {score.toLocaleString()} pts
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleNext}
                  className="w-full washi-btn-primary py-4 rounded-xl text-xl"
                >
                  Next Game →
                </button>
                <button
                  onClick={handleRestart}
                  className="w-full paper-card shadow-paper rounded-xl py-3
                    font-handwriting text-lg text-paper-card-dark active:scale-95 transition-transform"
                >
                  Play Again
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
