import React, { useState } from 'react'
import Character from './Character.jsx'
import { useGame } from '../context/GameContext.jsx'

const CHAPTERS = [
  {
    id: 1,
    name: 'First Meeting',
    subtitle: 'A chance encounter',
    color: 'chapter-1',
    hex: '#E8A598',
    icon: '🌸',
    games: ['Labyrinth', 'Heartbeat', 'Harmony'],
    totalGames: 3,
  },
  {
    id: 2,
    name: 'Finding Rhythm',
    subtitle: 'Two become in sync',
    color: 'chapter-2',
    hex: '#98B8E8',
    icon: '🌊',
    games: ['Mirror', 'Balance', 'Melody'],
    totalGames: 3,
  },
  {
    id: 3,
    name: 'The Lost Path',
    subtitle: 'Together through the maze',
    color: 'chapter-3',
    hex: '#A8D5A2',
    icon: '🌿',
    games: ['Navigate', 'Bridge', 'Echo'],
    totalGames: 3,
  },
  {
    id: 4,
    name: 'Storm & Shelter',
    subtitle: 'Strength in numbers',
    color: 'chapter-4',
    hex: '#E8CE98',
    icon: '⚡',
    games: ['Weather', 'Anchor', 'Signal'],
    totalGames: 3,
  },
  {
    id: 5,
    name: 'A Quiet Place',
    subtitle: 'Peace found together',
    color: 'chapter-5',
    hex: '#C4A8D5',
    icon: '🌙',
    games: ['Breathe', 'Float', 'Dream'],
    totalGames: 3,
  },
  {
    id: 6,
    name: 'Home',
    subtitle: 'Where the journey ends',
    color: 'chapter-6',
    hex: '#E8B8A8',
    icon: '🏡',
    games: ['Remember', 'Together', 'Always'],
    totalGames: 3,
  },
]

// Winding path positions for the chapter tiles
const PATH_POSITIONS = [
  { x: 15, y: 78 },  // ch 1 - bottom left
  { x: 58, y: 66 },  // ch 2 - bottom right area
  { x: 20, y: 52 },  // ch 3 - middle left
  { x: 65, y: 38 },  // ch 4 - middle right
  { x: 22, y: 24 },  // ch 5 - top left
  { x: 60, y: 12 },  // ch 6 - top right
]

function StarsDisplay({ count, total = 3 }) {
  return (
    <div className="flex gap-0.5">
      {[...Array(total)].map((_, i) => (
        <span key={i} className={`text-sm ${i < count ? 'star-shine' : 'opacity-20 grayscale'}`}>⭐</span>
      ))}
    </div>
  )
}

function ChapterTile({ chapter, position, isActive, isCompleted, isLocked, stars, onClick }) {
  const size = isActive ? 70 : 58

  return (
    <button
      onClick={() => !isLocked && onClick(chapter)}
      disabled={isLocked}
      className="absolute flex flex-col items-center gap-1 transition-all active:scale-90"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)',
        width: size,
      }}
      aria-label={`Chapter ${chapter.id}: ${chapter.name}`}
    >
      {/* Tile */}
      <div
        className={`relative rounded-2xl flex items-center justify-center
          transition-all shadow-paper
          ${isActive ? 'shadow-paper-lg scale-110' : ''}
          ${isLocked ? 'opacity-45 grayscale' : ''}`}
        style={{
          width: size,
          height: size,
          background: isCompleted || isActive ? chapter.hex : '#E8D5B0',
          border: `2.5px solid rgba(61,43,31,${isActive ? '0.4' : '0.2'})`,
        }}
      >
        <span className={`${isActive ? 'text-3xl' : 'text-2xl'}`}>{chapter.icon}</span>

        {/* Active glow ring */}
        {isActive && (
          <div
            className="absolute inset-0 rounded-2xl animate-pulse-soft"
            style={{ boxShadow: `0 0 0 3px ${chapter.hex}, 0 0 12px ${chapter.hex}80` }}
          />
        )}

        {/* Completed charm */}
        {isCompleted && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-palette-yellow rounded-full
            flex items-center justify-center text-xs shadow-sm border border-white/50 star-shine">
            ✓
          </div>
        )}

        {/* Lock icon */}
        {isLocked && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-paper-kraft/80 rounded-full
            flex items-center justify-center text-xs border border-white/40">
            🔒
          </div>
        )}

        {/* Chapter number */}
        <div
          className="absolute -bottom-1.5 left-1/2 -translate-x-1/2
            bg-paper-cream rounded-full px-2 py-0 font-handwriting text-xs font-bold
            text-paper-card-dark shadow-sm border border-paper-kraft/20 whitespace-nowrap"
        >
          {chapter.id}
        </div>
      </div>

      {/* Stars */}
      {isCompleted && (
        <StarsDisplay count={stars || 0} />
      )}
    </button>
  )
}

// SVG path connecting the chapter tiles
function PathSVG({ positions }) {
  const points = positions.map(p => `${p.x}% ${p.y}%`).join(', ')
  // Build a polyline through all positions
  const pathD = positions.reduce((acc, pos, i) => {
    const x = pos.x
    const y = pos.y
    if (i === 0) return `M ${x} ${y}`
    const prev = positions[i - 1]
    const cx = (prev.x + x) / 2
    const cy = (prev.y + y) / 2
    return acc + ` Q ${prev.x} ${prev.y}, ${cx} ${cy}`
  }, '')

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <path
        d={pathD}
        fill="none"
        stroke="rgba(61,43,31,0.15)"
        strokeWidth="1.5"
        strokeDasharray="4 3"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function ChapterMap({ progress = {}, currentChapter = 1, onSelectChapter, onBack }) {
  const { player } = useGame()
  const [selectedChapter, setSelectedChapter] = useState(
    CHAPTERS.find(c => c.id === currentChapter) || CHAPTERS[0]
  )

  const handleTileClick = (chapter) => {
    setSelectedChapter(chapter)
  }

  const handleContinue = () => {
    onSelectChapter?.(selectedChapter)
  }

  return (
    <div className="flex flex-col h-full bg-paper-cream paper-texture safe-top safe-bottom">
      {/* Header */}
      <div className="flex items-center px-5 pt-2 pb-3">
        <button
          onClick={onBack}
          className="p-2 rounded-full active:scale-90 transition-transform"
          aria-label="Back"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <h1 className="font-handwriting text-2xl font-bold text-paper-card-dark ml-3">Story Map</h1>
      </div>

      {/* Map area */}
      <div className="relative flex-1 mx-4 mb-4 paper-card rounded-3xl shadow-paper-lg overflow-hidden">
        {/* Map background texture */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 30% 70%, #E8CE98 0%, transparent 50%),
              radial-gradient(circle at 70% 30%, #A8D5A2 0%, transparent 50%),
              radial-gradient(circle at 50% 50%, #98B8E8 0%, transparent 70%)`,
          }}
        />

        {/* Path SVG */}
        <PathSVG positions={PATH_POSITIONS} />

        {/* Chapter tiles */}
        {CHAPTERS.map((chapter, idx) => {
          const pos = PATH_POSITIONS[idx]
          const chProgress = progress[chapter.id] || {}
          const isCompleted = chProgress.completed || false
          const isActive = chapter.id === currentChapter
          const isLocked = chapter.id > currentChapter + 1

          return (
            <ChapterTile
              key={chapter.id}
              chapter={chapter}
              position={pos}
              isActive={isActive}
              isCompleted={isCompleted}
              isLocked={isLocked}
              stars={chProgress.stars || 0}
              onClick={handleTileClick}
            />
          )
        })}

        {/* Player character on current position */}
        {(() => {
          const activeIdx = CHAPTERS.findIndex(c => c.id === currentChapter)
          const pos = PATH_POSITIONS[activeIdx]
          if (!pos) return null
          return (
            <div
              className="absolute pointer-events-none"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y - 14}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <Character
                color={player.palette}
                accessory={player.accessory}
                expression="happy"
                size={44}
                animation="idle"
              />
            </div>
          )
        })()}
      </div>

      {/* Chapter info panel */}
      <div className="mx-4 mb-4 paper-card rounded-2xl shadow-paper px-5 py-4 relative">
        <div
          className="absolute -top-1.5 left-8 w-16 h-3.5 rounded-sm shadow-sm transform -rotate-1"
          style={{ background: selectedChapter?.hex + 'CC' }}
        />

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xl">{selectedChapter?.icon}</span>
              <span className="font-body text-xs text-paper-card-dark/50 uppercase tracking-wide">
                Chapter {selectedChapter?.id}
              </span>
            </div>
            <h3 className="font-handwriting text-2xl font-bold text-paper-card-dark leading-tight">
              {selectedChapter?.name}
            </h3>
            <p className="font-body text-sm text-paper-card-dark/55 mt-0.5">
              {selectedChapter?.subtitle}
            </p>

            {/* Stars */}
            {progress[selectedChapter?.id]?.completed && (
              <div className="mt-2">
                <StarsDisplay count={progress[selectedChapter?.id]?.stars || 0} />
              </div>
            )}
          </div>

          <div className="text-right shrink-0">
            <div className="font-body text-xs text-paper-card-dark/50 mb-1">
              {selectedChapter?.games.length} games
            </div>
            <div className="font-handwriting text-sm text-paper-card-dark/70">
              {progress[selectedChapter?.id]?.completed ? 'Completed' :
               selectedChapter?.id === currentChapter ? 'Current' :
               selectedChapter?.id < currentChapter ? 'Replay' : 'Locked'}
            </div>
          </div>
        </div>

        <button
          onClick={handleContinue}
          disabled={selectedChapter?.id > currentChapter + 1}
          className="mt-4 w-full washi-btn-primary py-3 rounded-xl text-lg
            disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {selectedChapter?.id === currentChapter ? 'Continue' :
           selectedChapter?.id < currentChapter ? 'Replay Chapter' :
           selectedChapter?.id > currentChapter + 1 ? '🔒 Locked' : 'Start Chapter'}
        </button>
      </div>
    </div>
  )
}
