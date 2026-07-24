import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { currentMonth, monthLabel, daysElapsedInMonth } from '../lib/dateUtils'
import { MONTHLY_THEMES } from '../lib/monthlyThemes'
import ShoutOuts from '../components/ShoutOuts'
import { useNavigate } from 'react-router-dom'
import Avatar from '../components/Avatar'

const TYPE_LABEL = { steps: 'Steps', weight: 'Weight loss', water: 'Water', nutrition: 'Nutrition', workout: 'Workout' }
const TRAIL_MILESTONE_MILES = 500 // fun collective company goal, tweak as you like
const TOTAL_EMPLOYEES = 40
const TRAIL_MILESTONES = [
  { miles: 100, sub: 'milestone' },
  { miles: 250, sub: 'halfway' },
  { miles: 400, sub: 'milestone' },
  { miles: TRAIL_MILESTONE_MILES, sub: 'goal 🏁' },
]

function greetingWord() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
}

export default function Dashboard() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const month = currentMonth()
  const [loading, setLoading] = useState(true)
  const [enrollments, setEnrollments] = useState([])
  const [logs, setLogs] = useState([])
  const [prizeCount, setPrizeCount] = useState(0)
  const [profiles, setProfiles] = useState([])
  const [shoutOuts, setShoutOuts] = useState([])
  const [showEnroll, setShowEnroll] = useState(false)

  const loadAll = async () => {
    const { data: enr } = await supabase.from('enrollments').select('*').eq('month', month)
    const { data: lg } = await supabase.from('daily_logs').select('*').gte('log_date', `${month}-01`)
    const { count } = await supabase.from('prizes').select('*', { count: 'exact', head: true }).eq('month', month)
    const { data: pf } = await supabase.from('profiles').select('id, full_name, enrolled_at')
    const { data: so } = await supabase.from('shout_outs').select('*').order('created_at', { ascending: false }).limit(20)
    setEnrollments(enr || [])
    setLogs(lg || [])
    setPrizeCount(count || 0)
    setProfiles(pf || [])
    setShoutOuts(so || [])
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  if (loading) return <main className="content"><p>Loading…</p></main>

  const participantIds = new Set(enrollments.map((e) => e.user_id))
  const totalSteps = logs.filter((l) => l.challenge_type === 'steps').reduce((sum, l) => sum + Number(l.value), 0)
  const trailMiles = Math.round(totalSteps / 2000)
  const trailPct = Math.min(100, Math.round((trailMiles / TRAIL_MILESTONE_MILES) * 100))
  const milesRemaining = Math.max(0, TRAIL_MILESTONE_MILES - trailMiles)
  const nextMilestone = TRAIL_MILESTONES.find((m) => trailMiles < m.miles)?.miles || TRAIL_MILESTONE_MILES

  const byType = ['steps', 'weight', 'water', 'nutrition', 'workout'].map((type) => {
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
  const firstName = profile?.full_name?.split(' ')[0] || 'there'

  const monthNum = Number(month.split('-')[1])
  const theme = MONTHLY_THEMES[monthNum]

  const handleEnrolled = async () => {
    setShowEnroll(false)
    if (refreshProfile) await refreshProfile()
    loadAll()
  }

  const statCards = [
    {
      value: enrolledCount,
      label: 'Active participants',
      chip: 'this month',
      chipBg: '#e4f6ec',
      chipColor: '#177a4c',
      iconBg: '#e4f6ec',
      iconColor: '#177a4c',
      icon: <PeopleIcon />,
      onClick: () => navigate('/participants'),
    },
    {
      value: `${enrolledPct}%`,
      label: 'of employees enrolled',
      chip: `of ${TOTAL_EMPLOYEES} staff`,
      chipBg: '#e8f0fb',
      chipColor: '#1663b0',
      iconBg: '#e8f0fb',
      iconColor: '#1663b0',
      icon: <UptrendIcon />,
    },
    {
      value: enrollments.length,
      label: 'Total challenge entries',
      chip: 'active',
      chipBg: '#f3ecff',
      chipColor: '#7a4fd0',
      iconBg: '#f3ecff',
      iconColor: '#7a4fd0',
      icon: <TrophyIcon />,
    },
    {
      value: avgLogsPerParticipant,
      label: 'Avg. logs per person',
      chip: 'daily',
      chipBg: '#fff0e6',
      chipColor: '#c26a30',
      iconBg: '#fff0e6',
      iconColor: '#c26a30',
      icon: <BarChartIcon />,
    },
    {
      value: prizeCount,
      label: 'Prizes on the table',
      chip: '🎁',
      chipBg: '#e4f6ec',
      chipColor: '#177a4c',
      iconBg: '#e4f6ec',
      iconColor: '#177a4c',
      icon: <GiftIcon />,
      onClick: () => navigate('/prizes'),
    },
  ]

  return (
    <div className="dash-page">
      <div className="dash-wrap">
        <div className="dash-header">
          <div>
            <div className="dash-eyebrow">{monthLabel(month)} · company wellness</div>
            <h1 className="dash-greeting">Good {greetingWord()}, {firstName} 👋</h1>
            <p className="dash-subtitle">Every step you log this month moves the whole company forward. Here's where things stand today.</p>
          </div>
          {isEnrolled ? (
            <span className="dash-enrolled-badge">
              <CheckIcon /> You're enrolled
            </span>
          ) : (
            <button className="btn btn-primary" onClick={() => setShowEnroll(true)}>Enroll Now!</button>
          )}
        </div>

        <div className="dash-hero">
          <div className="dash-hero-glow" />
          <div className="dash-hero-top">
            <div>
              <div className="dash-hero-eyebrow"><LightningIcon /> The company trail</div>
              <div className="dash-hero-number-row">
                <span className="dash-hero-number">{trailMiles.toLocaleString()}</span>
                <span className="dash-hero-unit">miles</span>
                <span className="dash-hero-caption">logged together this month</span>
              </div>
              <p className="dash-hero-body">
                Every mile everyone walks, runs, or logs adds to the trail. Next milestone: <strong>{nextMilestone} miles</strong>.
              </p>
            </div>
            {milesRemaining > 0 ? (
              <div className="dash-hero-callout"><span>{milesRemaining} mi</span> to go</div>
            ) : (
              <div className="dash-hero-callout"><span>Goal reached 🎉</span></div>
            )}
          </div>

          <div className="dash-trail">
            <TrailSvg pct={trailPct} />
            <div className="dash-markers">
              <div className="dash-marker">
                <div className="dash-marker-dot is-current" />
                <div className="dash-marker-label">{trailMiles} mi</div>
                <div className="dash-marker-sub">now</div>
              </div>
              {TRAIL_MILESTONES.map((m) => (
                <div className="dash-marker" key={m.miles}>
                  <div className={`dash-marker-dot ${trailMiles >= m.miles ? 'is-reached' : ''}`} />
                  <div className="dash-marker-label">{m.miles}</div>
                  <div className="dash-marker-sub">{m.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="dash-stats">
          {statCards.map((s, i) => (
            <div
              className="dash-stat-card"
              key={s.label}
              style={{ animationDelay: `${0.02 + i * 0.04}s`, cursor: s.onClick ? 'pointer' : undefined }}
              onClick={s.onClick}
            >
              <div className="dash-stat-top">
                <div className="dash-stat-icon" style={{ background: s.iconBg, color: s.iconColor }}>{s.icon}</div>
                <span className="dash-stat-chip" style={{ background: s.chipBg, color: s.chipColor }}>{s.chip}</span>
              </div>
              <div className="dash-stat-value">{s.value}</div>
              <div className="dash-stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="dash-columns">
          <div className="dash-card">
            <div className="dash-card-header">
              <div className="dash-card-icon"><ClockIcon /></div>
              <h2 className="dash-card-title">How the wellness initiative works</h2>
            </div>
            <ul className="dash-list">
              <li><span className="dash-list-num">1</span><p>The initiative runs through the end of 2026.</p></li>
              <li><span className="dash-list-num">2</span><p>Starting at the end of August 2026, we'll draw one prize winner from each challenge at the end of every month.</p></li>
              <li><span className="dash-list-num">3</span><p>Hit your goal on more than 90% of the days in the month for a challenge to be entered into that month's drawing.</p></li>
              <li><span className="dash-list-num">4</span><p>Steps challenge participants need their own fitness tracker or step monitor, and log their steps at the end of every day.</p></li>
              <li><span className="dash-list-num">5</span><p>New here? Fill out the quick enrollment form below, then head to Challenges to pick your challenge(s).</p></li>
            </ul>
            {isEnrolled ? (
              <span className="badge badge-on">You're enrolled ✓</span>
            ) : (
              <button className="btn btn-primary" onClick={() => setShowEnroll(true)}>Enroll Now!</button>
            )}
          </div>

          {theme && (
            <div className="dash-focus">
              <div className="dash-focus-header">
                <div className="dash-focus-icon"><SunIcon /></div>
                <div className="dash-focus-eyebrow">This month's focus</div>
              </div>
              <h2 className="dash-focus-title">{theme.theme}</h2>
              <ul className="dash-focus-list">
                {theme.tips.map((tip, i) => (
                  <li key={i}>{i === 0 ? <DropletIcon /> : <SunIcon small />}<p>{tip}</p></li>
                ))}
              </ul>
              <div className="dash-focus-decoration" />
            </div>
          )}
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
        <ShoutOuts profiles={profiles} shoutOuts={shoutOuts} onChanged={loadAll} />

        {showEnroll && (
          <EnrollModal
            userId={user?.id}
            defaultName={profile?.full_name || ''}
            onClose={() => setShowEnroll(false)}
            onEnrolled={handleEnrolled}
          />
        )}
      </div>
    </div>
  )
}

function EnrollModal({ userId, defaultName, onClose, onEnrolled }) {
  const [name, setName] = useState(defaultName)
  const [goal, setGoal] = useState('')
  const [tracker, setTracker] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    let avatarUrl = null
    if (imageFile) {
      const path = `${userId}/${Date.now()}-${imageFile.name}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, imageFile)
      if (upErr) {
        setSaving(false)
        setError(upErr.message)
        return
      }
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
      avatarUrl = pub.publicUrl
    }

    const updates = { full_name: name, big_goal: goal, fitness_tracker: tracker, enrolled_at: new Date().toISOString() }
    if (avatarUrl) updates.avatar_url = avatarUrl

    const { error: err } = await supabase
      .from('profiles')
      .update(updates)
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
          <div className="field">
            <label>Profile picture (optional)</label>
            <input type="file" accept="image/*" onChange={handleImageChange} />
            {imagePreview && (
              <div style={{ marginTop: 10 }}>
                <Avatar name={name} url={imagePreview} size={56} />
              </div>
            )}
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
  const width = 1160
  const dashLen = 1200
  const offset = dashLen - (dashLen * pct) / 100
  const d = 'M10 78 C 200 40, 330 110, 490 74 S 760 30, 900 66 S 1080 96, 1150 60'
  return (
    <svg viewBox={`0 0 ${width} 120`} preserveAspectRatio="none" width="100%" height="120">
      <path d={d} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="10" strokeLinecap="round" />
      <path
        className="dash-trail-progress"
        d={d}
        fill="none"
        stroke="#8fe3ba"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={dashLen}
        strokeDashoffset={offset}
      />
    </svg>
  )
}

function PeopleIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.5 19c0-3.3 2.9-5.5 6.5-5.5S15.5 15.7 15.5 19" />
      <circle cx="17" cy="9" r="2.6" />
      <path d="M15.8 13.8c2.7.4 4.7 2.3 4.7 5.2" />
    </svg>
  )
}
function UptrendIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </svg>
  )
}
function TrophyIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" />
      <path d="M7 5H4a1 1 0 0 0-1 1c0 3 2 4 4 4" />
      <path d="M17 5h3a1 1 0 0 1 1 1c0 3-2 4-4 4" />
      <path d="M9 20h6M12 15v5" />
    </svg>
  )
}
function BarChartIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 20V10M12 20V4M20 20v-7" />
    </svg>
  )
}
function GiftIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="9" width="18" height="11" rx="1.5" />
      <path d="M3 9h18M12 9v11" />
      <path d="M12 9C10 9 8 7.8 8 6a2 2 0 0 1 4 0c0-1.8-2-3-4-3M12 9c2 0 4-1.2 4-3a2 2 0 0 0-4 0c0-1.8 2-3 4-3" />
    </svg>
  )
}
function LightningIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="#8fe3ba">
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
    </svg>
  )
}
function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#177a4c" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12.5 9 18 20 6" />
    </svg>
  )
}
function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1663b0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  )
}
function SunIcon({ small }) {
  const s = small ? 18 : 20
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="#f0932b" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </svg>
  )
}
function DropletIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f0932b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3s7 7.5 7 12a7 7 0 0 1-14 0c0-4.5 7-12 7-12Z" />
    </svg>
  )
}
