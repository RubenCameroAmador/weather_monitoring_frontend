import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RegisterPage } from '../components/RegisterPage/RegisterPage'
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
  registerUser: vi.fn(),
}))

describe('RegisterPage', () => {
  beforeEach(() => {
    localStorage.clear()
    mockNavigate.mockClear()
  })

  it('renders registration form', () => {
    renderWithProviders(<RegisterPage />)
    expect(screen.getByLabelText('Username')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument()
  })

  it('shows validation error when fields are empty', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RegisterPage />)
    await user.click(screen.getByRole('button', { name: 'Create Account' }))
    expect(screen.getByText('⚠️ All fields are required')).toBeInTheDocument()
  })

  it('shows validation error when password is too short', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RegisterPage />)
    await user.type(screen.getByLabelText('Username'), 'ruben')
    await user.type(screen.getByLabelText('Password'), '12')
    await user.type(screen.getByLabelText('Confirm password'), '12')
    await user.click(screen.getByRole('button', { name: 'Create Account' }))
    expect(screen.getByText('⚠️ Password must be at least 4 characters')).toBeInTheDocument()
  })

  it('shows validation error when passwords do not match', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RegisterPage />)
    await user.type(screen.getByLabelText('Username'), 'ruben')
    await user.type(screen.getByLabelText('Password'), '1234')
    await user.type(screen.getByLabelText('Confirm password'), '5678')
    await user.click(screen.getByRole('button', { name: 'Create Account' }))
    expect(screen.getByText('⚠️ Passwords do not match')).toBeInTheDocument()
  })

  it('shows the subtitle text', () => {
    renderWithProviders(<RegisterPage />)
    expect(screen.getByText('Create your account')).toBeInTheDocument()
  })

  it('redirects to dashboard if already authenticated', () => {
    localStorage.setItem('auth_token', 'valid-token')
    renderWithProviders(<RegisterPage />)
    expect(screen.queryByLabelText('Username')).not.toBeInTheDocument()
  })

  it('shows success message after successful registration', async () => {
    const { registerUser } = await import('../services/api')
    vi.mocked(registerUser).mockResolvedValue({ id: 1, username: 'ruben' })

    const user = userEvent.setup()
    renderWithProviders(<RegisterPage />)
    await user.type(screen.getByLabelText('Username'), 'ruben')
    await user.type(screen.getByLabelText('Password'), '1234')
    await user.type(screen.getByLabelText('Confirm password'), '1234')
    await user.click(screen.getByRole('button', { name: 'Create Account' }))

    await waitFor(() => {
      expect(screen.getByText('✅ Account created!')).toBeInTheDocument()
    })
  })

  it('shows error from api on registration failure', async () => {
    const { registerUser } = await import('../services/api')
    vi.mocked(registerUser).mockRejectedValue(new Error('Username already taken'))

    const user = userEvent.setup()
    renderWithProviders(<RegisterPage />)
    await user.type(screen.getByLabelText('Username'), 'ruben')
    await user.type(screen.getByLabelText('Password'), '1234')
    await user.type(screen.getByLabelText('Confirm password'), '1234')
    await user.click(screen.getByRole('button', { name: 'Create Account' }))

    await waitFor(() => {
      expect(screen.getByText('⚠️ Username already taken')).toBeInTheDocument()
    })
  })
})
