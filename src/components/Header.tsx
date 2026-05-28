import { format } from 'date-fns'

interface HeaderProps {
  lastUpdated: Date | null
}

export function Header({ lastUpdated }: HeaderProps) {
  return (
    <header className="header">
      <h1>Weather Monitoring</h1>
      <p className="author">by Rubén Camero</p>
      {lastUpdated && (
        <p className="last-updated">
          Last updated: {format(lastUpdated, 'yyyy-MM-dd HH:mm:ss')}
        </p>
      )}
    </header>
  )
}

