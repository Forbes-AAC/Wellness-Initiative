import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { currentMonth, monthLabel } from '../lib/dateUtils'

const SIZE_LABELS = { big: 'Big', medium: 'Medium', small: 'Small' }

export default function Prizes() {
  const { user, profile } = useAuth()
  const month = currentMonth()
  const [prizes, setPrizes] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ title: '', description: '', size: 'medium' })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ title: '', description: '', size: 'medium' })
  const [editImageFile, setEditImageFile] = useState(null)
  const [editImagePreview, setEditImagePreview] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editMessage, setEditMessage] = useState('')

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('prizes').select('*').eq('month', month).order('created_at')
    setPrizes(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const addPrize = async (e) => {
    e.preventDefault()
    if (!form.title) return
    setSaving(true)
    setMessage('')

    let imageUrl = null
    if (imageFile) {
      const path = `${month}/${Date.now()}-${imageFile.name}`
      const { error: uploadError } = await supabase.storage.from('prize-images').upload(path, imageFile)
      if (uploadError) {
        setSaving(false)
        setMessage(uploadError.message)
        return
      }
      const { data: publicUrlData } = supabase.storage.from('prize-images').getPublicUrl(path)
      imageUrl = publicUrlData.publicUrl
    }

    const { error } = await supabase.from('prizes').insert({ title: form.title, description: form.description, size: form.size, image_url: imageUrl, month, created_by: user.id })
    setSaving(false)
    if (error) {
      setMessage(error.message)
    } else {
      setForm({ title: '', description: '', size: 'medium' })
      setImageFile(null)
      setImagePreview('')
      load()
    }
  }

  const removePrize = async (id) => {
    await supabase.from('prizes').delete().eq('id', id)
    load()
  }

  const startEdit = (p) => {
    setEditingId(p.id)
    setEditForm({ title: p.title || '', description: p.description || '', size: p.size || 'medium' })
    setEditImageFile(null)
    setEditImagePreview(p.image_url || '')
    setEditMessage('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditImageFile(null)
    setEditImagePreview('')
    setEditMessage('')
  }

  const handleEditImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setEditImageFile(file)
    setEditImagePreview(URL.createObjectURL(file))
  }

  const saveEdit = async (e, p) => {
    e.preventDefault()
    if (!editForm.title) return
    setEditSaving(true)
    setEditMessage('')

    let imageUrl = p.image_url || null
    if (editImageFile) {
      const path = `${month}/${Date.now()}-${editImageFile.name}`
      const { error: uploadError } = await supabase.storage.from('prize-images').upload(path, editImageFile)
      if (uploadError) {
        setEditSaving(false)
        setEditMessage(uploadError.message)
        return
      }
      const { data: publicUrlData } = supabase.storage.from('prize-images').getPublicUrl(path)
      imageUrl = publicUrlData.publicUrl
    }

    const { error } = await supabase
      .from('prizes')
      .update({ title: editForm.title, description: editForm.description, size: editForm.size, image_url: imageUrl })
      .eq('id', p.id)

    setEditSaving(false)
    if (error) {
      setEditMessage(error.message)
    } else {
      setEditingId(null)
      load()
    }
  }

  if (loading) return <main className="content"><p>Loading…</p></main>

  return (
    <main className="content">
      <div className="eyebrow">{monthLabel(month)}</div>
      <h1 style={{ fontSize: 32, marginBottom: 6 }}>What you're playing for</h1>
      <p className="help-text" style={{ marginBottom: 16 }}>
        Hit your goal on more than 90% of days this month (or lose weight, for the weight challenge) and you're entered into the drawing for one of these.
      </p>

      <div className="card" style={{ marginBottom: 26, maxWidth: 620 }}>
        <strong style={{ display: 'block', marginBottom: 8 }}>Prize key</strong>
        <p className="help-text" style={{ margin: 0 }}>
          If you win the drawing, choose <span className="badge badge-big">Big</span> ×1, <span className="badge badge-medium">Medium</span> ×2, or <span className="badge badge-small">Small</span> ×3.
        </p>
      </div>

      <div className="grid-3" style={{ marginBottom: 30 }}>
        {prizes.map((p) => (
          <div className="card" key={p.id}>
            {editingId === p.id ? (
              <form onSubmit={(e) => saveEdit(e, p)}>
                <div className="field">
                  <label>Title</label>
                  <input type="text" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} required />
                </div>
                <div className="field">
                  <label>Description</label>
                  <textarea rows={3} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
                </div>
                <div className="field">
                  <label>Prize size</label>
                  <select value={editForm.size} onChange={(e) => setEditForm({ ...editForm, size: e.target.value })} required>
                    <option value="big">Big (choose 1 if you win)</option>
                    <option value="medium">Medium (choose 2 if you win)</option>
                    <option value="small">Small (choose 3 if you win)</option>
                  </select>
                </div>
                <div className="field">
                  <label>Photo (optional)</label>
                  <input type="file" accept="image/*" onChange={handleEditImageChange} />
                  {editImagePreview && (
                    <img src={editImagePreview} alt="Preview" style={{ marginTop: 8, maxWidth: 160, borderRadius: 8, display: 'block' }} />
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary" type="submit" disabled={editSaving}>{editSaving ? 'Saving…' : 'Save'}</button>
                  <button className="btn btn-outline" type="button" onClick={cancelEdit}>Cancel</button>
                </div>
                {editMessage && <p className="help-text" style={{ marginTop: 8 }}>{editMessage}</p>}
              </form>
            ) : (
              <>
                {p.image_url && <img src={p.image_url} alt={p.title} style={{ width: '100%', borderRadius: 10, marginBottom: 12, aspectRatio: '4/3', objectFit: 'cover' }} />}
                {p.size && <span className={`badge badge-${p.size}`} style={{ marginBottom: 8, display: 'inline-block' }}>{SIZE_LABELS[p.size] || p.size}</span>}
                <h3 style={{ fontSize: 18, marginBottom: 6 }}>{p.title}</h3>
                <p className="help-text">{p.description}</p>
                {profile?.is_admin && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button className="btn btn-outline" onClick={() => startEdit(p)}>Edit</button>
                    <button className="btn btn-danger" onClick={() => removePrize(p.id)}>Remove</button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
        {prizes.length === 0 && <p className="help-text">No prizes have been posted for this month yet.</p>}
      </div>

      {profile?.is_admin && (
        <div className="card" style={{ maxWidth: 520 }}>
          <h3 style={{ fontSize: 18, marginBottom: 14 }}>Add a prize</h3>
          <form onSubmit={addPrize}>
            <div className="field">
              <label>Title</label>
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="field">
              <label>Description</label>
              <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="field">
              <label>Prize size</label>
              <select value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} required>
                <option value="big">Big (choose 1 if you win)</option>
                <option value="medium">Medium (choose 2 if you win)</option>
                <option value="small">Small (choose 3 if you win)</option>
              </select>
            </div>
            <div className="field">
              <label>Photo (optional)</label>
              <input type="file" accept="image/*" onChange={handleImageChange} />
              {imagePreview && (
                <img src={imagePreview} alt="Preview" style={{ marginTop: 8, maxWidth: 160, borderRadius: 8, display: 'block' }} />
              )}
            </div>
            <button className="btn btn-primary" disabled={saving}>Add prize</button>
            {message && <span className="help-text" style={{ marginLeft: 12 }}>{message}</span>}
          </form>
        </div>
      )}
    </main>
  )
}
