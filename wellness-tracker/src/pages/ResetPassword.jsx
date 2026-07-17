import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function ResetPassword() {
  const { updatePassword, cancelPasswordRecovery, signOut } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setBusy(true)
    const { error } = await updatePassword(password)
    setBusy(false)
    if (error) setError(error.message)
    else setDone(true)
  }

  if (done) {
    return (
      <div className="center-page">
        <div className="card auth-card">
          <div className="eyebrow">Reset your password</div>
          <h1 style={{ fontSize: 22, marginBottom: 18 }}>Password updated</h1>
          <p className="help-text" style={{ marginBottom: 16 }}>You can continue to the app now.</p>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={cancelPasswordRecovery}>Continue</button>
        </div>
      </div>
    )
  }

  return (
    <div className="center-page">
      <div className="card auth-card">
        <div className="eyebrow">Reset your password</div>
        <h1 style={{ fontSize: 22, marginBottom: 18 }}>Choose a new password</h1>
        <form onSubmit={submit}>
          <div className="field">
            <label>New password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
          </div>
          <div className="field">
            <label>Confirm new password</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={6} required />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={busy}>Update password</button>
          <p className="help-text" style={{ marginTop: 12, textAlign: 'center' }}>
            <button type="button" onClick={() => { cancelPasswordRecovery(); signOut() }} style={{ background: 'none', border: 'none', color: 'var(--pine)', textDecoration: 'underline', cursor: 'pointer', padding: 0, font: 'inherit' }}>Cancel</button>
          </p>
        </form>
      </div>
    </div>
  )
}
