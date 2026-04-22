import { useEffect, useCallback } from 'react'
import { useGame } from '../context/GameContext.jsx'

export function useGameState() {
  const { socket, gameState, setGameState } = useGame()

  useEffect(() => {
    if (!socket) return

    const onGameState = (state) => {
      setGameState(state)
    }

    socket.on('game:state', onGameState)
    return () => {
      socket.off('game:state', onGameState)
    }
  }, [socket, setGameState])

  const sendInput = useCallback(
    (type, data = {}) => {
      if (socket && socket.connected) {
        socket.emit('game:input', { type, data, timestamp: Date.now() })
      }
    },
    [socket]
  )

  return { gameState, sendInput }
}
