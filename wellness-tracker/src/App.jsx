import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Nav from './components/Nav'
import Login from './pages/Login'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import Tracker from './pages/Tracker'
import Challenges from './pages/Challenges'
import Prizes from './pages/Prizes'
import Recommendations from './pages/Recommendations'
import Participants from './pages/Participants'

export default function App() {
  const { user, loading, passwordRecovery } = useAuth()

  if (loading) {
    return <div className="center-page"><p>Loading…</p></div>
  }

  if (passwordRecovery) {
    return <ResetPassword />
  }

  if (!user) {
    return <Login />
  }

  return (
    <div className="app-shell">
      <Nav />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/tracker" element={<Tracker />} />
        <Route path="/challenges" element={<Challenges />} />
        <Route path="/prizes" element={<Prizes />} />
        <Route path="/recommendations" element={<Recommendations />} />
        <Route path="/participants" element={<Participants />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
