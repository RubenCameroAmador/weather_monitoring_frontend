import { useWeatherData } from '../../hooks/useWeatherData'
import { useTheme } from '../../contexts/ThemeContext.tsx'
import { CurrentIndicators } from '../CurrentIndicators/CurrentIndicators'
import { TemperatureChart } from '../TemperatureChart/TemperatureChart'
import { HumidityChart } from '../HumidityChart/HumidityChart'
import { TrendIndicators } from '../TrendIndicators/TrendIndicators'
import { PeriodStats } from '../PeriodStats/PeriodStats'
import { ComfortGauge } from '../ComfortGauge/ComfortGauge'
import { ConnectionStatus } from '../ConnectionStatus/ConnectionStatus'
import { Header } from '../Header/Header'
import './Dashboard.css'

export function Dashboard() {
  const { measurements, lastUpdated, isConnected, error } = useWeatherData()
  const { theme } = useTheme()
  const latest = measurements.length > 0 ? measurements[0] : null
  const previous = measurements.length > 1 ? measurements[1] : undefined

  return (
    <div className="dashboard">
      <Header lastUpdated={lastUpdated} />
      <ConnectionStatus isConnected={isConnected} error={error} />
      {latest && (
        <>
          <CurrentIndicators temperature={latest.temperature} humidity={latest.humidity} />
          <div className="charts-container">
            <TemperatureChart measurements={measurements} theme={theme} />
            <HumidityChart measurements={measurements} theme={theme} />
          </div>
          <div className="stats-container">
            <TrendIndicators
              temperature={latest.temperature}
              humidity={latest.humidity}
              prevTemperature={previous?.temperature}
              prevHumidity={previous?.humidity}
            />
            <PeriodStats measurements={measurements} />
            <ComfortGauge temperature={latest.temperature} humidity={latest.humidity} />
          </div>
        </>
      )}
      {!latest && !error && <p className="loading">Loading data...</p>}
      {!latest && error && <p className="loading">⚠️ {error} — waiting for data...</p>}
    </div>
  )
}
