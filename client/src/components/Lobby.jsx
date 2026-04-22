import React, { useState, useEffect } from 'react'
import Character from './Character.jsx'
import { useGame } from '../context/GameContext.jsx'

function ConnectionDot({ latency, connected }) {
  const quality = !connected ? 'connecting' : latency === 0 ? 'good' : latency < 80 ? 'good' : latency < 200 ? 'ok' : 'bad'
  const colors = {
    connecting: 'bg-paper-kraft animate-pulse',
    good: 'bg-green-400',
    ok: 'bg-yellow-400',
    bad: 'bg-red-400',
  }
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2.5 h-2.5 rounded-full ${colors[quality]}`} />
      <span className="font-body text-xs text-paper-card-dark/50">
        {quality === 'connecting' ? 'connecting' : latency > 0 ? `${latency}ms` : 'connected'}
      </span>
    </div>
  )
}

function LetterTile({ char }) {
  return (
    <div className="letter-tile animate-peel-on">
      {char}
    </div>
  )
}

function PlayerSlot({ player, isMe, isEmpty }) {
  if (isEmpty) {
    return (
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-32 h-36 rounded-2xl border-3 border-dashed border-paper-kraft/40
            flex flex-col items-center justify-center gap-2 bg-paper-watercolor/30"
        >
          <div className="w-16 h-16 rounded-full bg-paper-kraft/20 flex items-center justify-center">
            <span className="text-3xl opacity-40">?</span>
          </div>
          <div className="font-body text-xs text-paper-card-dark/40 text-center px-2">
            Waiting for partner...
          </div>
        </div>
        <div className="font-handwriting text-base text-paper-card-dark/40">
          Partner
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col items-center gap-2 ${isMe ? '' : 'animate-peel-on'}`}>
      <div className="relative">
        <div
          className={`w-32 h-36 rounded-2xl flex items-end justify-center pb-2
            ${isMe
              ? 'bg-paper-watercolor border-2 border-paper-kraft/30 shadow-paper'
              : 'bg-chapter-2/30 border-2 border-chapter-2/50 shadow-paper'}`}
        >
          <Character
            color={player.palette}
            accessory={player.accessory}
            expression="happy"
            size={96}
            animation="idle"
          />
        </div>
        {isMe && (
          <div className="absolute -top-2 -right-2 bg-palette-yellow text-paper-card-dark
            text-xs font-handwriting font-bold px-2 py-0.5 rounded-full shadow-sm border border-white/50">
            You
          </div>
        )}
      </div>
      <div className="font-handwriting text-xl font-semibold text-paper-card-dark">
        {player.name}
      </div>
    </div>
  )
}

export default function Lobby({
  isHost,
  onCustomize,
  onStart,
  onBack,
}) {
  const { player, partner, room, latency, connected } = useGame()
  const [copied, setCopied] = useState(false)
  const [partnerJustJoined, setPartnerJustJoined] = useState(false)

  const roomCode = room?.roomCode || '------'
  const bothConnected = !!partner

  useEffect(() => {
    if (partner) {
      setPartnerJustJoined(true)
      const t = setTimeout(() => setPartnerJustJoined(false), 2000)
      return () => clearTimeout(t)
    }
  }, [partner])

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (_) {}
  }

  return (
    <div className="flex flex-col h-full bg-paper-cream paper-texture safe-top safe-bottom">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-2 pb-3">
        <button
          onClick={onBack}
          className="p-2 rounded-full active:scale-90 transition-transform"
          aria-label="Back"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>

        <h1 className="font-handwriting text-2xl font-bold text-paper-card-dark">Waiting Room</h1>

        <ConnectionDot latency={latency} connected={connected} />
      </div>

      {/* Room code */}
      <button
        onClick={copyCode}
        className="relative mx-5 mb-4 paper-card shadow-paper rounded-2xl px-5 py-4 active:scale-98 transition-transform"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="font-body text-xs text-paper-card-dark/50 uppercase tracking-widest">
            Room Code
          </div>
          <div className="flex gap-2">
            {roomCode.split('').map((char, i) => (
              <LetterTile key={i} char={char} />
            ))}
          </div>
          <div className="font-body text-xs text-paper-card-dark/50">
            {copied ? '✓ Copied!' : 'Tap to copy'}
          </div>
        </div>
        {/* Washi tape decoration */}
        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-20 h-3.5
          bg-chapter-4/80 rounded-sm shadow-sm opacity-80 transform -rotate-1" />
      </button>

      {/* Share hint */}
      <div className="mx-5 mb-5 flex items-center gap-2 px-4 py-2.5 rounded-xl
        bg-chapter-2/20 border border-chapter-2/30">
        <span className="text-lg">📱</span>
        <p className="font-body text-sm text-paper-card-dark/70">
          Share this code with your partner to play together
        </p>
      </div>

      {/* Character slots */}
      <div className="flex justify-around items-center px-6 flex-1">
        <PlayerSlot player={player} isMe={true} isEmpty={false} />

        {/* VS divider */}
        <div className="flex flex-col items-center gap-1">
          <div className="w-px h-16 bg-paper-kraft/30" />
          <div className="font-handwriting text-sm text-paper-card-dark/40">+</div>
          <div className="w-px h-16 bg-paper-kraft/30" />
        </div>

        <PlayerSlot player={partner} isMe={false} isEmpty={!partner} />
      </div>

      {/* Partner just joined notification */}
      {partnerJustJoined && (
        <div className="mx-5 mb-3 flex items-center gap-2 px-4 py-3 rounded-xl
          bg-chapter-3/30 border border-chapter-3/50 animate-slide-up">
          <span className="text-xl">🎉</span>
          <span className="font-handwriting text-lg text-paper-card-dark">
            {partner?.name} joined!
          </span>
        </div>
      )}

      {/* Action buttons */}
      <div className="px-5 pb-5 flex flex-col gap-3">
        <button
          onClick={onCustomize}
          className="w-full flex items-center justify-center gap-2 px-6 py-3
            paper-card shadow-paper rounded-xl active:scale-95 transition-transform
            font-handwriting text-xl text-paper-card-dark"
        >
          ✏️ Customize Character
        </button>

        {isHost && (
          <button
            onClick={onStart}
            disabled={!bothConnected}
            className={`w-full py-4 rounded-xl font-handwriting text-2xl font-bold
              transition-all active:scale-95 flex items-center justify-center gap-3
              ${bothConnected
                ? 'washi-btn-primary shadow-paper-lg animate-pulse-ready'
                : 'bg-paper-kraft/20 text-paper-card-dark/30 cursor-not-allowed'}`}
          >
            {bothConnected ? (
              <>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2l2.09 6.26L20 10l-5 4.7 1.18 6.3L12 17.77l-4.18 3.23L9 14.7 4 10l5.91-1.74z" />
                </svg>
                Start Adventure
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </>
            ) : (
              'Waiting for partner…'
            )}
          </button>
        )}

        {!isHost && (
          <div className="text-center font-body text-sm text-paper-card-dark/50 py-2">
            Waiting for host to start the game…
          </div>
        )}
      </div>
    </div>
  )
}
