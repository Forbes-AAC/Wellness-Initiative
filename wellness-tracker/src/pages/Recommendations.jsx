import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'

const CATEGORIES = [
  { key: 'recipe', label: 'Recipes' },
  { key: 'app', label: 'Apps' },
  { key: 'nutrition', label: 'Nutrition' },
  { key: 'fitness_accessory', label: 'Fitness Accessories' },
  ]

export default function Recommendations() {
  const { user, profile } = useAuth()
  const [active, setActive] = useState('recipe')
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [link, setLink] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

const load = async () => {
  setLoading(true)
  const { data } = await supabase.from('recommendations').select('*').order('created_at', { ascending: false })
  setPosts(data || [])
  setLoading(false)
}

useEffect(() => { load() }, [])

const handleImageChange = (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  setImageFile(file)
  setImagePreview(URL.createObjectURL(file))
}

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

const filtered = posts.filter((p) => p.category === active)
  const activeLabel = CATEGORIES.find((c) => c.key === active)?.label

if (loading) return <main className="content"><p>Loading…</p></main>
  
  return (
  <main className="content">
  <div className="eyebrow">Community wall</div>
  <h1 style={{ fontSize: 32, marginBottom: 22 }}>Recommendations</h1>
  
  <div className="tabs">
    {CATEGORIES.map((c) => (
    <button key={c.key} className={`tab ${active === c.key ? 'active' : ''}`} onClick={() => setActive(c.key)}>
      {c.label}
    </button>
    ))}
  </div>
  
  <div className="card" style={{ maxWidth: 640, marginBottom: 24 }}>
  <h3 style={{ fontSize: 20, marginBottom: 6 }}>Post to {activeLabel}</h3>
  <p className="help-text" style={{ marginBottom: 16 }}>
  Share a recommendation, or ask your coworkers for one, in the {activeLabel} section.
  </p>
  <form onSubmit={submit}>
  <div className="form-grid" style={{ marginBottom: 12 }}>
  <div className="field">
  <label>Title</label>
  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Best protein powder?" />
  </div>
  <div className="field">
  <label>Link (optional)</label>
  <input type="text" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." />
  </div>
  </div>
    <div className="field" style={{ marginBottom: 12 }}>
      <label>Details</label>
    <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Add details, or ask a question for others to answer" />
    </div>
  <div className="field" style={{ marginBottom: 12 }}>
  <label>Photo (optional)</label>
  <input type="file" accept="image/*" onChange={handleImageChange} />
    {imagePreview && (
    <img src={imagePreview} alt="Preview" style={{ marginTop: 8, maxWidth: 160, borderRadius: 8, display: 'block' }} />
    )}
  </div>
  <button className="btn btn-primary" disabled={saving || !title.trim()} type="submit">Post</button>
    {message && <span className="help-text" style={{ marginLeft: 12 }}>{message}</span>}
  </form>
  </div>
  
  <div>
    {filtered.length === 0 && <p className="help-text">No posts yet in {activeLabel}. Be the first to share one!</p>}
    {filtered.map((p) => (
    <div key={p.id} className="card" style={{ maxWidth: 640, marginBottom: 14 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
    <h3 style={{ fontSize: 18, marginBottom: 4 }}>{p.title}</h3>
      {p.user_id === user.id && (
      <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => remove(p.id)}>Delete</button>
    )}
    </div>
      {p.image_url && (
      <img src={p.image_url} alt={p.title} style={{ maxWidth: '100%', borderRadius: 8, marginBottom: 8 }} />
      )}
      {p.body && <p style={{ marginBottom: 8 }}>{p.body}</p>}
      {p.link && <p style={{ marginBottom: 8 }}><a href={p.link} target="_blank" rel="noreferrer">{p.link}</a></p>}
    <p className="help-text">{p.author_name} · {new Date(p.created_at).toLocaleDateString()}</p>
    </div>
    ))}
  </div>
  </main>
  )
    }
