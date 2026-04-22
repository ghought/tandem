import { useState, useEffect, useCallback, useRef } from 'react'

const TILT_RANGE = 30 // degrees for full -1..1 range

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}

function normalizeTilt(degrees) {
  return clamp(degrees / TILT_RANGE, -1, 1)
}

export function useDeviceTilt() {
  const [supported, setSupported] = useState(false)
  const [permissionGranted, setPermissionGranted] = useState(false)
  const [tiltX, setTiltX] = useState(0)
  const [tiltY, setTiltY] = useState(0)
  const baselineRef = useRef(null)

  const handleOrientation = useCallback((event) => {
    const { beta, gamma } = event // beta = front-back tilt, gamma = left-right

    if (beta === null || gamma === null) return

    // On first event, capture baseline so neutral position = 0
    if (!baselineRef.current) {
      baselineRef.current = { beta, gamma }
    }

    const deltaBeta = beta - baselineRef.current.beta
    const deltaGamma = gamma - baselineRef.current.gamma

    // gamma = left/right → X axis, beta = forward/back → Y axis
    setTiltX(normalizeTilt(deltaGamma))
    setTiltY(normalizeTilt(deltaBeta))
  }, [])

  const requestPermission = useCallback(async () => {
    // iOS 13+ requires explicit permission
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function'
    ) {
      try {
        const result = await DeviceOrientationEvent.requestPermission()
        if (result === 'granted') {
          setPermissionGranted(true)
          window.addEventListener('deviceorientation', handleOrientation, true)
        }
      } catch (err) {
        console.warn('DeviceOrientation permission denied:', err)
      }
    } else if (typeof DeviceOrientationEvent !== 'undefined') {
      // Android / non-iOS: no permission needed
      setPermissionGranted(true)
      window.addEventListener('deviceorientation', handleOrientation, true)
    }
  }, [handleOrientation])

  useEffect(() => {
    if (typeof DeviceOrientationEvent !== 'undefined') {
      setSupported(true)
    }

    // For non-iOS, auto-start
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission !== 'function'
    ) {
      setPermissionGranted(true)
      window.addEventListener('deviceorientation', handleOrientation, true)
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true)
    }
  }, [handleOrientation])

  const recalibrate = useCallback(() => {
    baselineRef.current = null
  }, [])

  return {
    tiltX,
    tiltY,
    supported,
    permissionGranted,
    requestPermission,
    recalibrate,
  }
}
