import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { currentMonth } from '../lib/dateUtils'
import Avatar from '../components/Avatar'

const TYPE_LABEL = { steps: 'Steps', weight: 'Weight loss', water: 'Water', nutrition: 'Nutrition', workout: 'Workout' }

export default function Participants() {
  const [loading, setLoading] = useState(true)
  const [profiles, setProfiles] = useState([])
  const [enrollments, setEnrollments] = useState([])

  useEffect(() => {
    const load = async () => {
      const month = currentMonth()
      const { data: pf } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, big_goal, enrolled_at')
        .not('enrolled_at', 'is', null)
        .order('full_name')
      const { data: enr } = await supabase.from('enrollments').select('user_id, challenge_type').eq('month', month)
      setProfiles(pf || [])
      setEnrollments(enr || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <main className="content"><p>Loading…</p></main>

  const challengesFor = (userId) =>
    enrollments.filter((e) => e.user_id === userId).map((e) => TYPE_LABEL[e.challenge_type] || e.challenge_type)

  return (
    <main className="content">
      <div className="eyebrow">Company wellness</div>
      <h1 style={{ fontSize: 34, marginBottom: 22 }}>Active participants</h1>

      {profiles.length === 0 && <p className="help-text">No one has enrolled yet.</p>}

      <div className="grid-3">
        {profiles.map((p) => {
          const challenges = challengesFor(p.id)
          return (
            <div className="card" key={p.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <Avatar name={p.full_name} url={p.avatar_url} size={48} />
                <h3 style={{ fontSize: 18 }}>{p.full_name}</h3>
              </div>
              {p.big_goal && (
                <p style={{ fontSize: 14, marginBottom: 10 }}>
                  <strong>Goal:</strong> {p.big_goal}
                </p>
              )}
              <div style={{ fontSize: 14 }}>
                <strong>Challenges:</strong>{' '}
                {challenges.length ? challenges.join(', ') : 'None this month'}
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}
