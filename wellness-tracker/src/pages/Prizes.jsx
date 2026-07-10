import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { currentMonth, monthLabel } from '../lib/dateUtils'

export default function Prizes() {
  const { user, profile } = useAuth()
  const month = currentMonth()
  const [prizes, setPrizes] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ title: '', description: '', image_url: '' })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('prizes').select('*').eq('month', month).order('created_at')
    setPrizes(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const addPrize = async (e) => {
    e.preventDefault()
    if (!form.title) return
    setSaving(true)
    await supabase.from('prizes').insert({ ...form, month, created_by: user.id })
    setForm({ title: '', description: '', image_url: '' })
    setSaving(false)
    load()
  }

  const removePrize = async (id) => {
    await supabase.from('prizes').delete().eq('id', id)
    load()
  }

  if (loading) return <main className="content"><p>Loading…</p></main>

  return (
    <main className="content">
      <div className="eyebrow">{monthLabel(month)}</div>
      <h1 style={{ fontSize: 32, marginBottom: 6 }}>What you're playing for</h1>
      <p className="help-text" style={{ marginBottom: 22 }}>
        Hit your goal on more than 90% of days this month (or lose weight, for the weight challenge) and you're entered into the drawing for one of these.
      </p>

      <div className="grid-3" style={{ marginBottom: 30 }}>
        {prizes.map((p) => (
          <div className="card" key={p.id}>
            {p.image_url && <img src={p.image_url} alt={p.title} style={{ width: '100%', borderRadius: 10, marginBottom: 12, aspectRatio: '4/3', objectFit: 'cover' }} />}
            <h3 style={{ fontSize: 18, marginBottom: 6 }}>{p.title}</h3>
            <p className="help-text">{p.description}</p>
            {profile?.is_admin && (
              <button className="btn btn-danger" style={{ marginTop: 12 }} onClick={() => removePrize(p.id)}>Remove</button>
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
              <label>Image URL (optional)</label>
              <input type="text" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://…" />
            </div>
            <button className="btn btn-primary" disabled={saving}>Add prize</button>
          </form>
        </div>
      )}
    </main>
  )
}
