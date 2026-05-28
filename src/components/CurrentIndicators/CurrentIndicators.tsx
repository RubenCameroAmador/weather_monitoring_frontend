import './CurrentIndicators.css'

interface CurrentIndicatorsProps {
  temperature: number
  humidity: number
}

export function CurrentIndicators({ temperature, humidity }: CurrentIndicatorsProps) {
  const tempStatus = temperature > 35 ? 'hot' : temperature < 15 ? 'cold' : 'normal'
  const humidityStatus = humidity > 80 ? 'high' : humidity < 30 ? 'low' : 'normal'

  return (
    <div className="indicators">
      <div className={`indicator-card temp-${tempStatus}`}>
        <span className="indicator-icon">🌡️</span>
        <div className="indicator-value">{temperature}°C</div>
        <div className="indicator-label">Temperature</div>
      </div>
      <div className={`indicator-card humidity-${humidityStatus}`}>
        <span className="indicator-icon">💧</span>
        <div className="indicator-value">{humidity}%</div>
        <div className="indicator-label">Humidity</div>
      </div>
    </div>
  )
}
