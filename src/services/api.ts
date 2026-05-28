import type { Measurement } from '../types/Measurement'

const API_BASE = 'http://13.223.175.101:5000/api'

export async function fetchLatestMeasurements(): Promise<Measurement[]> {
  const response = await fetch(`${API_BASE}/measurements/latest`)
  if (!response.ok) throw new Error('Failed to fetch measurements')
  return response.json()
}

