import './ComfortGauge.css'

interface ComfortGaugeProps {
  temperature: number
  humidity: number
}

function heatIndex(t: number, h: number): number {
  return t - 0.55 * (1 - 0.01 * h) * (t - 14.5)
}

function comfortLevel(hi: number): { label: string; emoji: string; level: string } {
  if (hi < 21) return { label: 'Comfortable', emoji: '😊', level: 'comfortable' }
  if (hi < 24) return { label: 'Slightly uncomfortable', emoji: '😐', level: 'mild' }
  return { label: 'Uncomfortable', emoji: '😓', level: 'uncomfortable' }
}

export function ComfortGauge({ temperature, humidity }: ComfortGaugeProps) {
  const hi = heatIndex(temperature, humidity)
  const comfort = comfortLevel(hi)

  const pct = Math.min(100, Math.max(0, ((hi - 15) / (30 - 15)) * 100))

  return (
    <div className="comfort-gauge">
      <div className="comfort-header">
        <span className="comfort-icon">🌤️</span>
        <span className="comfort-emoji">{comfort.emoji}</span>
      </div>
      <div className="comfort-value">{hi.toFixed(1)}°C</div>
      <div className="comfort-label">Feels like</div>
      <div className={`comfort-status ${comfort.level}`}>{comfort.label}</div>
      <div className="comfort-bar-track">
        <div className="comfort-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="comfort-scale">
        <span>15°C</span>
        <span>30°C</span>
      </div>
    </div>
  )
}
