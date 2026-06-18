import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach } from 'vitest'
import { ThemeToggle } from '../components/ThemeToggle/ThemeToggle'
import { renderWithProviders } from './test-utils'

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear()
    document.body.classList.remove('dark')
  })

  it('renders moon icon in light mode', () => {
    renderWithProviders(<ThemeToggle />)
    expect(screen.getByRole('button', { name: 'Toggle theme' })).toHaveTextContent('🌙')
  })

  it('toggles to sun icon on click', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ThemeToggle />)
    await user.click(screen.getByRole('button', { name: 'Toggle theme' }))
    expect(screen.getByRole('button', { name: 'Toggle theme' })).toHaveTextContent('☀️')
  })
})
