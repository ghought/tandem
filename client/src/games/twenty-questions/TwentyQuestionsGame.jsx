import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useGame } from '../../context/GameContext.jsx'
import { useGameState } from '../../hooks/useGameState.js'

// ─── P1 view — the Secret Keeper ─────────────────────────────────────────────

function SecretKeeperView({ state, sendInput }) {
  const {
    secretWord, questionsLeft, maxQuestions, pendingQuestion, questionsAsked = [],
  } = state || {}

  const [holding, setHolding]   = useState(false)
  const holdTimer               = useRef(null)
  const HOLD_THRESHOLD_MS       = 500

  const handleTouchStart = useCallback(() => {
    holdTimer.current = setTimeout(() => {
      setHolding(true)
    }, HOLD_THRESHOLD_MS)
  }, [])

  const handleTouchEnd = useCallback(() => {
    clearTimeout(holdTimer.current)
    if (pendingQuestion) {
      if (holding) {
        sendInput('no', {})
      } else {
        sendInput('yes', {})
      }
    }
    setHolding(false)
  }, [holding, pendingQuestion, sendInput])

  // Keyboard support
  const handleKeyDown = useCallback((e) => {
    if (!pendingQuestion) return
    if (e.key === 'y' || e.key === 'Y') sendInput('yes', {})
    if (e.key === 'n' || e.key === 'N') sendInput('no', {})
  }, [pendingQuestion, sendInput])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div className="flex flex-col h-full bg-stone-800 px-4 py-6 gap-4 select-none">
      {/* Your word */}
      <div className="text-center">
        <div className="text-xs uppercase tracking-widest text-stone-400 mb-2">Your secret word</div>
        <div
          className="font-handwriting text-4xl font-bold text-amber-300 px-6 py-4 rounded-2xl border-2 border-amber-400/40"
          style={{ background: 'rgba(251,191,36,0.08)', letterSpacing: '0.04em' }}
        >
          {secretWord}
        </div>
        <div className="text-xs text-stone-500 mt-2">Don't show your partner!</div>
      </div>

      {/* Questions counter */}
      <div className="flex items-center gap-3 bg-stone-700 rounded-xl px-4 py-3">
        <div className="text-stone-300 text-sm">Questions left:</div>
        <div className="flex-1 h-2 bg-stone-600 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${((questionsLeft || 0) / (maxQuestions || 20)) * 100}%`,
              background: (questionsLeft || 0) > 10 ? '#38a169' : (questionsLeft || 0) > 5 ? '#dd6b20' : '#e53e3e',
            }}
          />
        </div>
        <div className="text-stone-200 font-bold tabular-nums">{questionsLeft}/{maxQuestions}</div>
      </div>

      {/* Instructions */}
      <div className="bg-stone-700/50 rounded-xl px-4 py-3 text-center">
        <div className="text-stone-300 text-sm font-semibold mb-1">How to answer:</div>
        <div className="flex gap-4 justify-center text-sm text-stone-400">
          <div>
            <span className="text-green-400 font-bold">Quick tap</span> = Yes
          </div>
          <div>
            <span className="text-red-400 font-bold">Hold</span> = No
          </div>
        </div>
      </div>

      {/* Pending question */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        {pendingQuestion ? (
          <>
            <div className="text-xs text-stone-400 uppercase tracking-wide">Question</div>
            <div className="bg-stone-700 rounded-2xl px-6 py-5 text-center w-full">
              <div className="font-handwriting text-xl font-bold text-white leading-snug">
                {pendingQuestion.text}
              </div>
            </div>

            {/* Tap area */}
            <div
              className={`
                w-full rounded-3xl transition-all duration-150 py-8 text-center cursor-pointer
                ${holding
                  ? 'bg-red-500/30 border-2 border-red-400'
                  : 'bg-green-500/20 border-2 border-green-400/50'
                }
              `}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onMouseDown={handleTouchStart}
              onMouseUp={handleTouchEnd}
              style={{ touchAction: 'none' }}
            >
              <div className={`font-handwriting text-3xl font-bold ${holding ? 'text-red-300' : 'text-green-300'}`}>
                {holding ? 'Release for NO' : 'Tap for YES / Hold for NO'}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center text-stone-500">
            <div className="text-4xl mb-3">🤔</div>
            <div className="text-sm">Waiting for your partner's question…</div>
          </div>
        )}
      </div>

      {/* Recent answers */}
      {questionsAsked.length > 0 && (
        <div className="max-h-28 overflow-y-auto flex flex-col gap-1">
          {[...questionsAsked].reverse().slice(0, 4).map((qa, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-stone-400">
              <span className={`font-bold ${qa.answer === 'yes' ? 'text-green-400' : 'text-red-400'}`}>
                {qa.answer === 'yes' ? 'YES' : 'NO'}
              </span>
              <span className="truncate">{qa.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── P2 view — the Guesser ────────────────────────────────────────────────────

function GuesserView({ state, sendInput }) {
  const {
    questionsLeft, maxQuestions, availableQuestions = [],
    questionsAsked = [], pendingQuestion, phase, guessOptions = [],
  } = state || {}

  const [selectedGuess, setSelectedGuess] = useState(null)
  const [waitingAnswer, setWaitingAnswer]  = useState(false)

  // When a question is answered, clear waiting state
  useEffect(() => {
    if (!pendingQuestion) setWaitingAnswer(false)
  }, [pendingQuestion])

  const handleQuestion = useCallback((qId) => {
    if (waitingAnswer) return
    sendInput('question', { questionId: qId })
    setWaitingAnswer(true)
  }, [waitingAnswer, sendInput])

  const handleReadyToGuess = useCallback(() => {
    sendInput('readyToGuess', {})
  }, [sendInput])

  const handleGuess = useCallback(() => {
    if (!selectedGuess) return
    sendInput('guess', { word: selectedGuess })
  }, [selectedGuess, sendInput])

  if (phase === 'guessing') {
    return (
      <div className="flex flex-col h-full bg-amber-50 px-4 py-5 gap-4">
        <div className="text-center">
          <div className="font-handwriting text-2xl font-bold text-amber-900">Make Your Guess!</div>
          <div className="text-sm text-amber-700/70 mt-1">What is the secret word?</div>
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-2">
          {guessOptions.map(word => (
            <button
              key={word}
              onClick={() => setSelectedGuess(word === selectedGuess ? null : word)}
              className={`
                py-3 px-2 rounded-2xl border-2 font-semibold text-sm capitalize transition-all active:scale-95
                ${selectedGuess === word
                  ? 'bg-amber-500 border-amber-600 text-white'
                  : 'bg-white border-stone-200 text-stone-700 hover:border-amber-400'
                }
              `}
            >
              {word}
            </button>
          ))}
        </div>

        <button
          onClick={handleGuess}
          disabled={!selectedGuess}
          className={`
            w-full py-4 rounded-2xl font-bold text-xl shadow transition-all active:scale-95
            ${selectedGuess
              ? 'bg-amber-600 hover:bg-amber-700 text-white'
              : 'bg-stone-200 text-stone-400 cursor-not-allowed'
            }
          `}
        >
          {selectedGuess ? `Guess: "${selectedGuess}"` : 'Select your guess'}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-amber-50 px-4 py-5 gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="font-handwriting text-xl font-bold text-amber-900">Ask Questions</div>
          <div className="text-xs text-amber-700/60">{questionsLeft} questions left</div>
        </div>
        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(maxQuestions || 20, 20) }).map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{
                background: i < (maxQuestions - questionsLeft)
                  ? '#d69e2e'
                  : 'rgba(0,0,0,0.1)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Waiting indicator */}
      {waitingAnswer && pendingQuestion && (
        <div className="bg-amber-200 rounded-xl px-4 py-2 text-center text-sm font-semibold text-amber-800 animate-pulse">
          Waiting for answer to: "{pendingQuestion.text}"
        </div>
      )}

      {/* Recent history */}
      {questionsAsked.length > 0 && (
        <div className="flex flex-col gap-1 max-h-24 overflow-y-auto">
          {[...questionsAsked].reverse().slice(0, 3).map((qa, i) => (
            <div key={i} className="flex items-center gap-2 text-xs bg-white rounded-lg px-3 py-1.5 border border-stone-200">
              <span className={`font-bold ${qa.answer === 'yes' ? 'text-green-600' : 'text-red-500'}`}>
                {qa.answer === 'yes' ? 'YES' : 'NO'}
              </span>
              <span className="text-stone-600 truncate">{qa.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Question buttons */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-2">
        {availableQuestions.map(q => (
          <button
            key={q.id}
            onClick={() => handleQuestion(q.id)}
            disabled={waitingAnswer}
            className={`
              w-full text-left px-4 py-3 rounded-2xl border-2 text-sm font-medium transition-all active:scale-98
              ${waitingAnswer
                ? 'border-stone-200 bg-stone-50 text-stone-400 cursor-not-allowed'
                : 'border-stone-200 bg-white text-stone-700 hover:border-amber-400 hover:bg-amber-50 active:scale-[0.99]'
              }
            `}
          >
            {q.text}
          </button>
        ))}
      </div>

      {/* Ready to guess */}
      <button
        onClick={handleReadyToGuess}
        className="w-full py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-base shadow transition-all active:scale-95"
      >
        I'm ready to guess! →
      </button>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function TwentyQuestionsGame() {
  const { myRole, socket } = useGame()
  const { gameState, sendInput } = useGameState()

  const [guessResult, setGuessResult] = useState(null)

  const isP1 = myRole === 'player1'

  useEffect(() => {
    if (!socket) return
    const onResult = (data) => setGuessResult(data)
    socket.on('game:guessResult', onResult)
    return () => socket.off('game:guessResult', onResult)
  }, [socket])

  if (!gameState) {
    return (
      <div className="flex items-center justify-center h-full bg-amber-50">
        <div className="text-amber-700 font-semibold">Loading…</div>
      </div>
    )
  }

  if (gameState.phase === 'complete' || guessResult) {
    const result = guessResult || {}
    return (
      <div className="flex flex-col items-center justify-center h-full bg-amber-50 gap-5 px-8">
        <div className="text-6xl">{result.correct ? '🎉' : '😔'}</div>
        <div className="font-handwriting text-2xl font-bold text-amber-900 text-center">
          {result.correct ? 'You got it!' : 'Not quite!'}
        </div>
        {result.secretWord && (
          <div className="text-center">
            <div className="text-sm text-amber-700/70">The secret word was</div>
            <div className="font-handwriting text-3xl font-bold text-amber-800 mt-1">{result.secretWord}</div>
          </div>
        )}
        {result.guess && !result.correct && (
          <div className="text-sm text-amber-700/60">Your guess: "{result.guess}"</div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {isP1
        ? <SecretKeeperView state={gameState} sendInput={sendInput} />
        : <GuesserView state={gameState} sendInput={sendInput} />
      }
    </div>
  )
}
