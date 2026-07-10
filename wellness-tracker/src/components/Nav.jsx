import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Nav() {
  const { profile, signOut } = useAuth()

  return (
    <header className="topbar">
      <div className="brand">
        <span className="blaze" />
        <span className="display">Basecamp</span>
      </div>
      <nav className="nav-links">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>Dashboard</NavLink>
        <NavLink to="/tracker" className={({ isActive }) => (isActive ? 'active' : '')}>Tracker</NavLink>
        <NavLink to="/challenges" className={({ isActive }) => (isActive ? 'active' : '')}>Challenges</NavLink>
        <NavLink to="/prizes" className={({ isActive }) => (isActive ? 'active' : '')}>Prizes</NavLink>
      </nav>
      <div className="user-chip">
        <span>{profile?.full_name}</span>
        <button onClick={signOut}>Sign out</button>
      </div>
    </header>
  )
}
