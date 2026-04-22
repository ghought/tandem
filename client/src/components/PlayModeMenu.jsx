import React, { useState } from 'react'
import { useGame } from '../context/GameContext.jsx'

const ALL_GAMES = [
  // Chapter 1 — The First Thread
  { id: 'harmony',        title: 'Harmony',          icon: '🎵', chapter: 1, description: 'Play notes in perfect rhythm together' },
  { id: 'butterfly_chase',title: 'Butterfly Chase',   icon: '🦋', chapter: 1, description: 'Chase butterflies that react to each other' },
  { id: 'bridge_of_vines',title: 'Bridge of Vines',   icon: '🌿', chapter: 1, description: 'Build a bridge by communicating' },
  { id: 'recipe_rush',    title: 'Recipe Rush',       icon: '📋', chapter: 1, description: 'One reads, one cooks' },
  { id: 'labyrinth',      title: 'Labyrinth',         icon: '🌀', chapter: 1, description: 'Tilt together to guide the marble' },
  // Chapter 2 — The Shared Kitchen
  { id: 'grow_together',  title: 'Grow Together',     icon: '🌱', chapter: 2, description: 'Tend a garden in perfect sync' },
  { id: 'stir_together',  title: 'Stir Together',     icon: '🥄', chapter: 2, description: 'Circle-stir to match the recipe speed' },
  { id: 'heartbeat',      title: 'Heartbeat',         icon: '💓', chapter: 2, description: 'Sync your heartbeats precisely' },
  { id: 'taste_test',     title: 'Taste Test',        icon: '🍴', chapter: 2, description: 'Coordinate flavors by code-name only' },
  // Chapter 3 — The Workshop
  { id: 'gear_train',     title: 'Gear Train',        icon: '⚙️', chapter: 3, description: 'Spin gears to hit the target RPM' },
  { id: 'blueprint_reader',title:'Blueprint Reader',  icon: '📐', chapter: 3, description: 'Decode cryptic blueprints together' },
  { id: 'tandem_typing',  title: 'Tandem Typing',     icon: '⌨️', chapter: 3, description: 'Alternate letters to spell words' },
  { id: 'rube_goldberg',  title: 'Rube Goldberg',     icon: '🔧', chapter: 3, description: 'Build a chain reaction machine' },
  // Chapter 4 — The Concert Hall
  { id: 'call_response',  title: 'Call & Response',   icon: '🎼', chapter: 4, description: 'Echo each other\'s rhythm patterns' },
  { id: 'conductor',      title: 'Conductor',         icon: '🎻', chapter: 4, description: 'One conducts, one plays the notes' },
  { id: 'mirror_draw',    title: 'Mirror Draw',       icon: '🪞', chapter: 4, description: 'Trace the mirrored drawing exactly' },
  { id: 'duet',           title: 'The Duet',          icon: '🎹', chapter: 4, description: 'Play treble & bass in harmony' },
  // Chapter 5 — The Storm
  { id: 'light_the_way',  title: 'Light the Way',     icon: '🔦', chapter: 5, description: 'One sees the map, one walks in darkness' },
  { id: 'signal_flags',   title: 'Signal Flags',      icon: '🚩', chapter: 5, description: 'Send coded flag messages' },
  { id: 'tide_pools',     title: 'Tide Pools',        icon: '🦀', chapter: 5, description: 'Match creatures across the shore' },
  { id: 'storm',          title: 'The Storm',         icon: '⛵', chapter: 5, description: 'Control sail & rudder to survive' },
  // Chapter 6 — The Summit
  { id: 'dice_roll',      title: 'Dice Roll',         icon: '🎲', chapter: 6, description: 'One sees the target, one rolls the dice' },
  { id: 'memory_lane',    title: 'Memory Lane',       icon: '🧩', chapter: 6, description: 'Remember together what neither can alone' },
  { id: 'twenty_questions',title:'20 Questions',      icon: '❓', chapter: 6, description: 'Guess the secret with yes/no only' },
  { id: 'final_labyrinth',title: 'Final Labyrinth',   icon: '🏆', chapter: 6, description: 'The ultimate tilt maze challenge' },
]

const CHAPTER_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 1,     label: 'Ch. 1' },
  { id: 2,     label: 'Ch. 2' },
  { id: 3,     label: 'Ch. 3' },
  { id: 4,     label: 'Ch. 4' },
  { id: 5,     label: 'Ch. 5' },
  { id: 6,     label: 'Ch. 6' },
]

const CHAPTER_COLORS = {
  1: '#E8A598', 2: '#98B8E8', 3: '#A8D5A2',
  4: '#E8CE98', 5: '#C4A8D5', 6: '#E8B8A8',
}

function GameCard({ game, stars = 0, isFav, onToggleFav, onSelect }) {
  return (
    <div
      className="relative paper-card rounded-2xl shadow-paper overflow-hidden active:scale-95 cursor-pointer transition-all"
      onClick={() => onSelect?.(game)}
    >
      {/* Chapter color strip */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ background: CHAPTER_COLORS[game.chapter] }}
      />

      <div className="pt-3 pb-3 px-4">
        <div className="flex items-start justify-between mb-2">
          <span className="text-3xl">{game.icon}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFav?.(game.id) }}
            className="text-xl active:scale-90 transition-transform"
            aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
          >
            {isFav ? '❤️' : '🤍'}
          </button>
        </div>

        <h3 className="font-handwriting text-lg font-bold text-paper-card-dark leading-tight">
          {game.title}
        </h3>
        <p className="font-body text-xs text-paper-card-dark/55 mt-0.5 leading-snug">
          {game.description}
        </p>

        {/* Stars */}
        <div className="flex gap-0.5 mt-2">
          {[...Array(3)].map((_, i) => (
            <span key={i} className={`text-xs ${i < stars ? 'star-shine' : 'opacity-20 grayscale'}`}>⭐</span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function PlayModeMenu({ scores = {}, onSelectGame, onBack }) {
  const [filter, setFilter] = useState('all')
  const [favorites, setFavorites] = useState(new Set())

  const filteredGames = filter === 'all'
    ? ALL_GAMES
    : ALL_GAMES.filter(g => g.chapter === filter)

  const toggleFav = (id) => {
    setFavorites(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleQuickPlay = () => {
    const favList = ALL_GAMES.filter(g => favorites.has(g.id))
    const pool = favList.length > 0 ? favList : ALL_GAMES
    onSelectGame?.(pool[0])
  }

  const handleShuffle = () => {
    const random = ALL_GAMES[Math.floor(Math.random() * ALL_GAMES.length)]
    onSelectGame?.(random)
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
        <h1 className="font-handwriting text-2xl font-bold text-paper-card-dark ml-3">Play Mode</h1>
      </div>

      {/* Quick action buttons */}
      <div className="flex gap-3 px-5 mb-4">
        <button
          onClick={handleQuickPlay}
          className="flex-1 washi-btn-primary py-3 text-base rounded-xl"
        >
          ▶ Quick Play
        </button>
        <button
          onClick={handleShuffle}
          className="flex-1 washi-btn py-3 text-base rounded-xl"
        >
          🔀 Shuffle
        </button>
      </div>

      {/* Chapter filter */}
      <div className="px-5 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1 scroll-container">
          {CHAPTER_FILTERS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={`shrink-0 px-3 py-1.5 rounded-full font-body text-sm transition-all
                active:scale-90
                ${filter === id
                  ? 'bg-paper-card-dark text-paper-cream font-bold'
                  : 'bg-paper-watercolor text-paper-card-dark/70 border border-paper-kraft/30'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Game grid */}
      <div className="flex-1 scroll-container px-5 pb-4">
        <div className="grid grid-cols-2 gap-3">
          {filteredGames.map(game => (
            <GameCard
              key={game.id}
              game={game}
              stars={scores[game.id] || 0}
              isFav={favorites.has(game.id)}
              onToggleFav={toggleFav}
              onSelect={onSelectGame}
            />
          ))}
        </div>

        {filteredGames.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <span className="text-4xl opacity-40">🎮</span>
            <p className="font-body text-sm text-paper-card-dark/45 text-center">
              No games in this chapter.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
