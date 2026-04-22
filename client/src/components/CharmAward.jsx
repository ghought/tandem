import React, { useEffect, useState } from 'react'
import Character from './Character.jsx'
import { useGame } from '../context/GameContext.jsx'

// ─── Charm SVGs ───────────────────────────────────────────────────────────────

function CharmSVG({ chapterId, size = 72 }) {
  const s = size
  switch (Number(chapterId)) {
    case 1: // Flower — layered petals radiating from center
      return (
        <svg width={s} height={s} viewBox="0 0 64 64" aria-hidden="true">
          {[0, 60, 120, 180, 240, 300].map((deg, i) => (
            <ellipse
              key={i}
              cx="32" cy="20"
              rx="6" ry="13"
              fill={i % 2 === 0 ? '#F4B8C1' : '#FDDCAE'}
              opacity="0.92"
              transform={`rotate(${deg}, 32, 32)`}
            />
          ))}
          <circle cx="32" cy="32" r="10" fill="#F6E596" stroke="#E8A040" strokeWidth="1.5" />
          <circle cx="32" cy="32" r="4"  fill="#E8A040" />
        </svg>
      )

    case 2: // Wooden spoon — rounded rect handle + oval bowl
      return (
        <svg width={s} height={s} viewBox="0 0 64 64" aria-hidden="true">
          <rect x="28" y="8" width="8" height="36" rx="4" fill="#C4863C" />
          <ellipse cx="32" cy="50" rx="12" ry="8" fill="#D4944A" stroke="#B07030" strokeWidth="1.5" />
          <line x1="26" y1="10" x2="26" y2="44" stroke="#B07030" strokeWidth="1" opacity="0.4" />
        </svg>
      )

    case 3: // Gear — 12-point gear with center hub
      return (
        <svg width={s} height={s} viewBox="0 0 64 64" aria-hidden="true">
          <path
            d="M27 8 L30 4 L34 4 L37 8 L41 6 L44 9 L42 13 L46 17 L50 16 L52 20 L49 23
               L52 27 L56 28 L56 32 L52 33 L50 37 L52 41 L50 44 L46 43 L42 47 L44 51
               L41 54 L37 52 L34 56 L30 56 L27 52 L23 54 L20 51 L22 47 L18 43 L14 44
               L12 41 L14 37 L12 33 L8 32 L8 28 L12 27 L14 23 L12 20 L14 17 L18 17
               L22 13 L20 9 L23 6 Z"
            fill="#D4AF37" stroke="#B8920A" strokeWidth="1.2"
          />
          <circle cx="32" cy="32" r="10" fill="#F0D060" stroke="#B8920A" strokeWidth="1.5" />
          <circle cx="32" cy="32" r="5"  fill="#B8920A" />
        </svg>
      )

    case 4: // Music note — standard quarter note
      return (
        <svg width={s} height={s} viewBox="0 0 64 64" aria-hidden="true">
          <ellipse cx="22" cy="50" rx="10" ry="7"
            fill="#2D1B4E" transform="rotate(-15 22 50)" />
          <ellipse cx="22" cy="50" rx="7" ry="5"
            fill="#C77DFF" opacity="0.4" transform="rotate(-15 22 50)" />
          <rect x="31" y="10" width="5" height="38" rx="2" fill="#2D1B4E" />
          <path d="M36 10 L54 15 L54 26 L36 21 Z" fill="#6A0572" />
        </svg>
      )

    case 5: // Lighthouse — layered rectangles with beacon light
      return (
        <svg width={s} height={s} viewBox="0 0 64 64" aria-hidden="true">
          {/* Light beam */}
          <path d="M32 22 L50 8 L56 16 L32 28 Z" fill="#FFD700" opacity="0.25" />
          {/* Tower body */}
          <rect x="24" y="22" width="16" height="34" rx="2" fill="#E8E0D0" stroke="#C4B8A0" strokeWidth="1.5" />
          {/* Stripes */}
          <rect x="24" y="30" width="16" height="5" fill="#D94F3D" opacity="0.6" />
          <rect x="24" y="44" width="16" height="5" fill="#D94F3D" opacity="0.6" />
          {/* Cap / lantern room */}
          <polygon points="20,22 32,6 44,22" fill="#D94F3D" stroke="#B83020" strokeWidth="1.5" />
          <rect x="22" y="20" width="20" height="5" rx="1" fill="#F0E8D8" stroke="#C4B8A0" strokeWidth="1" />
          {/* Light window */}
          <rect x="28" y="22" width="8" height="6" rx="1" fill="#FFD700" opacity="0.9" />
          {/* Base */}
          <rect x="20" y="54" width="24" height="4" rx="1" fill="#C4B8A0" />
        </svg>
      )

    case 6: // Heart — classic heart path
    default:
      return (
        <svg width={s} height={s} viewBox="0 0 64 64" aria-hidden="true">
          <path
            d="M32 54 C32 54 7 37 7 22 C7 13 13 7 21 7 C26 7 30 10 32 13 C34 10 38 7 43 7 C51 7 57 13 57 22 C57 37 32 54 32 54 Z"
            fill="#D94F3D" stroke="#B83020" strokeWidth="2"
          />
          {/* Highlight fold */}
          <path d="M32 14 C32 14 27 9 21 9" stroke="white" strokeWidth="2.5"
            opacity="0.3" strokeLinecap="round" />
        </svg>
      )
  }
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const CHARM_LABELS = {
  charm_first_thread:   'Paper Flower',
  charm_shared_kitchen: 'Wooden Spoon',
  charm_workshop:       'Golden Gear',
  charm_concert_hall:   'Music Note',
  charm_storm:          'Lighthouse',
  charm_summit:         'Heart',
}

const FALLBACK_CHAPTER_NAMES = {
  1: 'The First Thread',
  2: 'The Shared Kitchen',
  3: 'The Workshop',
  4: 'The Concert Hall',
  5: 'The Storm',
  6: 'The Summit',
}

const COMPLETION_QUOTES = {
  1: "You made it through the labyrinth. Together. A single thread begins to glow.",
  2: "The dish is done. It tastes like something that required two people to make.",
  3: "It works. Of course it works — you built it together.",
  4: "The final chord hangs in the air, as if the room doesn't want to let it go.",
  5: "The storm breaks. Not because you were strong — because you stayed close.",
  6: "Six chapters. The charms hang between you — a whole story in small bright things.",
}

// ─── Sparkle field ────────────────────────────────────────────────────────────

function SparkleField() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {[...Array(14)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-twinkle"
          style={{
            left:  `${8  + (i * 6.4) % 84}%`,
            top:   `${6  + (i * 9.7) % 80}%`,
            animationDelay: `${(i * 0.17).toFixed(2)}s`,
            opacity: 0.35,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24">
            <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" fill="#D4AF37" />
          </svg>
        </div>
      ))}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CharmAward({ chapterId, chapterName, charmId, onContinue }) {
  const chapterNum = Number(chapterId) || 1
  const { player, partner } = useGame()
  const [visible, setVisible] = useState(false)
  const [charmIn, setCharmIn] = useState(false)
  const [swing,   setSwing]   = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true),  80)
    const t2 = setTimeout(() => setCharmIn(true),  550)
    const t3 = setTimeout(() => setSwing(true),    1100)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  const resolvedName   = chapterName || FALLBACK_CHAPTER_NAMES[chapterNum] || `Chapter ${chapterNum}`
  const charmLabel     = CHARM_LABELS[charmId] || 'Charm'
  const quote          = COMPLETION_QUOTES[chapterNum] || "You did it. Together."
  const nextChapterNum = chapterNum + 1

  return (
    <div
      className={`relative flex flex-col h-full bg-paper-cream paper-texture safe-top safe-bottom
        items-center overflow-hidden transition-opacity duration-500
        ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <SparkleField />

      {/* Header */}
      <div className="text-center pt-12 px-6 z-10">
        <div className="font-body text-xs text-paper-card-dark/45 uppercase tracking-widest mb-1">
          Chapter {chapterNum} Complete
        </div>
        <h1 className="font-handwriting text-4xl font-bold text-paper-card-dark leading-tight">
          {resolvedName}
        </h1>
      </div>

      {/* Characters celebrating */}
      <div className="flex items-end gap-10 mt-6 mb-4 z-10">
        <div
          className="transition-all duration-700"
          style={{
            transform: visible ? 'rotate(-6deg) translateY(0)' : 'rotate(-6deg) translateY(20px)',
            opacity: visible ? 1 : 0,
          }}
        >
          <Character
            color={player?.palette || 'blue'}
            accessory={player?.accessory || 'none'}
            expression="surprised"
            size={88}
            animation="idle"
          />
        </div>
        <div
          className="transition-all duration-700"
          style={{
            transitionDelay: '120ms',
            transform: visible ? 'rotate(6deg) translateY(0)' : 'rotate(6deg) translateY(20px)',
            opacity: visible ? 1 : 0,
          }}
        >
          <Character
            color={partner?.palette || 'pink'}
            accessory={partner?.accessory || 'none'}
            expression="happy"
            size={88}
            animation="idle"
          />
        </div>
      </div>

      {/* Charm on a string */}
      <div
        className={`flex flex-col items-center z-10 transition-all duration-700
          ${charmIn ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-6'}`}
      >
        {/* String */}
        <div className="w-px h-10 bg-paper-card-dark/25" />

        {/* Charm card — swings after landing */}
        <div
          className="paper-card shadow-paper-lg rounded-2xl px-7 py-5 flex flex-col items-center gap-2"
          style={{
            animation: swing ? 'charmSwing 4s ease-in-out infinite' : 'none',
            transformOrigin: 'top center',
          }}
        >
          <CharmSVG chapterId={chapterNum} size={72} />
          <div className="text-center">
            <div className="font-handwriting text-xl font-bold text-paper-card-dark">
              {charmLabel}
            </div>
            <div className="font-body text-xs text-paper-card-dark/45 mt-0.5">
              New charm earned!
            </div>
          </div>
        </div>
      </div>

      {/* Narrator quote */}
      <div
        className={`mx-6 mt-5 paper-card rounded-xl px-5 py-4 shadow-paper max-w-sm w-full z-10
          transition-all duration-700 ${charmIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        style={{ transitionDelay: '200ms' }}
      >
        <div className="font-body text-xs text-paper-card-dark/40 uppercase tracking-wider mb-1.5">
          Narrator
        </div>
        <p className="font-handwriting text-base text-paper-card-dark leading-relaxed">
          "{quote}"
        </p>
      </div>

      {/* Continue button */}
      <div className="px-6 mt-auto pb-6 w-full max-w-sm z-10">
        <button
          onClick={onContinue}
          className={`w-full py-4 rounded-xl font-handwriting text-2xl font-bold
            washi-btn-primary shadow-paper-lg active:scale-95 transition-all
            ${charmIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          style={{ transitionDelay: '350ms' }}
        >
          {nextChapterNum <= 6 ? `Continue to Chapter ${nextChapterNum} →` : 'The End →'}
        </button>
      </div>

      {/* Charm swing keyframe */}
      <style>{`
        @keyframes charmSwing {
          0%, 100% { transform: rotate(-4deg); }
          50%       { transform: rotate(4deg);  }
        }
      `}</style>
    </div>
  )
}
