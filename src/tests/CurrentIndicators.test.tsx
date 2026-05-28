import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { CurrentIndicators } from '../components/CurrentIndicators/CurrentIndicators'

describe('CurrentIndicators', () => {
  it('renders temperature and humidity values', () => {
    render(<CurrentIndicators temperature={32.6} humidity={67.9} />)
    expect(screen.getByText('32.6°C')).toBeInTheDocument()
    expect(screen.getByText('67.9%')).toBeInTheDocument()
  })

  it('shows hot status for high temperature', () => {
    const { container } = render(<CurrentIndicators temperature={40} humidity={50} />)
    expect(container.querySelector('.temp-hot')).toBeInTheDocument()
  })

  it('shows normal humidity status', () => {
    const { container } = render(<CurrentIndicators temperature={25} humidity={50} />)
    expect(container.querySelector('.humidity-normal')).toBeInTheDocument()
  })
})

