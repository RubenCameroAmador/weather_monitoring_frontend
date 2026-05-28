import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import { AuthProvider } from '../contexts/AuthContext'
import { ProtectedRoute } from '../components/ProtectedRoute/ProtectedRoute'

function renderWithAuth(token: string | null, initialRoute = '/dashboard') {
  if (token) localStorage.setItem('auth_token', token)
  else localStorage.removeItem('auth_token')

  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <AuthProvider>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<p data-testid="protected-content">Dashboard</p>} />
          </Route>
          <Route path="/login" element={<p data-testid="login-page">Login Page</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders children when authenticated', () => {
    renderWithAuth('valid-token')
    expect(screen.getByTestId('protected-content')).toHaveTextContent('Dashboard')
  })

  it('redirects to /login when unauthenticated', () => {
    renderWithAuth(null)
    expect(screen.getByTestId('login-page')).toHaveTextContent('Login Page')
  })
})
