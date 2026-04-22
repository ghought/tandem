import React, { useState, useEffect } from 'react'
import Character from './Character.jsx'

// Floating paper decoration elements
const FLOATERS = [
  { shape: 'star',    x: 8,  y: 12, r: '-8deg',  delay: '0s',   size: 28, color: '#E8A598' },
  { shape: 'heart',   x: 82, y: 8,  r: '12deg',  delay: '0.7s', size: 22, color: '#98B8E8' },
  { shape: 'circle',  x: 15, y: 70, r: '-5deg',  delay: '1.1s', size: 18, color: '#A8D5A2' },
  { shape: 'square',  x: 75, y: 72, r: '18deg',  delay: '0.4s', size: 24, color: '#E8CE98' },
  { shape: 'star',    x: 88, y: 38, r: '-14deg', delay: '1.5s', size: 20, color: '#C4A8D5' },
  { shape: 'diamond', x: 5,  y: 42, r: '8deg',   delay: '0.9s', size: 16, color: '#E87CA0' },
  { shape: 'circle',  x: 50, y: 78, r: '0deg',   delay: '2.1s', size: 14, color: '#4ABCAA' },
]

function FloatingShape({ shape, x, y, r, delay, size, color }) {
  const style = {
    left: `${x}%`,
    top: `${y}%`,
    '--r': r,
    '--delay': delay,
    animationDelay: delay,
    opacity: 0.55,
  }

  const shapeEl = (() => {
    switch (shape) {
      case 'star':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24">
            <polygon
              points="12,2 15.1,8.3 22,9.3 17,14.1 18.2,21 12,17.8 5.8,21 7,14.1 2,9.3 8.9,8.3"
              fill={color} stroke="rgba(61,43,31,0.25)" strokeWidth="1"
            />
          </svg>
        )
      case 'heart':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24">
            <path
              d="M12 21C12 21 3 13.5 3 8a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 5.5-9 13-9 13z"
              fill={color} stroke="rgba(61,43,31,0.25)" strokeWidth="1"
            />
          </svg>
        )
      case 'circle':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" fill={color} stroke="rgba(61,43,31,0.25)" strokeWidth="1" />
          </svg>
        )
      case 'square':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24">
            <rect x="3" y="3" width="18" height="18" rx="3" fill={color} stroke="rgba(61,43,31,0.25)" strokeWidth="1" />
          </svg>
        )
      case 'diamond':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24">
            <polygon points="12,2 22,12 12,22 2,12" fill={color} stroke="rgba(61,43,31,0.25)" strokeWidth="1" />
          </svg>
        )
      default:
        return null
    }
  })()

  return (
    <div
      className="absolute pointer-events-none floating-paper"
      style={style}
    >
      {shapeEl}
    </div>
  )
}

export default function HomeScreen({ onStoryMode, onPlayMode, onJoinGame, onCharms, onSettings }) {
  const [joinOpen, setJoinOpen] = useState(false)
  const [roomCode, setRoomCode] = useState('')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  const handleJoin = () => {
    if (roomCode.trim().length >= 4) {
      onJoinGame?.(roomCode.trim().toUpperCase())
    }
  }

  return (
    <div className="relative flex flex-col h-full bg-paper-cream paper-texture overflow-hidden safe-top safe-bottom select-none">
      {/* Floating background decorations */}
      {FLOATERS.map((f, i) => (
        <FloatingShape key={i} {...f} />
      ))}

      {/* Paper grain overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.07'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Main content */}
      <div
        className={`flex flex-col flex-1 items-center justify-between px-6 transition-all duration-700
          ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
      >
        {/* Title area */}
        <div className="flex flex-col items-center pt-12 pb-4">
          {/* Characters flanking the title */}
          <div className="flex items-end gap-4 mb-2">
            <div className="mb-1" style={{ animationDelay: '0.3s' }}>
              <Character color="blue" accessory="glasses" expression="happy" size={72} animation="idle" />
            </div>
            <div className="flex flex-col items-center">
              {/* Title card */}
              <div className="relative px-6 py-3 paper-card shadow-paper-lg">
                {/* Corner stickers */}
                <div className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-chapter-1 border border-paper-kraft/30 shadow-sm" />
                <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-chapter-2 border border-paper-kraft/30 shadow-sm" />
                <h1 className="font-handwriting text-6xl font-bold text-paper-card-dark tracking-tight leading-none">
                  TANDEM
                </h1>
              </div>
              <p className="font-handwriting text-lg text-paper-card-dark/60 mt-3 text-center">
                Better together. Obviously.
              </p>
            </div>
            <div className="mb-1" style={{ animationDelay: '0.6s' }}>
              <Character color="pink" accessory="bow" expression="happy" size={72} animation="idle" />
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-4 w-full max-w-xs mb-8">
          <button
            onClick={onStoryMode}
            className="relative group flex items-center gap-4 px-6 py-4 paper-card shadow-paper-lg
              active:scale-95 transition-transform"
          >
            <div className="w-12 h-12 rounded-xl bg-chapter-1/60 flex items-center justify-center text-2xl shadow-sm">
              📖
            </div>
            <div className="text-left">
              <div className="font-handwriting text-2xl font-bold text-paper-card-dark">Story Mode</div>
              <div className="font-body text-sm text-paper-card-dark/55">Follow Kit & Mika's journey</div>
            </div>
            <div className="ml-auto text-paper-card-dark/30">›</div>
            {/* Washi tape accent */}
            <div className="absolute -top-1.5 left-8 w-16 h-3 bg-chapter-1/70 rounded-sm transform -rotate-1 shadow-sm" />
          </button>

          <button
            onClick={onPlayMode}
            className="relative group flex items-center gap-4 px-6 py-4 paper-card shadow-paper-lg
              active:scale-95 transition-transform"
          >
            <div className="w-12 h-12 rounded-xl bg-chapter-2/60 flex items-center justify-center text-2xl shadow-sm">
              🎮
            </div>
            <div className="text-left">
              <div className="font-handwriting text-2xl font-bold text-paper-card-dark">Play Mode</div>
              <div className="font-body text-sm text-paper-card-dark/55">Pick any mini-game</div>
            </div>
            <div className="ml-auto text-paper-card-dark/30">›</div>
            <div className="absolute -top-1.5 left-8 w-16 h-3 bg-chapter-2/70 rounded-sm transform rotate-1 shadow-sm" />
          </button>

          <button
            onClick={() => setJoinOpen(true)}
            className="relative group flex items-center gap-4 px-6 py-4 paper-card shadow-paper-lg
              active:scale-95 transition-transform"
          >
            <div className="w-12 h-12 rounded-xl bg-chapter-3/60 flex items-center justify-center text-2xl shadow-sm">
              🔗
            </div>
            <div className="text-left">
              <div className="font-handwriting text-2xl font-bold text-paper-card-dark">Join Game</div>
              <div className="font-body text-sm text-paper-card-dark/55">Enter your partner's code</div>
            </div>
            <div className="ml-auto text-paper-card-dark/30">›</div>
            <div className="absolute -top-1.5 left-8 w-16 h-3 bg-chapter-3/70 rounded-sm transform -rotate-0.5 shadow-sm" />
          </button>
        </div>

        {/* Bottom icons */}
        <div className="flex justify-center gap-8 pb-4">
          <button
            onClick={onCharms}
            className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
          >
            <div className="w-14 h-14 rounded-2xl paper-card shadow-paper flex items-center justify-center text-2xl">
              ✨
            </div>
            <span className="font-body text-xs text-paper-card-dark/55">Charms</span>
          </button>
          <button
            onClick={onSettings}
            className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
          >
            <div className="w-14 h-14 rounded-2xl paper-card shadow-paper flex items-center justify-center text-2xl">
              ⚙️
            </div>
            <span className="font-body text-xs text-paper-card-dark/55">Settings</span>
          </button>
        </div>
      </div>

      {/* Join Game Sheet */}
      {joinOpen && (
        <div className="absolute inset-0 flex items-end z-50 animate-fade-in">
          <div
            className="absolute inset-0 bg-paper-card-dark/40"
            onClick={() => setJoinOpen(false)}
          />
          <div className="relative w-full bg-paper-cream paper-texture rounded-t-3xl shadow-paper-lg px-6 pt-6 pb-10 animate-slide-up safe-bottom">
            <div className="w-12 h-1.5 bg-paper-card-dark/20 rounded-full mx-auto mb-6" />
            <h2 className="font-handwriting text-3xl font-bold text-paper-card-dark mb-2">Join a Game</h2>
            <p className="font-body text-sm text-paper-card-dark/55 mb-6">
              Ask your partner for their room code
            </p>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="ABCD12"
              className="w-full font-handwriting text-4xl text-center text-paper-card-dark
                bg-paper-watercolor border-2 border-paper-kraft/40 rounded-2xl px-4 py-4
                tracking-widest outline-none focus:border-paper-kraft mb-6"
              autoFocus
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck="false"
            />
            <button
              onClick={handleJoin}
              disabled={roomCode.length < 4}
              className="w-full washi-btn-primary text-xl py-4 rounded-xl disabled:opacity-40"
            >
              Join →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
