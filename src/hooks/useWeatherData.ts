import { useState, useEffect, useRef } from 'react'
import type { Measurement } from '../types/Measurement'
import { fetchLatestMeasurements } from '../services/api'

export function useWeatherData() {
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasDataRef = useRef(false)

  useEffect(() => {
    const pollData = async () => {
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

    pollData()
    const interval = setInterval(pollData, 5000)

    return () => clearInterval(interval)
  }, [])

  return { measurements, lastUpdated, isConnected, error }
}
