import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useGame } from '../../context/GameContext.jsx'
import { useGameState } from '../../hooks/useGameState.js'

// ─── Keyboard component ───────────────────────────────────────────────────────

const ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['Z','X','C','V','B','N','M'],
]

function Keyboard({ onKey, disabled, flashKey, flashCorrect }) {
  return (
    <div className="flex flex-col items-center gap-1.5 w-full px-2">
      {ROWS.map((row, ri) => (
        <div key={ri} className="flex gap-1.5 justify-center">
          {row.map(letter => {
            const isFlash   = flashKey === letter
            const isCorrect = isFlash && flashCorrect
            const isWrong   = isFlash && !flashCorrect

            return (
              <button
                key={letter}
                disabled={disabled}
                onPointerDown={() => !disabled && onKey(letter)}
                className={[
                  'w-8 h-10 rounded-lg font-handwriting text-sm font-bold transition-all duration-75',
                  'border-2 shadow-sm active:scale-95 select-none',
                  disabled
                    ? 'bg-amber-100 border-amber-200 text-amber-400 cursor-not-allowed'
                    : isCorrect
                      ? 'bg-green-400 border-green-600 text-white scale-110'
                      : isWrong
                        ? 'bg-red-400 border-red-600 text-white animate-shake'
                        : 'bg-amber-50 border-amber-300 text-amber-900 active:bg-amber-200',
                ].join(' ')}
              >
                {letter}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ─── Word display ─────────────────────────────────────────────────────────────

function WordDisplay({ word, typed, expectedPlayer, myPlayerNum }) {
  if (!word) return null

  return (
    <div className="flex justify-center gap-1 flex-wrap px-4">
      {word.split('').map((letter, i) => {
        const isTyped    = i < (typed || '').length
        const isNext     = i === (typed || '').length
        const isMyTurn   = isNext && expectedPlayer === myPlayerNum
        const isP1Letter = i % 2 === 0
        const isP2Letter = i % 2 === 1

        return (
          <div
            key={i}
            className={[
              'w-9 h-12 flex items-center justify-center rounded-lg border-2 font-handwriting text-2xl font-bold transition-all duration-150',
              isTyped
                ? 'bg-green-200 border-green-500 text-green-800'
                : isMyTurn
                  ? 'bg-amber-200 border-amber-600 text-amber-900 scale-110 shadow-md'
                  : isNext
                    ? 'bg-stone-200 border-stone-400 text-stone-500'
                    : 'bg-white border-stone-200 text-stone-300',
            ].join(' ')}
          >
            {isTyped ? letter : isNext ? '_' : '·'}
          </div>
        )
      })}
    </div>
  )
}

// ─── Progress dots ────────────────────────────────────────────────────────────

function ProgressDots({ wordIndex, totalWords }) {
  return (
    <div className="flex justify-center gap-1.5">
      {Array.from({ length: totalWords }).map((_, i) => (
        <div
          key={i}
          className={[
            'w-2 h-2 rounded-full transition-all',
            i < wordIndex  ? 'bg-green-500'  :
            i === wordIndex ? 'bg-amber-500 scale-125' :
                              'bg-stone-300',
          ].join(' ')}
        />
      ))}
    </div>
  )
}

// ─── Timer bar ────────────────────────────────────────────────────────────────

function TimerBar({ timeLeft, duration }) {
  const pct   = Math.max(0, Math.min(100, (timeLeft / duration) * 100))
  const color = pct > 50 ? '#B5651D' : pct > 25 ? '#E8873A' : '#D94F3D'
  return (
    <div className="w-full h-2 rounded-full bg-amber-200 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function TandemTypingGame() {
  const { myRole } = useGame()
  const { gameState, sendInput } = useGameState()

  const myPlayerNum = myRole === 'player1' ? 1 : 2

  const [flashKey,     setFlashKey]     = useState(null)
  const [flashCorrect, setFlashCorrect] = useState(false)
  const flashRef = useRef(null)

  // Listen for key result events from server state
  const prevLastKey = useRef(null)
  useEffect(() => {
    if (!gameState?.lastKey) return
    const lk = gameState.lastKey
    // Only flash if it changed
    if (
      prevLastKey.current &&
      prevLastKey.current.letter === lk.letter &&
      prevLastKey.current.player === lk.player
    ) return
    prevLastKey.current = lk

    if (lk.player !== myPlayerNum) return

    setFlashKey(lk.letter)
    setFlashCorrect(lk.correct)

    clearTimeout(flashRef.current)
    flashRef.current = setTimeout(() => {
      setFlashKey(null)
      setFlashCorrect(false)
    }, 350)
  }, [gameState?.lastKey, myPlayerNum])

  const handleKey = useCallback((letter) => {
    sendInput('key', { letter })
  }, [sendInput])

  if (!gameState) {
    return (
      <div className="flex items-center justify-center h-full bg-amber-50">
        <div className="font-handwriting text-xl text-amber-800">Warming up the typewriter…</div>
      </div>
    )
  }

  const {
    phase, currentWord, typed, wordIndex, totalWords,
    expectedPlayer, expectedLetter, wordsComplete,
    timeLeft, duration, totalScore,
  } = gameState

  if (phase === 'complete' || phase === 'timeout') {
    const won = phase === 'complete'
    return (
      <div className="flex flex-col items-center justify-center h-full bg-amber-50 gap-5 px-8">
        <div className="text-6xl">{won ? '⌨️' : '⏱️'}</div>
        <div className="font-handwriting text-3xl font-bold text-amber-900 text-center">
          {won ? 'All Words Typed!' : 'Time\'s Up!'}
        </div>
        <div className="font-body text-sm text-amber-700 text-center">
          {wordsComplete}/{totalWords} words • Score: {totalScore}
        </div>
      </div>
    )
  }

  const isMyTurn = expectedPlayer === myPlayerNum
  const partnerTurn = !isMyTurn

  return (
    <div className="flex flex-col h-full bg-amber-50 overflow-hidden">
      {/* Header */}
      <div className="bg-amber-800 text-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-handwriting text-xl font-bold">Tandem Typing</div>
            <div className="text-xs opacity-70 font-body">
              {isMyTurn
                ? `Your turn — type the "${expectedLetter || '?'}" key`
                : 'Wait for your partner…'}
            </div>
          </div>
          <div className="text-right">
            <div className="font-handwriting text-2xl font-bold tabular-nums">{timeLeft}s</div>
            <div className="text-xs opacity-70 font-body">remaining</div>
          </div>
        </div>
        <div className="mt-2">
          <TimerBar timeLeft={timeLeft || 0} duration={duration || 90} />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-between gap-4 py-4 overflow-hidden">
        {/* Word progress dots */}
        <ProgressDots wordIndex={wordIndex || 0} totalWords={totalWords || 10} />

        {/* Turn indicator */}
        <div className={[
          'px-4 py-1.5 rounded-full font-handwriting text-sm font-bold border-2 transition-all',
          isMyTurn
            ? 'bg-amber-200 border-amber-500 text-amber-900'
            : 'bg-stone-100 border-stone-300 text-stone-500',
        ].join(' ')}>
          {isMyTurn ? 'YOUR TURN' : 'PARTNER\'S TURN'}
        </div>

        {/* Current word */}
        <div className="flex flex-col items-center gap-3 w-full">
          <div className="font-body text-xs text-amber-700/60 uppercase tracking-widest">
            Word {(wordIndex || 0) + 1} of {totalWords || 10}
          </div>
          <WordDisplay
            word={currentWord}
            typed={typed}
            expectedPlayer={expectedPlayer}
            myPlayerNum={myPlayerNum}
          />
        </div>

        {/* Keyboard */}
        <div className="w-full">
          <Keyboard
            onKey={handleKey}
            disabled={partnerTurn}
            flashKey={flashKey}
            flashCorrect={flashCorrect}
          />
        </div>
      </div>
    </div>
  )
}
