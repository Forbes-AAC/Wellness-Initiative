import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import forbesLogo from '../assets/forbes-aac-logo.png'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('signin')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setNotice('')
    setBusy(true)
    if (mode === 'signin') {
      const { error } = await signIn(email, password)
      if (error) setError(error.message)
    } else {
      const { error } = await signUp(email, password, fullName)
      if (error) setError(error.message)
      else setNotice('Account created! Check your email to confirm, then sign in.')
    }
    setBusy(false)
  }

  return (
    <div className="center-page">
      <div className="card auth-card">
        <div className="eyebrow">{mode === 'signin' ? 'Welcome back' : 'Join the team'}</div>
      <img src={forbesLogo} alt="Forbes AAC" style={{ height: 40, marginBottom: 10 }} />
        <h1 style={{ fontSize: 22, marginBottom: 18 }}>Wellness</h1>

        <div className="tabs">
          <button type="button" className={`tab ${mode === 'signin' ? 'active' : ''}`} onClick={() => setMode('signin')}>Sign in</button>
          <button type="button" className={`tab ${mode === 'signup' ? 'active' : ''}`} onClick={() => setMode('signup')}>Create account</button>
        </div>

        <form onSubmit={submit}>
          {mode === 'signup' && (
            <div className="field">
              <label>Full name</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
          )}
          <div className="field">
            <label>Work email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
          </div>
          {error && <p className="error-text">{error}</p>}
          {notice && <p className="help-text">{notice}</p>}
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={busy}>
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  )
}
