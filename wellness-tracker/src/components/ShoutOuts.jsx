import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'

export default function ShoutOuts({ profiles = [], shoutOuts = [], onChanged }) {
  const { user, profile } = useAuth()
  const [message, setMessage] = useState('')
  const [taggedIds, setTaggedIds] = useState([])
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [editingId, setEditingId] = useState(null)
  const [editMessage, setEditMessage] = useState('')
  const [editImageFile, setEditImageFile] = useState(null)
  const [editImagePreview, setEditImagePreview] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  const others = profiles.filter((p) => p.id !== user?.id)

  const toggleTag = (id) => {
    setTaggedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!message.trim()) return
    setSaving(true)
    setError('')

    let imageUrl = null
    if (imageFile) {
      const path = `${user.id}/${Date.now()}-${imageFile.name}`
      const { error: uploadError } = await supabase.storage.from('shout-out-images').upload(path, imageFile)
      if (uploadError) {
        setSaving(false)
        setError(uploadError.message)
        return
      }
      const { data: publicUrlData } = supabase.storage.from('shout-out-images').getPublicUrl(path)
      imageUrl = publicUrlData.publicUrl
    }

    const { error: insertError } = await supabase.from('shout_outs').insert({
      user_id: user.id,
      author_name: profile?.full_name || 'Someone',
      message: message.trim(),
      image_url: imageUrl,
      tagged_user_ids: taggedIds,
    })

    setSaving(false)
    if (insertError) {
      setError(insertError.message)
    } else {
      setMessage('')
      setTaggedIds([])
      setImageFile(null)
      setImagePreview('')
      if (onChanged) onChanged()
    }
  }

  const remove = async (id) => {
    await supabase.from('shout_outs').delete().eq('id', id)
    if (onChanged) onChanged()
  }

  const startEdit = (s) => {
    setEditingId(s.id)
    setEditMessage(s.message || '')
    setEditImageFile(null)
    setEditImagePreview(s.image_url || '')
    setEditError('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditImageFile(null)
    setEditImagePreview('')
    setEditError('')
  }

  const handleEditImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setEditImageFile(file)
    setEditImagePreview(URL.createObjectURL(file))
  }

  const saveEdit = async (e, s) => {
    e.preventDefault()
    if (!editMessage.trim()) return
    setEditSaving(true)
    setEditError('')

    let imageUrl = s.image_url || null
    if (editImageFile) {
      const path = `${user.id}/${Date.now()}-${editImageFile.name}`
      const { error: uploadError } = await supabase.storage.from('shout-out-images').upload(path, editImageFile)
      if (uploadError) {
        setEditSaving(false)
        setEditError(uploadError.message)
        return
      }
      const { data: publicUrlData } = supabase.storage.from('shout-out-images').getPublicUrl(path)
      imageUrl = publicUrlData.publicUrl
    }

    const { error: updateError } = await supabase
      .from('shout_outs')
      .update({ message: editMessage.trim(), image_url: imageUrl })
      .eq('id', s.id)

    setEditSaving(false)
    if (updateError) {
      setEditError(updateError.message)
    } else {
      setEditingId(null)
      if (onChanged) onChanged()
    }
  }

  const nameFor = (id) => profiles.find((p) => p.id === id)?.full_name || 'A coworker'

  return (
    <div className="card" style={{ marginBottom: 26 }}>
      <div className="eyebrow" style={{ marginBottom: 10 }}>Shout-outs 📣</div>
      <h3 style={{ fontSize: 18, marginBottom: 6 }}>Give a coworker a shout-out</h3>
      <p className="help-text" style={{ marginBottom: 16 }}>
        See someone crushing a workout, hitting their steps, or eating well? Post a pic, meme, or message and tag them here!
      </p>

      <form onSubmit={submit} style={{ marginBottom: 22 }}>
        <div className="field" style={{ marginBottom: 12 }}>
          <label>Your shout-out</label>
          <textarea
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g. Shout-out to Jamie for hitting 12k steps every day this week!"
            required
          />
        </div>

        {others.length > 0 && (
          <div className="field" style={{ marginBottom: 12 }}>
            <label>Tag coworkers</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {others.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => toggleTag(p.id)}
                  className={`tab ${taggedIds.includes(p.id) ? 'active' : ''}`}
                  style={{ fontSize: 13, padding: '4px 12px' }}
                >
                  {p.full_name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="field" style={{ marginBottom: 12 }}>
          <label>Photo or meme (optional)</label>
          <input type="file" accept="image/*" onChange={handleImageChange} />
          {imagePreview && (
            <img src={imagePreview} alt="Preview" style={{ marginTop: 8, maxWidth: 160, borderRadius: 8, display: 'block' }} />
          )}
        </div>

        {error && <p className="error-text">{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={saving || !message.trim()}>
          {saving ? 'Posting…' : 'Post shout-out'}
        </button>
      </form>

      <div className="grid-3">
        {shoutOuts.length === 0 && (
          <p className="help-text">No shout-outs yet — be the first to celebrate a coworker!</p>
        )}
        {shoutOuts.map((s) => (
          <div key={s.id} className="card" style={{padding: 16 }}>
            {editingId === s.id ? (
              <form onSubmit={(e) => saveEdit(e, s)}>
                <div className="field" style={{ marginBottom: 12 }}>
                  <label>Your shout-out</label>
                  <textarea rows={3} value={editMessage} onChange={(e) => setEditMessage(e.target.value)} required />
                </div>
                <div className="field" style={{ marginBottom: 12 }}>
                  <label>Photo or meme (optional)</label>
                  <input type="file" accept="image/*" onChange={handleEditImageChange} />
                  {editImagePreview && (
                    <img src={editImagePreview} alt="Preview" style={{ marginTop: 8, maxWidth: 160, borderRadius: 8, display: 'block' }} />
                  )}
                </div>
                {editError && <p className="error-text">{editError}</p>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary" type="submit" disabled={editSaving || !editMessage.trim()}>
                    {editSaving ? 'Saving…' : 'Save'}
                  </button>
                  <button className="btn btn-outline" type="button" onClick={cancelEdit}>Cancel</button>
                </div>
              </form>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <p className="help-text" style={{ marginBottom: 6 }}>
                    {s.author_name} · {new Date(s.created_at).toLocaleDateString()}
                  </p>
                  {s.user_id === user?.id && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => startEdit(s)}>
                        Edit
                      </button>
                      <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => remove(s.id)}>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
                {s.image_url && (
                  <img src={s.image_url} alt="Shout-out" style={{ maxWidth: '100%', maxHeight: 140, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }} />
                )}
                <p style={{ marginBottom: 8 }}>{s.message}</p>
                {s.tagged_user_ids?.length > 0 && (
                  <p className="help-text">Shout-out to: {s.tagged_user_ids.map((id) => nameFor(id)).join(', ')}</p>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
