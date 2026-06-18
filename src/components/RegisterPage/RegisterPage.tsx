import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.tsx'
import { ThemeToggle } from '../ThemeToggle/ThemeToggle'
import { registerUser } from '../../services/api.ts'
import './RegisterPage.css'

export function RegisterPage() {
  const { isAuthenticated } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!username.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('All fields are required')
      return
    }

    if (password.length < 4) {
      setError('Password must be at least 4 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)
    try {
      await registerUser(username, password)
      setIsSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="register-page">
        <div className="register-card">
          <p className="register-success">
            ✅ Account created! <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="register-page">
      <div className="register-card">
        <ThemeToggle />
        <h1 className="register-title">Weather Monitoring</h1>
        <p className="register-subtitle">Create your account</p>

        <form onSubmit={handleSubmit} className="register-form">
          <div className="register-field">
            <label htmlFor="reg-username" className="register-label">Username</label>
            <input
              id="reg-username"
              type="text"
              className="register-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
          </div>

          <div className="register-field">
            <label htmlFor="reg-password" className="register-label">Password</label>
            <input
              id="reg-password"
              type="password"
              className="register-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="register-field">
            <label htmlFor="reg-confirm" className="register-label">Confirm password</label>
            <input
              id="reg-confirm"
              type="password"
              className="register-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {error && <p className="register-error">⚠️ {error}</p>}

          <button type="submit" className="register-submit" disabled={isLoading}>
            {isLoading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="register-login-link">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
