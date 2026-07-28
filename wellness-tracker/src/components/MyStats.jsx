import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { currentMonth, monthLabel, todayISO } from '../lib/dateUtils'

const TYPE_LABEL = { steps: 'Steps', weight: 'Weight loss', water: 'Water', nutrition: 'Nutrition', workout: 'Workout' }
const CHALLENGE_TYPES = ['steps', 'weight', 'water', 'nutrition', 'workout']

const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const computeStreak = (typeLogs, today) => {
  const metDates = new Set(typeLogs.filter((l) => l.goal_met).map((l) => l.log_date))
  let streak = 0
  const d = new Date(`${today}T00:00:00`)
  if (!metDates.has(toISO(d))) {
    d.setDate(d.getDate() - 1)
  }
  while (metDates.has(toISO(d))) {
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

export default function MyStats({ userId }) {
  const month = currentMonth()
  const today = todayISO()
  const [loading, setLoading] = useState(true)
  const [enrollments, setEnrollments] = useState([])
  const [logs, setLogs] = useState([])
  const [qualified, setQualified] = useState([])

  useEffect(() => {
    if (!userId) return
    const load = async () => {
      setLoading(true)
      const { data: enr } = await supabase
        .from('enrollments')
        .select('*')
        .eq('user_id', userId)
        .eq('month', month)
      const { data: lg } = await supabase
        .from('daily_logs')
        .select('log_date, challenge_type, goal_met')
        .eq('user_id', userId)
        .gte('log_date', `${month}-01`)
      const { data: q } = await supabase
        .from('monthly_qualification')
        .select('challenge_type')
        .eq('user_id', userId)
        .eq('month', month)
        .eq('qualifies_for_drawing', true)
      setEnrollments(enr || [])
      setLogs(lg || [])
      setQualified(q || [])
      setLoading(false)
    }
    load()
  }, [userId, month])

  if (!userId) return null

  if (loading) {
    return (
      <div className="card" style={{ marginBottom: 26 }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>Your stats — {monthLabel(month)}</div>
        <p className="help-text">Loading your stats…</p>
      </div>
    )
  }

  if (!enrollments.length) {
    return (
      <div className="card" style={{ marginBottom: 26 }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>Your stats — {monthLabel(month)}</div>
        <p className="help-text">You're not enrolled in any challenges yet this month. Head to Challenges to pick one!</p>
      </div>
    )
  }

  const qualifiedTypes = new Set(qualified.map((q) => q.challenge_type))
  const myTypes = CHALLENGE_TYPES.filter((type) => enrollments.some((e) => e.challenge_type === type))

  return (
    <div className="card" style={{ marginBottom: 26 }}>
      <div className="eyebrow" style={{ marginBottom: 10 }}>Your stats — {monthLabel(month)}</div>
      <div className="grid-3">
        {myTypes.map((type) => {
          const enrollment = enrollments.find((e) => e.challenge_type === type)
          const typeLogs = logs.filter((l) => l.challenge_type === type)
          const qualifies = qualifiedTypes.has(type)
          const isWeight = type === 'weight'
          const streak = isWeight ? null : computeStreak(typeLogs, today)

          return (
            <div key={type} className="card" style={{ background: 'rgba(28,38,32,0.03)' }}>
              <h3 style={{ fontSize: 16, marginBottom: 8 }}>{TYPE_LABEL[type]}</h3>
              {isWeight ? (
                <p style={{ fontSize: 14, marginBottom: 10, color: 'var(--ink-soft)' }}>
                  {enrollment.starting_weight != null && enrollment.ending_weight != null
                    ? enrollment.ending_weight < enrollment.starting_weight
                      ? `Down ${(enrollment.starting_weight - enrollment.ending_weight).toFixed(1)} lbs so far`
                      : 'Log your ending weight to see your progress'
                    : 'Log your starting & ending weight to track progress'}
                </p>
              ) : (
                <p style={{ fontSize: 14, marginBottom: 10, color: 'var(--ink-soft)' }}>
                  🔥 {streak}-day streak
                </p>
              )}
              {qualifies ? (
                <span className="badge badge-on">On track for this month's drawing ✓</span>
              ) : (
                <span className="badge badge-off">Keep going to qualify</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
