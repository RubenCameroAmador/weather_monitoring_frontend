import { screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Header } from '../components/Header/Header'
import { renderWithProviders } from './test-utils'

describe('Header', () => {
  it('renders title and author', () => {
    renderWithProviders(<Header lastUpdated={null} />)
    expect(screen.getByText('Weather Monitoring')).toBeInTheDocument()
    expect(screen.getByText('by Rubén Camero')).toBeInTheDocument()
  })

  it('shows last updated when provided', () => {
    renderWithProviders(<Header lastUpdated={new Date('2026-04-27T19:12:15')} />)
    expect(screen.getByText(/Last updated/)).toBeInTheDocument()
  })
})
