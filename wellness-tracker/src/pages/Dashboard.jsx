import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { currentMonth, monthLabel, daysElapsedInMonth } from '../lib/dateUtils'

const TYPE_LABEL = { steps: 'Steps', weight: 'Weight loss', water: 'Water', nutrition: 'Nutrition' }
const TRAIL_MILESTONE_MILES = 500 // fun collective company goal, tweak as you like
const TOTAL_EMPLOYEES = 40

export default function Dashboard() {
  const { user, profile, refreshProfile } = useAuth()
  const month = currentMonth()
  const [loading, setLoading] = useState(true)
  const [enrollments, setEnrollments] = useState([])
  const [logs, setLogs] = useState([])
  const [prizeCount, setPrizeCount] = useState(0)
  const [profiles, setProfiles] = useState([])
  const [showEnroll, setShowEnroll] = useState(false)

const loadAll = async () => {
  const { data: enr } = await supabase.from('enrollments').select('*').eq('month', month)
  const { data: lg } = await supabase.from('daily_logs').select('*').gte('log_date', `${month}-01`)
  const { count } = await supabase.from('prizes').select('*', { count: 'exact', head: true }).eq('month', month)
  const { data: pf } = await supabase.from('profiles').select('id, full_name, enrolled_at')
  setEnrollments(enr || [])
  setLogs(lg || [])
  setPrizeCount(count || 0)
  setProfiles(pf || [])
  setLoading(false)
}

useEffect(() => { loadAll() }, [])

if (loading) return <main className="content"><p>Loading…</p></main>

const participantIds = new Set(enrollments.map((e) => e.user_id))
  const totalSteps = logs.filter((l) => l.challenge_type === 'steps').reduce((sum, l) => sum + Number(l.value), 0)
  const trailMiles = Math.round(totalSteps / 2000)
  const trailPct = Math.min(100, Math.round((trailMiles / TRAIL_MILESTONE_MILES) * 100))

const byType = ['steps', 'weight', 'water', 'nutrition'].map((type) => {
  const typeEnrollments = enrollments.filter((e) => e.challenge_type === type)
  const typeLogs = logs.filter((l) => l.challenge_type === type)
  let qualifying = 0
  typeEnrollments.forEach((e) => {
    if (type === 'weight') {
      if (e.ending_weight != null && e.starting_weight != null && e.ending_weight < e.starting_weight) qualifying++
    } else {
      const mine = typeLogs.filter((l) => l.user_id === e.user_id)
      const hit = mine.filter((l) => l.goal_met).length
      if (mine.length && hit / mine.length > 0.9) qualifying++
    }
  })
  return { type, enrolled: typeEnrollments.length, qualifying }
})

const daysSoFar = daysElapsedInMonth(month)
  const totalLoggedDays = logs.length
  const avgLogsPerParticipant = participantIds.size ? (totalLoggedDays / participantIds.size).toFixed(1) : '0'

const enrolledCount = profiles.filter((p) => p.enrolled_at).length
  const enrolledPct = Math.min(100, Math.round((enrolledCount / TOTAL_EMPLOYEES) * 100))
  const isEnrolled = Boolean(profile?.enrolled_at)

const handleEnrolled = async () => {
  setShowEnroll(false)
  if (refreshProfile) await refreshProfile()
  loadAll()
}

return (
  <main className="content">
  <div className="eyebrow">{monthLabel(month)} · company wellness</div>
  <h1 style={{ fontSize: 34, marginBottom: 22 }}>Forbes AAC Wellness</h1>

<div className="card" style={{ marginBottom: 26 }}>
<div className="eyebrow" style={{ marginBottom: 10 }}>How the wellness initiative works</div>
<ul style={{ margin: '0 0 16px', paddingLeft: 20, fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.6 }}>
<li>The initiative runs through the end of 2026.</li>
<li>Starting at the end of August 2026, we'll draw one prize winner from each challenge at the end of every month.</li>
  <li>Hit your goal on more than 90% of the days in the month for a challenge to be entered into that month's drawing.</li>
  <li>Steps challenge participants need their own fitness tracker or step monitor, and log their steps at the end of every day.</li>
<li>New here? Fill out the quick enrollment form below, then head to Challenges to pick your challenge(s).</li>
</ul>
{isEnrolled ? (
  <span className="badge badge-on">You're enrolled ✓</span>
  ) : (
    <button className="btn btn-primary" onClick={() => setShowEnroll(true)}>Enroll Now!</button>
)}
</div>

<div className="trail-card" style={{ marginBottom: 26 }}>
<div className="eyebrow">The company trail</div>
<h2 style={{ marginBottom: 6 }}>{trailMiles.toLocaleString()} miles logged together</h2>
<p style={{ opacity: 0.85, marginBottom: 18, fontSize: 14 }}>
Every step everyone logs this month adds to the trail. Milestone: {TRAIL_MILESTONE_MILES} miles.
  </p>
<TrailSvg pct={trailPct} />
</div>

<div className="grid-2" style={{ marginBottom: 18 }}>
<StatCard label="Active participants" value={enrolledCount} />
<StatCard label="% of employees enrolled" value={`${enrolledPct}%`} />
</div>

<div className="grid-3" style={{ marginBottom: 26 }}>
<StatCard label="Total challenge entries" value={enrollments.length} />
<StatCard label="Avg. logs per person" value={avgLogsPerParticipant} />
<StatCard label="Prizes on the table" value={prizeCount} />
</div>

<div className="card">
<h3 style={{ fontSize: 18, marginBottom: 14 }}>Challenge breakdown — {monthLabel(month)}</h3>
<table>
<thead>
<tr><th>Challenge</th><th>Enrolled</th><th>On track for the drawing</th><th>Qualifying rate</th></tr>
</thead>
<tbody>
{byType.map((row) => (
  <tr key={row.type}>
  <td>{TYPE_LABEL[row.type]}</td>
<td>{row.enrolled}</td>
<td>{row.qualifying}</td>
<td>{row.enrolled ? Math.round((row.qualifying / row.enrolled) * 100) : 0}%</td>
</tr>
))}
</tbody>
</table>
<p className="help-text" style={{ marginTop: 12 }}>
"Qualifying" means hitting your daily goal on more than 90% of the {daysSoFar} day(s) so far this month (or, for the weight challenge, an ending weight lower than your starting weight).
  </p>
</div>

{showEnroll && (
  <EnrollModal
  userId={user?.id}
defaultName={profile?.full_name || ''}
onClose={() => setShowEnroll(false)}
onEnrolled={handleEnrolled}
/>
)}
</main>
)
}

function StatCard({ label, value }) {
  return (
    <div className="card">
    <div className="stat-number">{value}</div>
  <div className="stat-label">{label}</div>
  </div>
  )
}

function EnrollModal({ userId, defaultName, onClose, onEnrolled }) {
  const [name, setName] = useState(defaultName)
  const [goal, setGoal] = useState('')
  const [tracker, setTracker] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

const submit = async (e) => {
  e.preventDefault()
  setSaving(true)
  setError('')
  const { error: err } = await supabase
  .from('profiles')
  .update({ full_name: name, big_goal: goal, fitness_tracker: tracker, enrolled_at: new Date().toISOString() })
  .eq('id', userId)
  setSaving(false)
  if (err) setError(err.message)
  else onEnrolled()
}

return (
  <div className="modal-overlay" onClick={onClose}>
  <div className="card modal-card" onClick={(e) => e.stopPropagation()}>
<h3 style={{ fontSize: 20, marginBottom: 6 }}>Enroll in the wellness initiative</h3>
<p className="help-text" style={{ marginBottom: 16 }}>
Tell us a bit about yourself, then head to Challenges to pick your challenge(s).
  </p>
<form onSubmit={submit}>
<div className="field">
<label>Your name</label>
<input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
</div>
<div className="field">
<label>Your big goal in joining</label>
<textarea rows={3} value={goal} onChange={(e) => setGoal(e.target.value)} required />
</div>
<div className="field">
<label>Fitness tracker / monitor you purchased</label>
<input type="text" value={tracker} onChange={(e) => setTracker(e.target.value)} placeholder="e.g. Fitbit Charge 6" />
</div>
{error && <p className="error-text">{error}</p>}
<div style={{ display: 'flex', gap: 10 }}>
<button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Complete enrollment'}</button>
<button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
</div>
</form>
</div>
</div>
)
}

function TrailSvg({ pct }) {
  const width = 1000
  const markerX = 40 + (pct / 100) * (width - 80)
  return (
    <svg viewBox={`0 0 ${width} 120`} width="100%" height="90" style={{ display: 'block' }}>
<path
d={`M40,80 C 200,20 350,110 500,60 S 800,20 ${width - 40},70`}
fill="none"
stroke="rgba(251,248,239,0.25)"
strokeWidth="10"
strokeLinecap="round"
/>
{[0, 25, 50, 75, 100].map((cp) => {
  const x = 40 + (cp / 100) * (width - 80)
  return <circle key={cp} cx={x} cy="70" r="5" fill="rgba(251,248,239,0.5)" />
})}
<circle cx={markerX} cy="70" r="9" fill="#A6CE39" stroke="#14588F" strokeWidth="3" />
<text x={markerX} y="105" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="13" fill="#A6CE39">
{pct}%
</text>
</svg>
)
}
