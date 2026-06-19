import './TrendIndicators.css'

interface TrendIndicatorsProps {
  temperature: number
  humidity: number
  prevTemperature?: number
  prevHumidity?: number
}

export function TrendIndicators({ temperature, humidity, prevTemperature, prevHumidity }: TrendIndicatorsProps) {
  const tempDelta = prevTemperature !== undefined ? temperature - prevTemperature : null
  const humidityDelta = prevHumidity !== undefined ? humidity - prevHumidity : null

  const tempArrow = tempDelta === null ? '—' : tempDelta > 0 ? '▲' : tempDelta < 0 ? '▼' : '—'
  const humidityArrow = humidityDelta === null ? '—' : humidityDelta > 0 ? '▲' : humidityDelta < 0 ? '▼' : '—'
  const tempColor = tempDelta === null ? '' : tempDelta > 0 ? 'trend-up' : tempDelta < 0 ? 'trend-down' : ''
  const humidityColor = humidityDelta === null ? '' : humidityDelta > 0 ? 'trend-up' : humidityDelta < 0 ? 'trend-down' : ''

  return (
    <div className="trend-indicators">
      <div className="trend-card">
        <span className="trend-icon">🌡️</span>
        <span className={`trend-value ${tempColor}`}>
          {temperature}°C
          <span className="trend-arrow">{tempArrow}</span>
        </span>
        <span className="trend-label">Temperature</span>
        {tempDelta !== null && (
          <span className={`trend-delta ${tempColor}`}>
            {tempDelta > 0 ? '+' : ''}{tempDelta.toFixed(1)}°C
          </span>
        )}
      </div>
      <div className="trend-card">
        <span className="trend-icon">💧</span>
        <span className={`trend-value ${humidityColor}`}>
          {humidity}%
          <span className="trend-arrow">{humidityArrow}</span>
        </span>
        <span className="trend-label">Humidity</span>
        {humidityDelta !== null && (
          <span className={`trend-delta ${humidityColor}`}>
            {humidityDelta > 0 ? '+' : ''}{humidityDelta.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  )
}
