import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ConnectionStatus } from '../components/ConnectionStatus'

describe('ConnectionStatus', () => {
  it('shows Live when connected', () => {
    render(<ConnectionStatus isConnected={true} error={null} />)
    expect(screen.getByText('Live')).toBeInTheDocument()
  })

  it('shows Reconnecting when disconnected', () => {
    render(<ConnectionStatus isConnected={false} error={null} />)
    expect(screen.getByText('Reconnecting...')).toBeInTheDocument()
  })

  it('shows error message', () => {
    render(<ConnectionStatus isConnected={false} error="Connection failed" />)
    expect(screen.getByText('Connection failed')).toBeInTheDocument()
  })
})

