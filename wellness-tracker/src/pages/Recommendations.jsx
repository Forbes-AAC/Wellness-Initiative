import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import Avatar from '../components/Avatar'

const CATEGORIES = [
  { key: 'recipe', label: 'Recipes' },
  { key: 'app', label: 'Apps' },
  { key: 'nutrition', label: 'Nutrition' },
  { key: 'fitness_accessory', label: 'Fitness Accessories' },
]

function Dropzone({ preview, onFile }) {
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  const handleFiles = (files) => {
    const file = files?.[0]
    if (file) onFile(file)
  }

  return (
    <div
      className={`dropzone ${dragOver ? 'dragover' : ''}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        handleFiles(e.dataTransfer.files)
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files)}
      />
      {preview ? (
        <img src={preview} alt="Preview" style={{ maxHeight: 90, borderRadius: 8 }} />
      ) : (
        <>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" style={{ marginBottom: 6 }}>
            <path d="M4 8a2 2 0 0 1 2-2h1.5l1-1.5h7l1 1.5H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="12" cy="13" r="3.2" stroke="currentColor" strokeWidth="1.6" />
          </svg>
          <div>Drag and drop, or click to upload</div>
        </>
      )}
    </div>
  )
}

export default function Recommendations() {
  const { user, profile } = useAuth()
  const [active, setActive] = useState('recipe')
  const [posts, setPosts] = useState([])
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [link, setLink] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editBody, setEditBody] = useState('')
  const [editLink, setEditLink] = useState('')
  const [editImageFile, setEditImageFile] = useState(null)
  const [editImagePreview, setEditImagePreview] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editMessage, setEditMessage] = useState('')

  const [openMenuId, setOpenMenuId] = useState(null)

  useEffect(() => {
    const close = () => setOpenMenuId(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('recommendations').select('*').order('created_at', { ascending: false })
    const { data: pf } = await supabase.from('profiles').select('id, avatar_url')
    setPosts(data || [])
    setProfiles(pf || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const avatarFor = (userId) => profiles.find((pr) => pr.id === userId)?.avatar_url || null

  const submit = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    setMessage('')

    let imageUrl = null
    if (imageFile) {
      const path = `${user.id}/${Date.now()}-${imageFile.name}`
      const { error: uploadError } = await supabase.storage.from('recommendation-images').upload(path, imageFile)
      if (uploadError) {
        setSaving(false)
        setMessage(uploadError.message)
        return
      }
      const { data: publicUrlData } = supabase.storage.from('recommendation-images').getPublicUrl(path)
      imageUrl = publicUrlData.publicUrl
    }

    const { error } = await supabase.from('recommendations').insert({
      user_id: user.id,
      author_name: profile?.full_name || 'Someone',
      category: active,
      title: title.trim(),
      body: body.trim() || null,
      link: link.trim() || null,
      image_url: imageUrl,
    })
    setSaving(false)
    if (error) {
      setMessage(error.message)
    } else {
      setTitle('')
      setBody('')
      setLink('')
      setImageFile(null)
      setImagePreview('')
      setMessage('Posted!')
      load()
    }
  }

  const remove = async (id) => {
    await supabase.from('recommendations').delete().eq('id', id)
    load()
  }

  const startEdit = (p) => {
    setEditingId(p.id)
    setEditTitle(p.title || '')
    setEditBody(p.body || '')
    setEditLink(p.link || '')
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

  const saveEdit = async (e, p) => {
    e.preventDefault()
    if (!editTitle.trim()) return
    setEditSaving(true)
    setEditMessage('')

    let imageUrl = p.image_url || null
    if (editImageFile) {
      const path = `${user.id}/${Date.now()}-${editImageFile.name}`
      const { error: uploadError } = await supabase.storage.from('recommendation-images').upload(path, editImageFile)
      if (uploadError) {
        setEditSaving(false)
        setEditMessage(uploadError.message)
        return
      }
      const { data: publicUrlData } = supabase.storage.from('recommendation-images').getPublicUrl(path)
      imageUrl = publicUrlData.publicUrl
    }

    const { error } = await supabase
      .from('recommendations')
      .update({
        title: editTitle.trim(),
        body: editBody.trim() || null,
        link: editLink.trim() || null,
        image_url: imageUrl,
      })
      .eq('id', p.id)

    setEditSaving(false)
    if (error) {
      setEditMessage(error.message)
    } else {
      setEditingId(null)
      load()
    }
  }

  const filtered = posts.filter((p) => p.category === active)
  const activeLabel = CATEGORIES.find((c) => c.key === active)?.label

  if (loading) return <main className="content"><p>Loading…</p></main>

  return (
    <main className="content">
      <div className="eyebrow">Community wall</div>
      <h1 style={{ fontSize: 32, marginBottom: 22 }}>Recommendations</h1>

      <div className="tabs" style={{ marginBottom: 28 }}>
        {CATEGORIES.map((c) => (
          <button key={c.key} className={`tab ${active === c.key ? 'active' : ''}`} onClick={() => setActive(c.key)}>
            {c.label}
          </button>
        ))}
      </div>

      <h2 style={{ fontSize: 22, marginBottom: 18 }}>Contribute a recommendation</h2>

      <div className="recs-layout">
        <div className="card" style={{ position: 'sticky', top: 24 }}>
          <h3 style={{ fontSize: 20, marginBottom: 4 }}>Recommendation form</h3>
          <p className="help-text" style={{ marginBottom: 16 }}>
            Share a recommendation, or ask your coworkers for one, in the {activeLabel} section.
          </p>
          <form onSubmit={submit}>
            <div className="field">
              <label>Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Best protein powder?" />
            </div>
            <div className="field">
              <label>Detailed description (or question for community)</label>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Add details, or ask a question" />
            </div>
            <div className="field">
              <label>Photo</label>
              <Dropzone
                preview={imagePreview}
                onFile={(file) => { setImageFile(file); setImagePreview(URL.createObjectURL(file)) }}
              />
            </div>
            <div className="field">
              <label>Link (optional)</label>
              <input type="text" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." />
            </div>
            <button
              className="btn btn-primary"
              disabled={saving || !title.trim()}
              type="submit"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {saving ? 'Posting…' : 'Post'}
            </button>
            {message && <p className="help-text" style={{ marginTop: 10 }}>{message}</p>}
          </form>
        </div>

        <div>
          {filtered.length === 0 && <p className="help-text">No posts yet in {activeLabel}. Be the first to share one!</p>}
          <div className="grid-2">
            {filtered.map((p) => (
              <div key={p.id} className="card post-card">
                {editingId === p.id ? (
                  <form onSubmit={(e) => saveEdit(e, p)}>
                    <div className="field">
                      <label>Title</label>
                      <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                    </div>
                    <div className="field">
                      <label>Detailed description</label>
                      <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={3} />
                    </div>
                    <div className="field">
                      <label>Photo</label>
                      <Dropzone
                        preview={editImagePreview}
                        onFile={(file) => { setEditImageFile(file); setEditImagePreview(URL.createObjectURL(file)) }}
                      />
                    </div>
                    <div className="field">
                      <label>Link (optional)</label>
                      <input type="text" value={editLink} onChange={(e) => setEditLink(e.target.value)} placeholder="https://..." />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-primary" type="submit" disabled={editSaving || !editTitle.trim()}>
                        {editSaving ? 'Saving…' : 'Save'}
                      </button>
                      <button className="btn btn-outline" type="button" onClick={cancelEdit}>Cancel</button>
                    </div>
                    {editMessage && <p className="help-text" style={{ marginTop: 8 }}>{editMessage}</p>}
                  </form>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 8 }}>
                      <h3 style={{ fontSize: 17, margin: 0 }}>
                        {p.link ? (
                          <a href={p.link} target="_blank" rel="noreferrer" className="post-link-title">{p.title}</a>
                        ) : p.title}
                      </h3>
                      {p.user_id === user?.id && (
                        <div style={{ position: 'relative' }}>
                          <button
                            className="icon-btn"
                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === p.id ? null : p.id) }}
                          >
                            ⋯
                          </button>
                          {openMenuId === p.id && (
                            <div className="menu-popover" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => { startEdit(p); setOpenMenuId(null) }}>Edit</button>
                              <button className="danger" onClick={() => { remove(p.id); setOpenMenuId(null) }}>Delete</button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {p.image_url && (
                      <img
                        src={p.image_url}
                        alt={p.title}
                        style={{ width: '100%', height: 150, objectFit: 'cover', borderRadius: 8, marginBottom: 10 }}
                      />
                    )}
                    {p.body && <p style={{ marginBottom: 10, fontSize: 14 }}>{p.body}</p>}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar name={p.author_name} url={avatarFor(p.user_id)} size={28} />
                      <div style={{ fontSize: 13, lineHeight: 1.3 }}>
                        <div className="help-text">Posted by</div>
                        <div style={{ fontWeight: 600 }}>
                          {p.author_name} <span className="help-text" style={{ fontWeight: 400 }}>· {new Date(p.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
