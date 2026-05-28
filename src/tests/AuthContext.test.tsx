import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthProvider, useAuth } from '../contexts/AuthContext'
import { BrowserRouter } from 'react-router-dom'

function TestConsumer() {
  const { token, isAuthenticated, isLoading, login, logout } = useAuth()
  return (
    <div>
      <p data-testid="token">{token ?? 'null'}</p>
      <p data-testid="authenticated">{isAuthenticated ? 'true' : 'false'}</p>
      <p data-testid="loading">{isLoading ? 'true' : 'false'}</p>
      <button data-testid="login-btn" onClick={() => login('user', 'pass')}>Login</button>
      <button data-testid="logout-btn" onClick={logout}>Logout</button>
    </div>
  )
}

function renderWithProvider() {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    </BrowserRouter>,
  )
}

vi.mock('../services/api', () => ({
  loginUser: vi.fn(),
}))

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('starts unauthenticated with no token', () => {
    renderWithProvider()
    expect(screen.getByTestId('token')).toHaveTextContent('null')
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false')
    expect(screen.getByTestId('loading')).toHaveTextContent('false')
  })

  it('reads existing token from localStorage on mount', () => {
    localStorage.setItem('auth_token', 'stored-token')
    renderWithProvider()
    expect(screen.getByTestId('token')).toHaveTextContent('stored-token')
    expect(screen.getByTestId('authenticated')).toHaveTextContent('true')
  })

  it('throws useAuth outside provider', () => {
    expect(() => render(<BrowserRouter><TestConsumer /></BrowserRouter>)).toThrow(
      'useAuth must be used within an AuthProvider',
    )
  })
})
