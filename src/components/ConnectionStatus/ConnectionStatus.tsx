import './ConnectionStatus.css'

interface ConnectionStatusProps {
  isConnected: boolean
  error: string | null
}

export function ConnectionStatus({ isConnected, error }: ConnectionStatusProps) {
  return (
    <div className="connection-status">
      <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`} />
      <span>{isConnected ? 'Live' : 'Reconnecting...'}</span>
      {error && <span className="error-msg">{error}</span>}
    </div>
  )
}
