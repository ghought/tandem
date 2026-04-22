import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

// Always use same-origin so the Vite proxy (/socket.io → localhost:3001) handles routing
const SERVER_URL = '/'

let sharedSocket = null

export function useSocket() {
  const [connected, setConnected] = useState(false)
  const [latency, setLatency] = useState(0)
  const pingIntervalRef = useRef(null)
  const pingTimeRef = useRef(0)

  if (!sharedSocket) {
    sharedSocket = io(SERVER_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,       // start retrying quickly
      reconnectionDelayMax: 4000,   // cap at 4s (well inside the 45s grace window)
      randomizationFactor: 0.3,
      timeout: 20000,               // phones on mobile networks can be slow
    })
  }

  useEffect(() => {
    const socket = sharedSocket

    const onConnect = () => {
      setConnected(true)
    }

    const onDisconnect = () => {
      setConnected(false)
    }

    const onPong = () => {
      const rtt = Date.now() - pingTimeRef.current
      setLatency(rtt)
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('pong', onPong)

    if (socket.connected) setConnected(true)

    // Ping every 3 seconds to measure latency
    pingIntervalRef.current = setInterval(() => {
      if (socket.connected) {
        pingTimeRef.current = Date.now()
        socket.emit('ping')
      }
    }, 3000)

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('pong', onPong)
      clearInterval(pingIntervalRef.current)
    }
  }, [])

  return { socket: sharedSocket, connected, latency }
}
