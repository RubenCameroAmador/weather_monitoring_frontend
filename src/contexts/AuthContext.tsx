import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { loginUser } from '../services/api.ts'

interface AuthContextValue {
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('auth_token'),
  )
  const [refreshToken, setRefreshToken] = useState<string | null>(
    () => localStorage.getItem('refresh_token'),
  )
  const [isLoading, setIsLoading] = useState(false)

  const login = useCallback(async (username: string, password: string) => {
    setIsLoading(true)
    try {
      const response = await loginUser(username, password)
      localStorage.setItem('auth_token', response.access_token)
      localStorage.setItem('refresh_token', response.refresh_token)
      setToken(response.access_token)
      setRefreshToken(response.refresh_token)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('refresh_token')
    setToken(null)
    setRefreshToken(null)
  }, [])

  return (
    <AuthContext.Provider value={{ token, refreshToken, isAuthenticated: token !== null, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
