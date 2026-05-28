import { useWeatherData } from '../../hooks/useWeatherData'
import { CurrentIndicators } from '../CurrentIndicators/CurrentIndicators'
import { TemperatureChart } from '../TemperatureChart/TemperatureChart'
import { HumidityChart } from '../HumidityChart/HumidityChart'
import { ConnectionStatus } from '../ConnectionStatus/ConnectionStatus'
import { Header } from '../Header/Header'
import './Dashboard.css'

export function Dashboard() {
  const { measurements, lastUpdated, isConnected, error } = useWeatherData()
  const latest = measurements.length > 0 ? measurements[0] : null

  return (
    <div className="dashboard">
      <Header lastUpdated={lastUpdated} />
      <ConnectionStatus isConnected={isConnected} error={error} />
      {latest && (
        <>
          <CurrentIndicators temperature={latest.temperature} humidity={latest.humidity} />
          <div className="charts-container">
            <TemperatureChart measurements={measurements} />
            <HumidityChart measurements={measurements} />
          </div>
        </>
      )}
      {!latest && !error && <p className="loading">Loading data...</p>}
      {!latest && error && <p className="loading">⚠️ {error} — waiting for data...</p>}
    </div>
  )
}
