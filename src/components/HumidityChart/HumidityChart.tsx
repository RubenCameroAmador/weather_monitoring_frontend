import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { Measurement } from '../../types/Measurement'
import { format } from 'date-fns'
import './HumidityChart.css'

interface Props {
  measurements: Measurement[]
  theme: 'light' | 'dark'
}

export function HumidityChart({ measurements, theme }: Props) {
  const isDark = theme === 'dark'
  const data = [...measurements].reverse().map((m) => ({
    time: format(new Date(m.created_at), 'HH:mm:ss'),
    humidity: m.humidity,
  }))

  return (
    <div className="chart-card">
      <h3>💧 Humidity (%)</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <CartesianGrid stroke={isDark ? '#444' : '#ccc'} strokeDasharray="3 3" />
          <XAxis dataKey="time" fontSize={12} stroke={isDark ? '#aaa' : '#666'} />
          <YAxis domain={['auto', 'auto']} stroke={isDark ? '#aaa' : '#666'} />
          <Tooltip
            contentStyle={isDark ? { background: '#1e1e1e', border: '1px solid #444', color: '#e0e0e0', borderRadius: '8px' } : undefined}
          />
          <Line type="monotone" dataKey="humidity" stroke="#4ecdc4" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
