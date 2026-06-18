import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.tsx'
import { ThemeToggle } from '../ThemeToggle/ThemeToggle'
import './Header.css'

interface HeaderProps {
  lastUpdated: Date | null
}

export function Header({ lastUpdated }: HeaderProps) {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="header">
      <div className="header-actions">
        <ThemeToggle />
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </div>
      <h1>Weather Monitoring</h1>
      <p className="author">by Rubén Camero</p>
      {lastUpdated && (
        <p className="last-updated">
          Last updated: {format(lastUpdated, 'yyyy-MM-dd HH:mm:ss')}
        </p>
      )}
    </header>
  )
}
