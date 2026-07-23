import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { currentMonth, todayISO } from '../lib/dateUtils'

const LABELS = {
  steps: { label: 'Steps', unit: 'steps' },
  water: { label: 'Water', unit: 'oz' },
  nutrition: { label: 'Calories', unit: 'cal' },
  workout: { label: 'Workout', unit: 'min' },
}

const WORKOUT_TYPES = ['HIIT', 'Cross Training', 'Cardio', 'Strength Training', 'Recreational Sports', 'Home Workout', 'Other']

export default function Tracker() {
  const { user } = useAuth()
  const month = currentMonth()
  const today = todayISO()
  const [logDate, setLogDate] = useState(today)
  const [enrollments, setEnrollments] = useState([])
  const [values, setValues] = useState({})
  const [photos, setPhotos] = useState({})
  const [existingPhotos, setExistingPhotos] = useState({})
  const [workoutTypes, setWorkoutTypes] = useState({})
  const [workoutTypeOther, setWorkoutTypeOther] = useState({})
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const load = async (dateForValues) => {
    setLoading(true)
    const { data: enr } = await supabase
      .from('enrollments')
      .select('*')
      .eq('user_id', user.id)
      .eq('month', month)
      .in('challenge_type', ['steps', 'water', 'nutrition', 'workout'])

    const { data: dayRows } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('log_date', dateForValues)

    const { data: hist } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('log_date', `${month}-01`)
      .order('log_date', { ascending: false })
      .limit(31)

    setEnrollments(enr || [])
    const v = {}
    const p = {}
    const wt = {}
    const wtOther = {}
    ;(dayRows || []).forEach((row) => {
      v[row.challenge_type] = row.value
      p[row.challenge_type] = row.photo_url || null
      if (row.challenge_type === 'workout' && row.workout_type) {
        if (WORKOUT_TYPES.includes(row.workout_type)) {
          wt[row.challenge_type] = row.workout_type
        } else {
          wt[row.challenge_type] = 'Other'
          wtOther[row.challenge_type] = row.workout_type
        }
      }
    })
    setValues(v)
    setExistingPhotos(p)
    setPhotos({})
    setWorkoutTypes(wt)
    setWorkoutTypeOther(wtOther)
    setHistory(hist || [])
    setLoading(false)
  }

  useEffect(() => { load(logDate) }, [logDate])

  const targetFor = (e) => (e.challenge_type === 'steps' ? e.steps_target : e.challenge_type === 'workout' ? 45 : e.daily_target)

  const handlePhotoChange = (challenge_type, file) => {
    setPhotos((prev) => ({ ...prev, [challenge_type]: file }))
  }

  const handleEdit = (date) => {
    setLogDate(date)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const save = async (challenge_type, target) => {
    const value = Number(values[challenge_type])
    if (!value && value !== 0) return
    setMessage('')

    if (challenge_type === 'steps' && !photos.steps && !existingPhotos.steps) {
      setMessage('Please attach a photo of your step tracker before logging your steps.')
      return
    }

    if (challenge_type === 'workout' && !workoutTypes.workout) {
      setMessage('Please select the type of workout before logging it.')
      return
    }

    if (challenge_type === 'workout' && workoutTypes.workout === 'Other' && !(workoutTypeOther.workout || '').trim()) {
      setMessage('Please type what workout you did.')
      return
    }

    let photo_url = existingPhotos[challenge_type] || null
    const file = photos[challenge_type]
    if (file) {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${logDate}-${challenge_type}-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('step-photos').upload(path, file, { upsert: true })
      if (uploadError) {
        setMessage(uploadError.message)
        return
      }
      const { data: publicData } = supabase.storage.from('step-photos').getPublicUrl(path)
      photo_url = publicData.publicUrl
    }

    const workout_type = challenge_type === 'workout'
      ? (workoutTypes.workout === 'Other' ? workoutTypeOther.workout.trim() : workoutTypes.workout)
      : null

    const { error } = await supabase.from('daily_logs').upsert(
      {
        user_id: user.id,
        challenge_type,
        log_date: logDate,
        value,
        goal_met: value >= target,
        photo_url,
        workout_type,
      },
      { onConflict: 'user_id,challenge_type,log_date' }
    )
    if (error) setMessage(error.message)
    else {
      setMessage(`${LABELS[challenge_type].label} logged for ${logDate} ✓`)
      load(logDate)
    }
  }

  if (loading) return <main className="content"><p>Loading…</p></main>

  return (
    <main className="content">
      <div className="eyebrow">Log an entry</div>
      <h1 style={{ fontSize: 32, marginBottom: 10 }}>Daily tracker</h1>
      <div className="card" style={{ marginBottom: 22, maxWidth: 320 }}>
        <label htmlFor="logDate" className="help-text" style={{ display: 'block', marginBottom: 6 }}>Which day are you logging?</label>
        <input
          id="logDate"
          type="date"
          value={logDate}
          max={today}
          onChange={(ev) => setLogDate(ev.target.value)}
        />
        <p className="help-text" style={{ marginTop: 8 }}>You can log today or catch up on any past day.</p>
      </div>

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
                placeholder={`${LABELS[e.challenge_type].label} for this day`}
              />
              {e.challenge_type === 'steps' && (
                <div style={{ marginTop: 10 }}>
                  <label className="help-text" style={{ display: 'block', marginBottom: 6 }}>Upload a photo of your step tracker</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(ev) => handlePhotoChange('steps', ev.target.files[0])}
                  />
                  {!photos.steps && existingPhotos.steps && (
                    <p className="help-text" style={{ marginTop: 6 }}>Photo already attached for this day ✓</p>
                  )}
                </div>
              )}
              {e.challenge_type === 'workout' && (
                <div style={{ marginTop: 10 }}>
                  <label className="help-text" style={{ display: 'block', marginBottom: 6 }}>Type of workout</label>
                  <select
                    value={workoutTypes.workout || ''}
                    onChange={(ev) => setWorkoutTypes((prev) => ({ ...prev, workout: ev.target.value }))}
                  >
                    <option value="">Select a type…</option>
                    {WORKOUT_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  {workoutTypes.workout === 'Other' && (
                    <input
                      type="text"
                      style={{ marginTop: 8, display: 'block' }}
                      value={workoutTypeOther.workout || ''}
                      onChange={(ev) => setWorkoutTypeOther((prev) => ({ ...prev, workout: ev.target.value }))}
                      placeholder="What did you do?"
                    />
                  )}
                  <label className="help-text" style={{ display: 'block', marginTop: 10, marginBottom: 6 }}>Upload a photo from your tracker (optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(ev) => handlePhotoChange('workout', ev.target.files[0])}
                  />
                  {!photos.workout && existingPhotos.workout && (
                    <p className="help-text" style={{ marginTop: 6 }}>Photo already attached for this day ✓</p>
                  )}
                </div>
              )}
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
            <tr><th>Date</th><th>Challenge</th><th>Value</th><th>Goal met</th><th>Photo</th><th>Edit</th></tr>
          </thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.id}>
                <td>{h.log_date}</td>
                <td>{LABELS[h.challenge_type]?.label}</td>
                <td>{h.value.toLocaleString()}</td>
                <td><span className={`badge ${h.goal_met ? 'badge-on' : 'badge-off'}`}>{h.goal_met ? 'Yes' : 'No'}</span></td>
                <td>{h.photo_url ? <a href={h.photo_url} target="_blank" rel="noreferrer">View</a> : '—'}</td>
                <td><button className="btn btn-outline" style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => handleEdit(h.log_date)}>Edit</button></td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr><td colSpan={6} className="help-text">No entries logged yet this month.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  )
}
