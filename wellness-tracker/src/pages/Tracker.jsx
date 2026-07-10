import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { currentMonth, todayISO } from '../lib/dateUtils'

const LABELS = {
  steps: { label: 'Steps', unit: 'steps' },
  water: { label: 'Water', unit: 'oz' },
  nutrition: { label: 'Calories', unit: 'cal' },
}

export default function Tracker() {
  const { user } = useAuth()
  const month = currentMonth()
  const today = todayISO()
  const [enrollments, setEnrollments] = useState([])
  const [values, setValues] = useState({})
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const load = async () => {
    setLoading(true)
    const { data: enr } = await supabase
      .from('enrollments')
      .select('*')
      .eq('user_id', user.id)
      .eq('month', month)
      .in('challenge_type', ['steps', 'water', 'nutrition'])

    const { data: todays } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('log_date', today)

    const { data: hist } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('log_date', `${month}-01`)
      .order('log_date', { ascending: false })
      .limit(31)

    setEnrollments(enr || [])
    const v = {}
    ;(todays || []).forEach((row) => { v[row.challenge_type] = row.value })
    setValues(v)
    setHistory(hist || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const targetFor = (e) => (e.challenge_type === 'steps' ? e.steps_target : e.daily_target)

  const save = async (challenge_type, target) => {
    const value = Number(values[challenge_type])
    if (!value && value !== 0) return
    setMessage('')
    const { error } = await supabase.from('daily_logs').upsert(
      {
        user_id: user.id,
        challenge_type,
        log_date: today,
        value,
        goal_met: value >= target,
      },
      { onConflict: 'user_id,challenge_type,log_date' }
    )
    if (error) setMessage(error.message)
    else {
      setMessage(`${LABELS[challenge_type].label} logged for today ✓`)
      load()
    }
  }

  if (loading) return <main className="content"><p>Loading…</p></main>

  return (
    <main className="content">
      <div className="eyebrow">{today}</div>
      <h1 style={{ fontSize: 32, marginBottom: 22 }}>Today's tracker</h1>

      {enrollments.length === 0 && (
        <div className="card">
          <p>You're not enrolled in any daily challenges yet.</p>
          <a href="/challenges" className="btn btn-primary" style={{ marginTop: 12, textDecoration: 'none' }}>Pick a challenge</a>
        </div>
      )}

      <div className="grid-3" style={{ marginBottom: 26 }}>
        {enrollments.map((e) => {
          const target = targetFor(e)
          const value = values[e.challenge_type] ?? ''
          const met = value !== '' && Number(value) >= target
          return (
            <div className="card" key={e.id}>
              <div className="eyebrow">{LABELS[e.challenge_type].label}</div>
              <p className="help-text" style={{ marginBottom: 10 }}>Goal: {target.toLocaleString()} {LABELS[e.challenge_type].unit}/day</p>
              <input
                type="number"
                value={value}
                onChange={(ev) => setValues((prev) => ({ ...prev, [e.challenge_type]: ev.target.value }))}
                placeholder={`Today's ${LABELS[e.challenge_type].label.toLowerCase()}`}
              />
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                <button className="btn btn-primary" onClick={() => save(e.challenge_type, target)}>Log it</button>
                {value !== '' && <span className={`badge ${met ? 'badge-on' : 'badge-off'}`}>{met ? 'Goal met' : 'Under goal'}</span>}
              </div>
            </div>
          )
        })}
      </div>

      {message && <p className="help-text" style={{ marginBottom: 20 }}>{message}</p>}

      <div className="card">
        <h3 style={{ fontSize: 18, marginBottom: 14 }}>This month's history</h3>
        <table>
          <thead>
            <tr><th>Date</th><th>Challenge</th><th>Value</th><th>Goal met</th></tr>
          </thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.id}>
                <td>{h.log_date}</td>
                <td>{LABELS[h.challenge_type]?.label}</td>
                <td>{h.value.toLocaleString()}</td>
                <td><span className={`badge ${h.goal_met ? 'badge-on' : 'badge-off'}`}>{h.goal_met ? 'Yes' : 'No'}</span></td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr><td colSpan={4} className="help-text">No entries logged yet this month.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  )
}
