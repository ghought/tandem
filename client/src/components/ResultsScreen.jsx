import React, { useState, useEffect } from 'react'
import Character from './Character.jsx'
import { useGame } from '../context/GameContext.jsx'
import AudioManager from '../audio/AudioManager.js'

function StarDisplay({ count, total = 3, delay = 0 }) {
  const [shown, setShown] = useState(0)

  useEffect(() => {
    let timer
    const show = (i) => {
      if (i <= count) {
        setShown(i)
        if (i < count) timer = setTimeout(() => show(i + 1), 300)
      }
    }
    const startTimer = setTimeout(() => show(1), delay)
    return () => { clearTimeout(startTimer); clearTimeout(timer) }
  }, [count, delay])

  const tryPlaySparkle = async (i) => {
    try {
      await AudioManager.init()
      if (i <= count) AudioManager.playSparkle()
    } catch (_) {}
  }

  return (
    <div className="flex gap-2">
      {[...Array(total)].map((_, i) => {
        const earned = i < shown
        return (
          <div
            key={i}
            onAnimationStart={() => tryPlaySparkle(i + 1)}
            className={`text-4xl transition-all duration-200
              ${earned ? 'star-shine animate-star-pop' : 'opacity-20 grayscale'}`}
            style={{ animationDelay: `${i * 0.15}s` }}
          >
            ⭐
          </div>
        )
      })}
    </div>
  )
}

export default function ResultsScreen({ onPlayAgain, onNextGame, onHome }) {
  const { player, partner, gameResults } = useGame()
  const [visible, setVisible] = useState(false)

  const stars = gameResults?.stars ?? 2
  const score = gameResults?.score ?? 0
  const partnerScore = gameResults?.partnerScore ?? 0
  const gameTitle = gameResults?.gameTitle ?? 'Mini Game'
  const message = gameResults?.message ?? 'Great teamwork!'

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100)
    return () => clearTimeout(t)
  }, [])

  const expression = stars === 3 ? 'surprised' : stars >= 2 ? 'happy' : 'neutral'

  return (
    <div className={`flex flex-col h-full bg-paper-cream paper-texture safe-top safe-bottom
      transition-all duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}>

      {/* Header strip */}
      <div className="relative px-5 pt-4 pb-3 flex justify-center">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-chapter-1 via-chapter-4 to-chapter-2" />
        <h2 className="font-handwriting text-2xl font-bold text-paper-card-dark">{gameTitle}</h2>
      </div>

      {/* Characters */}
      <div className="flex justify-around items-end px-8 py-4">
        <div className="flex flex-col items-center gap-2 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <Character
            color={player.palette}
            accessory={player.accessory}
            expression={expression}
            size={100}
            animation="idle"
          />
          <div className="font-handwriting text-base font-semibold text-paper-card-dark">
            {player.name}
          </div>
          <div className="font-handwriting text-2xl font-bold text-paper-card-dark">
            {score.toLocaleString()}
          </div>
        </div>

        {/* Center stars */}
        <div className="flex flex-col items-center gap-3">
          <div className="font-handwriting text-lg text-paper-card-dark/60">Together</div>
          <StarDisplay count={stars} total={3} delay={600} />
        </div>

        {partner ? (
          <div className="flex flex-col items-center gap-2 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <Character
              color={partner.palette}
              accessory={partner.accessory}
              expression={expression}
              size={100}
              animation="idle"
            />
            <div className="font-handwriting text-base font-semibold text-paper-card-dark">
              {partner.name}
            </div>
            <div className="font-handwriting text-2xl font-bold text-paper-card-dark">
              {partnerScore.toLocaleString()}
            </div>
          </div>
        ) : (
          <div className="w-24" />
        )}
      </div>

      {/* Message banner */}
      <div className="mx-5 mb-4 paper-card rounded-2xl px-5 py-3 shadow-paper relative animate-slide-up"
        style={{ animationDelay: '0.4s' }}>
        <div className="absolute -top-2 left-8 w-14 h-3.5 bg-chapter-4/80 rounded-sm shadow-sm transform rotate-1" />
        <p className="font-handwriting text-xl text-center text-paper-card-dark">
          {message}
        </p>
      </div>

      {/* Combined score */}
      <div className="mx-5 mb-4 flex items-center justify-center gap-4
        bg-paper-watercolor rounded-2xl px-5 py-3 border border-paper-kraft/25 animate-slide-up"
        style={{ animationDelay: '0.5s' }}>
        <div className="text-center">
          <div className="font-body text-xs text-paper-card-dark/50 uppercase tracking-wide">Total</div>
          <div className="font-handwriting text-3xl font-bold text-paper-card-dark">
            {(score + partnerScore).toLocaleString()}
          </div>
        </div>
      </div>

      <div className="flex-1" />

      {/* Action buttons */}
      <div className="px-5 pb-5 flex flex-col gap-3 animate-slide-up" style={{ animationDelay: '0.7s' }}>
        {onNextGame && (
          <button
            onClick={onNextGame}
            className="w-full washi-btn-primary text-xl py-4 rounded-xl"
          >
            Next Game →
          </button>
        )}
        {onPlayAgain && (
          <button
            onClick={onPlayAgain}
            className="w-full paper-card shadow-paper rounded-xl py-4
              font-handwriting text-xl text-paper-card-dark active:scale-95 transition-transform"
          >
            Play Again
          </button>
        )}
        {onHome && (
          <button
            onClick={onHome}
            className="w-full py-3 font-body text-sm text-paper-card-dark/50 active:scale-95 transition-transform"
          >
            Back to Menu
          </button>
        )}
      </div>
    </div>
  )
}
