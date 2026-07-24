import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import forbesLogo from '../assets/forbes-aac-logo.png'
import Avatar from './Avatar'

export default function Nav() {
  const { profile, signOut } = useAuth()
  const [showAvatarModal, setShowAvatarModal] = useState(false)

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
      <NavLink to="/participants" className={({ isActive }) => (isActive ? 'active' : '')}>Participants</NavLink> 
    </nav>
      <div className="user-chip">
        <button
          onClick={() => setShowAvatarModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit', font: 'inherit' }}
          title="Click to update your profile picture"
        >
          <Avatar name={profile?.full_name} url={profile?.avatar_url} size={28} />
          <span>{profile?.full_name}</span>
        </button>
        <button onClick={signOut}>Sign out</button>
      </div>

      {showAvatarModal && (
        <AvatarModal onClose={() => setShowAvatarModal(false)} />
      )}
    </header>
  )
}

function AvatarModal({ onClose }) {
  const { user, profile, refreshProfile } = useAuth()
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(profile?.avatar_url || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    let avatarUrl = profile?.avatar_url || null

    if (imageFile) {
      const path = `${user.id}/${Date.now()}-${imageFile.name}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, imageFile)
      if (upErr) {
        setSaving(false)
        setError(upErr.message)
        return
      }
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
      avatarUrl = pub.publicUrl
    }

    const { error: err } = await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', user.id)
    setSaving(false)
    if (err) {
      setError(err.message)
    } else {
      if (refreshProfile) await refreshProfile()
      onClose()
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="card modal-card" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: 20, marginBottom: 6 }}>Update your profile picture</h3>
        <p className="help-text" style={{ marginBottom: 16 }}>
          This photo shows up on the Active Participants page. Leave it blank to use your initials instead.
        </p>
        <form onSubmit={save}>
          <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <Avatar name={profile?.full_name} url={imagePreview} size={64} />
            <input type="file" accept="image/*" onChange={handleImageChange} />
          </div>
          {error && <p className="error-text">{error}</p>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save photo'}</button>
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}
