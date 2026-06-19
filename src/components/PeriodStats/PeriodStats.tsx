import { format } from 'date-fns'
import type { Measurement } from '../../types/Measurement'
import './PeriodStats.css'

interface PeriodStatsProps {
  measurements: Measurement[]
}

export function PeriodStats({ measurements }: PeriodStatsProps) {
  if (measurements.length === 0) return null

  let maxTemp = measurements[0]
  let minTemp = measurements[0]
  let maxHumidity = measurements[0]
  let minHumidity = measurements[0]

  for (const m of measurements) {
    if (m.temperature > maxTemp.temperature) maxTemp = m
    if (m.temperature < minTemp.temperature) minTemp = m
    if (m.humidity > maxHumidity.humidity) maxHumidity = m
    if (m.humidity < minHumidity.humidity) minHumidity = m
  }

  const fmt = (ts: string) => format(new Date(ts), 'HH:mm')

  return (
    <div className="period-stats">
      <div className="stat-card">
        <span className="stat-label">Max Temp</span>
        <span className="stat-value stat-hot">{maxTemp.temperature}°C</span>
        <span className="stat-time">{fmt(maxTemp.created_at)}</span>
      </div>
      <div className="stat-card">
        <span className="stat-label">Min Temp</span>
        <span className="stat-value stat-cold">{minTemp.temperature}°C</span>
        <span className="stat-time">{fmt(minTemp.created_at)}</span>
      </div>
      <div className="stat-card">
        <span className="stat-label">Max Humidity</span>
        <span className="stat-value stat-wet">{maxHumidity.humidity}%</span>
        <span className="stat-time">{fmt(maxHumidity.created_at)}</span>
      </div>
      <div className="stat-card">
        <span className="stat-label">Min Humidity</span>
        <span className="stat-value stat-dry">{minHumidity.humidity}%</span>
        <span className="stat-time">{fmt(minHumidity.created_at)}</span>
      </div>
    </div>
  )
}
