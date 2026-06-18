import { useState, useEffect, useRef } from 'react'
import type { Socket } from 'socket.io-client'
import type { Measurement } from '../types/Measurement'
import { fetchLatestMeasurements } from '../services/api.ts'
import { createSocket, handleTokenRefresh } from '../services/socket.ts'
import type { NewMeasurementPayload, LatestMeasurementsPayload } from '../services/socket.ts'

const FALLBACK_DELAY_MS = 10_000
const POLL_INTERVAL_MS = 5_000

export function useWeatherData() {
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasDataRef = useRef(false)
  const socketRef = useRef<Socket | null>(null)
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isUsingSocketRef = useRef(false)

  useEffect(() => {
    const socket = createSocket()
    socketRef.current = socket

    const startPolling = () => {
      if (isUsingSocketRef.current) return
      const poll = async () => {
        try {
          const data = await fetchLatestMeasurements()
          setMeasurements(data)
          setLastUpdated(new Date())
          setError(null)
          setIsConnected(true)
          hasDataRef.current = true
        } catch {
          setIsConnected(false)
          if (!hasDataRef.current) {
            setError('Failed to fetch data')
          }
        }
      }
      poll()
      pollingIntervalRef.current = setInterval(poll, POLL_INTERVAL_MS)
    }

    const stopPolling = () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }

    socket.on('connect', () => {
      setIsConnected(true)
      isUsingSocketRef.current = true
      stopPolling()
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current)
        fallbackTimerRef.current = null
      }
      socket.emit('get_latest')
    })

    socket.on('latest_measurements', (data: LatestMeasurementsPayload) => {
      setMeasurements(data)
      setLastUpdated(new Date())
      setError(null)
      setIsConnected(true)
      hasDataRef.current = true
    })

    socket.on('new_measurement', (data: NewMeasurementPayload) => {
      setMeasurements(prev => [data, ...prev])
      setLastUpdated(new Date())
      hasDataRef.current = true
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
      if (hasDataRef.current) {
        isUsingSocketRef.current = false
        startPolling()
      }
    })

    socket.on('connect_error', (err: Error) => {
      setIsConnected(false)
      if (!hasDataRef.current) {
        setError(`Connection failed: ${err.message}`)
      }
      if (err.message === 'Invalid token') {
        handleTokenRefresh(socket)
      }
    })

    fallbackTimerRef.current = setTimeout(() => {
      if (!isUsingSocketRef.current) {
        startPolling()
      }
    }, FALLBACK_DELAY_MS)

    return () => {
      socket.disconnect()
      socketRef.current = null
      stopPolling()
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current)
      }
    }
  }, [])

  return { measurements, lastUpdated, isConnected, error }
}
