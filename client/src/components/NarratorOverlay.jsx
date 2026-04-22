import React, { useState, useEffect, useRef } from 'react'

export default function NarratorOverlay({ text, onDone }) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)
  const [visible, setVisible] = useState(false)
  const indexRef = useRef(0)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (!text) return
    setDisplayed('')
    setDone(false)
    indexRef.current = 0

    // Entrance delay
    const entranceTimer = setTimeout(() => setVisible(true), 50)

    intervalRef.current = setInterval(() => {
      if (indexRef.current < text.length) {
        setDisplayed(text.slice(0, indexRef.current + 1))
        indexRef.current++
      } else {
        clearInterval(intervalRef.current)
        setDone(true)
      }
    }, 28)

    return () => {
      clearTimeout(entranceTimer)
      clearInterval(intervalRef.current)
    }
  }, [text])

  const skipToEnd = () => {
    if (!done) {
      clearInterval(intervalRef.current)
      setDisplayed(text)
      setDone(true)
    } else {
      handleClose()
    }
  }

  const handleClose = () => {
    setVisible(false)
    setTimeout(() => {
      onDone?.()
    }, 300)
  }

  if (!text) return null

  return (
    <div
      className="absolute inset-0 z-40 flex items-end"
      style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-paper-card-dark/20 pointer-events-auto transition-opacity duration-300
          ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={skipToEnd}
      />

      {/* Note card */}
      <div
        className={`relative w-full pointer-events-auto transition-all duration-300
          ${visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}
        onClick={skipToEnd}
      >
        <div className="mx-4 paper-card shadow-paper-lg rounded-2xl px-6 py-5 relative overflow-visible">
          {/* Washi tape top */}
          <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-24 h-5
            bg-chapter-4/75 rounded-sm shadow-sm transform rotate-1" />

          {/* Ruled lines (visual only) */}
          <div className="absolute inset-x-6 top-8 space-y-6 pointer-events-none">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-px bg-blue-200/40" />
            ))}
          </div>

          {/* Narrator label */}
          <div className="font-handwriting text-xs text-paper-card-dark/40 uppercase tracking-wider mb-1">
            Narrator
          </div>

          {/* Text */}
          <p className="font-handwriting text-xl text-paper-card-dark leading-relaxed min-h-[4em] relative z-10">
            {displayed}
            {!done && (
              <span className="inline-block w-0.5 h-5 bg-paper-card-dark/60 ml-0.5 animate-pulse-soft" />
            )}
          </p>

          {/* Continue indicator */}
          {done && (
            <div className="flex items-center justify-end mt-3 gap-1 animate-fade-in">
              <span className="font-body text-sm text-paper-card-dark/50">Tap to continue</span>
              <span className="text-paper-card-dark/50 animate-bob inline-block">›</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
