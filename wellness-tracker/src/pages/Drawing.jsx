import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { currentMonth, monthLabel } from '../lib/dateUtils'

const CHALLENGE_TYPES = ['steps', 'weight', 'water', 'nutrition', 'workout']
const TYPE_LABEL = { steps: 'Steps', weight: 'Weight loss', water: 'Water', nutrition: 'Nutrition', workout: 'Workout' }

export default function Drawing() {
  const { user, profile } = useAuth()
  const month = currentMonth()
  const [loading, setLoading] = useState(true)
  const [qualified, setQualified] = useState([])
  const [winners, setWinners] = useState([])
  const [profiles, setProfiles] = useState([])
  const [drawingType, setDrawingType] = useState(null)
  const [message, setMessage] = useState('')

  const load = async () => {
    setLoading(true)
    const { data: q } = await supabase
      .from('monthly_qualification')
      .select('*')
      .eq('month', month)
      .eq('qualifies_for_drawing', true)
    const { data: w } = await supabase
      .from('winners')
      .select('*')
      .order('drawn_at', { ascending: false })
    const { data: pf } = await supabase.from('profiles').select('id, full_name')
    setQualified(q || [])
    setWinners(w || [])
    setProfiles(pf || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  if (!profile?.is_admin) {
    return (
      <main className="content">
        <h1 style={{ fontSize: 32 }}>Prize drawing</h1>
        <p className="help-text">This page is for admins only.</p>
      </main>
    )
  }

  if (loading) return <main className="content"><p>Loading…</p></main>

  const nameFor = (userId) => profiles.find((p) => p.id === userId)?.full_name || 'Unknown'

  const pastWinnerIds = (type) =>
    new Set(winners.filter((w) => w.challenge_type === type).map((w) => w.user_id))

  const eligibleFor = (type) => {
    const alreadyWon = pastWinnerIds(type)
    return qualified.filter((q) => q.challenge_type === type && !alreadyWon.has(q.user_id))
  }

  const winnerThisMonth = (type) => winners.find((w) => w.challenge_type === type && w.month === month)

  const drawWinner = async (type) => {
    setMessage('')
    const pool = eligibleFor(type)
    if (!pool.length) return
    setDrawingType(type)
    const pick = pool[Math.floor(Math.random() * pool.length)]
    const { error } = await supabase.from('winners').insert({
      user_id: pick.user_id,
      challenge_type: type,
      month,
      drawn_by: user.id,
    })
    setDrawingType(null)
    if (error) {
      setMessage(error.message)
    } else {
      load()
    }
  }

  const clearWinner = async (winnerRow) => {
    const ok = window.confirm(`Clear ${nameFor(winnerRow.user_id)} so you can redraw for ${TYPE_LABEL[winnerRow.challenge_type]}?`)
    if (!ok) return
    await supabase.from('winners').delete().eq('id', winnerRow.id)
    load()
  }

  return (
    <main className="content">
      <div className="eyebrow">{monthLabel(month)}</div>
      <h1 style={{ fontSize: 34, marginBottom: 6 }}>Prize drawing</h1>
      <p className="help-text" style={{ marginBottom: 22 }}>
        Eligible participants qualified by hitting their goal on more than 90% of days this month (or losing weight, for the weight challenge). Each person can only win a given challenge once, ever.
      </p>

      {message && <p className="error-text">{message}</p>}

      <div className="grid-3" style={{ marginBottom: 34 }}>
        {CHALLENGE_TYPES.map((type) => {
          const pool = eligibleFor(type)
          const winner = winnerThisMonth(type)
          return (
            <div className="card" key={type}>
              <h3 style={{ fontSize: 18, marginBottom: 8 }}>{TYPE_LABEL[type]}</h3>
              <p className="help-text" style={{ marginBottom: 12 }}>
                {pool.length} eligible participant{pool.length === 1 ? '' : 's'} this month
              </p>

              {winner ? (
                <>
                  <p style={{ marginBottom: 10 }}>
                    Winner: <strong>{nameFor(winner.user_id)}</strong>
                  </p>
                  <button className="btn btn-outline" onClick={() => clearWinner(winner)}>
                    Clear &amp; redraw
                  </button>
                </>
              ) : (
                <button
                  className="btn btn-primary"
                  disabled={!pool.length || drawingType === type}
                  onClick={() => drawWinner(type)}
                >
                  {drawingType === type ? 'Drawing…' : pool.length ? 'Draw a winner' : 'No eligible participants'}
                </button>
              )}
            </div>
          )
        })}
      </div>

      <h2 style={{ fontSize: 22, marginBottom: 12 }}>Winner history</h2>
      {winners.length === 0 && <p className="help-text">No winners have been drawn yet.</p>}
      {winners.length > 0 && (
        <div className="card" style={{ maxWidth: 620 }}>
          {winners.map((w) => (
            <div
              key={w.id}
              style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}
            >
              <span>{monthLabel(w.month)} — {TYPE_LABEL[w.challenge_type]}</span>
              <strong>{nameFor(w.user_id)}</strong>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
