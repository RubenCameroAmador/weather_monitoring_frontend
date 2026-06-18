import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach } from 'vitest'
import { useTheme, ThemeProvider } from '../contexts/ThemeContext'

function TestConsumer() {
  const { theme, toggleTheme } = useTheme()
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button data-testid="toggle" onClick={toggleTheme}>Toggle</button>
    </div>
  )
}

function renderWithTheme() {
  return render(
    <ThemeProvider>
      <TestConsumer />
    </ThemeProvider>,
  )
}

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.clear()
    document.body.classList.remove('dark')
  })

  it('defaults to light theme', () => {
    renderWithTheme()
    expect(screen.getByTestId('theme')).toHaveTextContent('light')
  })

  it('toggles to dark theme', async () => {
    const user = userEvent.setup()
    renderWithTheme()
    await user.click(screen.getByTestId('toggle'))
    expect(screen.getByTestId('theme')).toHaveTextContent('dark')
  })

  it('toggles back to light theme', async () => {
    const user = userEvent.setup()
    renderWithTheme()
    await user.click(screen.getByTestId('toggle'))
    await user.click(screen.getByTestId('toggle'))
    expect(screen.getByTestId('theme')).toHaveTextContent('light')
  })

  it('persists theme in localStorage', async () => {
    const user = userEvent.setup()
    renderWithTheme()
    await user.click(screen.getByTestId('toggle'))
    expect(localStorage.getItem('theme')).toBe('dark')
  })

  it('reads theme from localStorage on mount', () => {
    localStorage.setItem('theme', 'dark')
    renderWithTheme()
    expect(screen.getByTestId('theme')).toHaveTextContent('dark')
  })

  it('adds dark class to body when dark', async () => {
    const user = userEvent.setup()
    renderWithTheme()
    await user.click(screen.getByTestId('toggle'))
    expect(document.body.classList.contains('dark')).toBe(true)
  })

  it('removes dark class from body when light', async () => {
    localStorage.setItem('theme', 'dark')
    renderWithTheme()
    const user = userEvent.setup()
    expect(document.body.classList.contains('dark')).toBe(true)
    await user.click(screen.getByTestId('toggle'))
    expect(document.body.classList.contains('dark')).toBe(false)
  })
})
