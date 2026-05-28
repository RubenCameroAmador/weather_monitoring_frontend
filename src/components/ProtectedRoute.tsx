import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.tsx'

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) return <p className="loading">Verifying session...</p>
  if (!isAuthenticated) return <Navigate to="/login" replace />

  return <Outlet />
}
