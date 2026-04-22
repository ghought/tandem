import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useSocket } from '../hooks/useSocket.js'

const GameContext = createContext(null)

const generateId = () =>
  'p_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

const defaultPlayer = () => ({
  id: generateId(),
  name: 'Wanderer',
  palette: 'blue',
  accessory: 'none',
})

export function GameProvider({ children }) {
  const { socket, connected, latency } = useSocket()

  const [player, setPlayerState] = useState(() => {
    try {
      const saved = localStorage.getItem('tandem_player')
      if (saved) return JSON.parse(saved)
    } catch (_) {}
    return defaultPlayer()
  })

  const [partner, setPartner] = useState(null)
  const [room, setRoomState] = useState(null)
  const [gameState, setGameStateRaw] = useState(null)
  const [myRole, setMyRole] = useState(null)
  const [narratorText, setNarratorText] = useState(null)
  const [gameResults, setGameResults] = useState(null)

  // Persist player to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('tandem_player', JSON.stringify(player))
    } catch (_) {}
  }, [player])

  // Socket event listeners
  useEffect(() => {
    if (!socket) return

    const onPartnerJoined = (data) => {
      setPartner(data.partner)
    }

    const onPartnerLeft = () => {
      setPartner(null)
    }

    const onPartnerUpdated = (data) => {
      setPartner((prev) => prev ? { ...prev, ...data } : data)
    }

    const onRoomJoined = (data) => {
      setRoomState(data.room)
      if (data.role) setMyRole(data.role)
      // Server now sends the other player as `partner` on join
      if (data.partner) setPartner(data.partner)
      // Also derive partner from the room snapshot if not explicitly provided
      else if (data.room?.players && data.playerId) {
        const other = data.room.players.find(p => p.id !== data.playerId)
        if (other) setPartner(other)
      }
    }

    const onGameState = (state) => {
      setGameStateRaw(state)
    }

    const onNarratorText = (data) => {
      setNarratorText(data)
    }

    const onGameResults = (data) => {
      setGameResults(data)
    }

    const onRoleAssigned = (data) => {
      setMyRole(data.role)
    }

    socket.on('room:joined', onRoomJoined)
    socket.on('partner:joined', onPartnerJoined)
    socket.on('room:partnerJoined', (data) => onPartnerJoined({ partner: data.newPlayer }))
    socket.on('room:partnerReconnected', (data) => {
      if (data?.player) onPartnerJoined({ partner: data.player })
    })
    socket.on('partner:left', onPartnerLeft)
    socket.on('room:partnerLeft', onPartnerLeft)
    socket.on('room:partnerDisconnected', () => {
      // Partner temporarily disconnected — don't clear partner state yet,
      // they may reconnect within the grace window
    })
    socket.on('partner:updated', onPartnerUpdated)
    socket.on('game:state', onGameState)
    socket.on('narrator:text', onNarratorText)
    socket.on('game:results', onGameResults)
    socket.on('game:result',  onGameResults)  // engine emits singular form
    socket.on('role:assigned', onRoleAssigned)

    return () => {
      socket.off('room:joined', onRoomJoined)
      socket.off('partner:joined', onPartnerJoined)
      socket.off('room:partnerJoined')
      socket.off('room:partnerReconnected')
      socket.off('room:partnerDisconnected')
      socket.off('partner:left', onPartnerLeft)
      socket.off('room:partnerLeft', onPartnerLeft)
      socket.off('partner:updated', onPartnerUpdated)
      socket.off('game:state', onGameState)
      socket.off('narrator:text', onNarratorText)
      socket.off('game:results', onGameResults)
      socket.off('game:result',  onGameResults)
      socket.off('role:assigned', onRoleAssigned)
    }
  }, [socket])

  const updatePlayer = useCallback((updates) => {
    setPlayerState((prev) => {
      const next = { ...prev, ...updates }
      // Broadcast update to server if in a room
      if (socket && socket.connected) {
        socket.emit('player:update', next)
      }
      return next
    })
  }, [socket])

  const setRoom = useCallback((roomData) => {
    setRoomState(roomData)
  }, [])

  const setGameState = useCallback((state) => {
    setGameStateRaw(state)
  }, [])

  const clearNarratorText = useCallback(() => {
    setNarratorText(null)
  }, [])

  const clearGameResults = useCallback(() => {
    setGameResults(null)
  }, [])

  const value = {
    // Connection
    socket,
    connected,
    latency,
    // Player
    player,
    updatePlayer,
    // Partner
    partner,
    // Room
    room,
    setRoom,
    // Game
    gameState,
    setGameState,
    myRole,
    // Narrator
    narratorText,
    clearNarratorText,
    // Results
    gameResults,
    clearGameResults,
  }

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within a GameProvider')
  return ctx
}
