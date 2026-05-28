import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { Measurement } from '../types/Measurement'
import { format } from 'date-fns'

interface Props {
  measurements: Measurement[]
}

export function HumidityChart({ measurements }: Props) {
  const data = [...measurements].reverse().map((m) => ({
    time: format(new Date(m.created_at), 'HH:mm:ss'),
    humidity: m.humidity,
  }))

  return (
    <div className="chart-card">
      <h3>💧 Humidity (%)</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" fontSize={12} />
          <YAxis domain={['auto', 'auto']} />
          <Tooltip />
          <Line type="monotone" dataKey="humidity" stroke="#4ecdc4" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

