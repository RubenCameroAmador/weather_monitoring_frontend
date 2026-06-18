import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LoginPage } from '../components/LoginPage/LoginPage'
import { renderWithProviders } from './test-utils'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('../services/api', () => ({
  loginUser: vi.fn(),
}))

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear()
    mockNavigate.mockClear()
  })

  it('renders login form', () => {
    renderWithProviders(<LoginPage />)
    expect(screen.getByLabelText('Username')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
  })

  it('shows validation error when fields are empty', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)
    await user.click(screen.getByRole('button', { name: 'Sign In' }))
    expect(screen.getByText('⚠️ Both fields are required')).toBeInTheDocument()
  })

  it('redirects to dashboard if already authenticated', () => {
    localStorage.setItem('auth_token', 'valid-token')
    renderWithProviders(<LoginPage />)
    expect(screen.queryByLabelText('Username')).not.toBeInTheDocument()
  })

  it('shows the subtitle text', () => {
    renderWithProviders(<LoginPage />)
    expect(screen.getByText('Sign in to continue')).toBeInTheDocument()
  })

  it('shows registration link', () => {
    renderWithProviders(<LoginPage />)
    expect(screen.getByText('Regístrate')).toBeInTheDocument()
    expect(screen.getByText('¿No tienes cuenta?')).toBeInTheDocument()
  })
})
