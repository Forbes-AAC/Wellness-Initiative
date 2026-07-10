import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import forbesLogo from '../assets/forbes-aac-logo.png'

export default function Nav() {
  const { profile, signOut } = useAuth()

return (
  <header className="topbar">
  <div className="brand">
  <img src={forbesLogo} alt="Forbes AAC" style={{ height: 28 }} />
<span className="display" style={{ fontSize: 16 }}>Wellness</span>
</div>
<nav className="nav-links">
<NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>Dashboard</NavLink>
<NavLink to="/tracker" className={({ isActive }) => (isActive ? 'active' : '')}>Tracker</NavLink>
<NavLink to="/challenges" className={({ isActive }) => (isActive ? 'active' : '')}>Challenges</NavLink>
<NavLink to="/prizes" className={({ isActive }) => (isActive ? 'active' : '')}>Prizes</NavLink>
<NavLink to="/recommendations" className={({ isActive }) => (isActive ? 'active' : '')}>Recommendations</NavLink>
</nav>
<div className="user-chip">
<span>{profile?.full_name}</span>
<button onClick={signOut}>Sign out</button>
</div>
</header>
)
}
