import React, { useState } from 'react'
import Character from './Character.jsx'
import { useGame } from '../context/GameContext.jsx'

const PALETTE_OPTIONS = [
  { id: 'red',      label: 'Crimson',   hex: '#D94F3D' },
  { id: 'blue',     label: 'Ocean',     hex: '#3D7BC4' },
  { id: 'green',    label: 'Forest',    hex: '#4A9E6B' },
  { id: 'orange',   label: 'Sunset',    hex: '#E8873A' },
  { id: 'lavender', label: 'Lavender',  hex: '#9B72C4' },
  { id: 'yellow',   label: 'Golden',    hex: '#D4AC35' },
  { id: 'pink',     label: 'Coral',     hex: '#E87CA0' },
  { id: 'mint',     label: 'Mint',      hex: '#4ABCAA' },
]

const ACCESSORY_OPTIONS = [
  { id: 'none',     label: 'None',      icon: '○' },
  { id: 'hat',      label: 'Hat',       icon: '🎩' },
  { id: 'glasses',  label: 'Glasses',   icon: '👓' },
  { id: 'scarf',    label: 'Scarf',     icon: '🧣' },
  { id: 'headband', label: 'Headband',  icon: '〰' },
  { id: 'bow',      label: 'Bow',       icon: '🎀' },
  { id: 'bandana',  label: 'Bandana',   icon: '⬡' },
]

export default function CharacterSelect({ onDone }) {
  const { player, updatePlayer } = useGame()
  const [localName, setLocalName]           = useState(player.name)
  const [localPalette, setLocalPalette]     = useState(player.palette)
  const [localAccessory, setLocalAccessory] = useState(player.accessory)

  const handleDone = () => {
    updatePlayer({ name: localName.trim() || 'Wanderer', palette: localPalette, accessory: localAccessory })
    onDone?.()
  }

  return (
    <div className="flex flex-col h-full bg-paper-cream paper-texture safe-top safe-bottom">
      {/* Header */}
      <div className="flex items-center px-5 pt-2 pb-4">
        <button
          onClick={onDone}
          className="p-2 rounded-full active:scale-90 transition-transform"
          aria-label="Back"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <h1 className="font-handwriting text-3xl font-bold text-paper-card-dark ml-3">Your Character</h1>
      </div>

      {/* Preview */}
      <div className="flex justify-center items-center py-2">
        <div className="relative">
          <div className="w-40 h-40 flex items-end justify-center">
            <Character
              color={localPalette}
              accessory={localAccessory}
              expression="happy"
              size={130}
              animation="idle"
            />
          </div>
          {/* Shadow under character */}
          <div className="mx-auto mt-1 w-24 h-3 bg-paper-card-dark/10 rounded-full blur-sm" />
        </div>
      </div>

      {/* Name input */}
      <div className="px-6 mb-4">
        <label className="font-handwriting text-lg text-paper-card-dark/70 mb-1 block">Name</label>
        <input
          type="text"
          value={localName}
          onChange={(e) => setLocalName(e.target.value)}
          maxLength={16}
          placeholder="Wanderer"
          className="w-full font-handwriting text-2xl text-paper-card-dark bg-paper-watercolor/60
            border-2 border-paper-kraft/40 rounded-lg px-4 py-2 outline-none
            focus:border-paper-kraft transition-colors placeholder:text-paper-kraft/50"
        />
      </div>

      <div className="flex-1 scroll-container px-5 pb-4">
        {/* Color grid */}
        <h2 className="font-handwriting text-xl font-semibold text-paper-card-dark mb-3">Color</h2>
        <div className="grid grid-cols-4 gap-3 mb-6">
          {PALETTE_OPTIONS.map(({ id, label, hex }) => (
            <button
              key={id}
              onClick={() => setLocalPalette(id)}
              className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all active:scale-90
                ${localPalette === id
                  ? 'bg-paper-card-dark/10 ring-2 ring-paper-card-dark/40 scale-105'
                  : 'hover:bg-paper-card-dark/5'}`}
              aria-label={label}
            >
              <div
                className="w-11 h-11 rounded-full shadow-paper border-2 border-white/60"
                style={{ background: `radial-gradient(circle at 35% 30%, ${hex}dd, ${hex})` }}
              />
              <span className="font-body text-xs text-paper-card-dark/70 leading-tight">{label}</span>
            </button>
          ))}
        </div>

        {/* Accessory picker */}
        <h2 className="font-handwriting text-xl font-semibold text-paper-card-dark mb-3">Accessory</h2>
        <div className="grid grid-cols-4 gap-2 mb-6">
          {ACCESSORY_OPTIONS.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setLocalAccessory(id)}
              className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all active:scale-90
                ${localAccessory === id
                  ? 'border-paper-card-dark/40 bg-paper-card-dark/10 scale-105'
                  : 'border-paper-kraft/25 bg-paper-watercolor/40'}`}
              aria-label={label}
            >
              <span className="text-2xl leading-none">{icon}</span>
              <span className="font-body text-xs text-paper-card-dark/70">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Done button */}
      <div className="px-6 pb-4">
        <button
          onClick={handleDone}
          className="w-full washi-btn-primary text-xl py-4 rounded-xl"
        >
          Done
        </button>
      </div>
    </div>
  )
}
