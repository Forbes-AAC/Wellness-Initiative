import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { currentMonth, monthLabel } from '../lib/dateUtils'
import {
  calculateWaterIntakeOz,
  calculateCalorieTarget,
  ACTIVITY_LEVEL_OPTIONS,
  CLIMATE_OPTIONS,
  TDEE_ACTIVITY_OPTIONS,
  lbsToKg,
  ftInToCm,
  STEP_LEVELS,
} from '../lib/calculators'

const TYPES = [
  { key: 'steps', label: 'Steps challenge' },
  { key: 'weight', label: 'Weight loss challenge' },
  { key: 'water', label: 'Water challenge' },
  { key: 'nutrition', label: 'Nutrition challenge' },
]

export default function Challenges() {
  const { user } = useAuth()
  const month = currentMonth()
  const [active, setActive] = useState('steps')
  const [enrollments, setEnrollments] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('enrollments').select('*').eq('user_id', user.id).eq('month', month)
    const byType = {}
    ;(data || []).forEach((row) => { byType[row.challenge_type] = row })
    setEnrollments(byType)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const upsert = async (challenge_type, fields) => {
    setSaving(true)
    setMessage('')
    const { error } = await supabase
      .from('enrollments')
      .upsert({ user_id: user.id, month, challenge_type, ...fields }, { onConflict: 'user_id,challenge_type,month' })
    setSaving(false)
    if (error) setMessage(error.message)
    else {
      setMessage('Saved!')
      load()
    }
  }

  const leave = async (challenge_type) => {
    setSaving(true)
    await supabase.from('enrollments').delete().eq('user_id', user.id).eq('challenge_type', challenge_type).eq('month', month)
    setSaving(false)
    load()
  }

  if (loading) return <main className="content"><p>Loading…</p></main>

  return (
    <main className="content">
      <div className="eyebrow">{monthLabel(month)}</div>
      <h1 style={{ fontSize: 32, marginBottom: 22 }}>Choose your challenges</h1>

      <div className="tabs">
        {TYPES.map((t) => (
          <button key={t.key} className={`tab ${active === t.key ? 'active' : ''}`} onClick={() => setActive(t.key)}>
            {t.label} {enrollments[t.key] && '✓'}
          </button>
        ))}
      </div>

      {message && <p className="help-text" style={{ marginBottom: 14 }}>{message}</p>}

      {active === 'steps' && (
        <StepsPanel enrollment={enrollments.steps} onSave={(v) => upsert('steps', { steps_target: v })} onLeave={() => leave('steps')} saving={saving} />
      )}
      {active === 'weight' && (
        <WeightPanel enrollment={enrollments.weight} onSave={upsert} onLeave={() => leave('weight')} saving={saving} />
      )}
      {active === 'water' && (
        <WaterPanel enrollment={enrollments.water} onSave={(v) => upsert('water', { daily_target: v })} onLeave={() => leave('water')} saving={saving} />
      )}
      {active === 'nutrition' && (
        <NutritionPanel enrollment={enrollments.nutrition} onSave={(v) => upsert('nutrition', { daily_target: v })} onLeave={() => leave('nutrition')} saving={saving} />
      )}
    </main>
  )
}

function StepsPanel({ enrollment, onSave, onLeave, saving }) {
  const [level, setLevel] = useState(enrollment?.steps_target || 8000)
  return (
    <div className="card" style={{ maxWidth: 640 }}>
      <h3 style={{ fontSize: 20, marginBottom: 6 }}>Pick your daily step target</h3>
      <p className="help-text" style={{ marginBottom: 16 }}>
        Just getting started? 8,000 is a great line in the sand. Already active most days? Push yourself with 20,000.
      </p>
      <div className="grid-4" style={{ marginBottom: 18 }}>
        {STEP_LEVELS.map((lvl) => (
          <label key={lvl} className="card" style={{ padding: 14, cursor: 'pointer', textAlign: 'center', border: level === lvl ? '2px solid var(--pine)' : undefined }}>
            <input type="radio" name="steps" checked={level === lvl} onChange={() => setLevel(lvl)} style={{ display: 'none' }} />
            <div className="stat-number" style={{ fontSize: 22 }}>{lvl.toLocaleString()}</div>
            <div className="stat-label">steps / day</div>
          </label>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-primary" disabled={saving} onClick={() => onSave(level)}>
          {enrollment ? 'Update target' : 'Enroll this month'}
        </button>
        {enrollment && <button className="btn btn-danger" disabled={saving} onClick={onLeave}>Leave challenge</button>}
      </div>
    </div>
  )
}

function WeightPanel({ enrollment, onSave, onLeave, saving }) {
  const [starting, setStarting] = useState(enrollment?.starting_weight || '')
  const [ending, setEnding] = useState(enrollment?.ending_weight || '')
  return (
    <div className="card" style={{ maxWidth: 640 }}>
      <h3 style={{ fontSize: 20, marginBottom: 6 }}>Monthly weight loss challenge</h3>
      <p className="help-text" style={{ marginBottom: 16 }}>
        Log your weight at the start of the month, then update it again at month's end. Anyone who shows a loss qualifies for the drawing.
      </p>
      <div className="form-grid" style={{ maxWidth: 420 }}>
        <div className="field">
          <label>Starting weight (lbs)</label>
          <input type="number" value={starting} onChange={(e) => setStarting(e.target.value)} />
        </div>
        <div className="field">
          <label>Current / ending weight (lbs)</label>
          <input type="number" value={ending} onChange={(e) => setEnding(e.target.value)} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          className="btn btn-primary"
          disabled={saving || !starting}
          onClick={() => onSave('weight', { starting_weight: Number(starting), ending_weight: ending ? Number(ending) : null })}
        >
          {enrollment ? 'Update weights' : 'Enroll this month'}
        </button>
        {enrollment && <button className="btn btn-danger" disabled={saving} onClick={onLeave}>Leave challenge</button>}
      </div>
    </div>
  )
}

function WaterPanel({ enrollment, onSave, onLeave, saving }) {
  const [showCalc, setShowCalc] = useState(!enrollment)
  const [age, setAge] = useState(30)
  const [gender, setGender] = useState('female')
  const [weight, setWeight] = useState(150)
  const [activity, setActivity] = useState('light')
  const [climate, setClimate] = useState('temperate')
  const [target, setTarget] = useState(enrollment?.daily_target || '')

  const runCalc = () => {
    const { ounces } = calculateWaterIntakeOz({ age: Number(age), gender, weightLbs: Number(weight), activityLevel: activity, climate })
    setTarget(ounces)
  }

  return (
    <div className="card" style={{ maxWidth: 640 }}>
      <h3 style={{ fontSize: 20, marginBottom: 6 }}>Water challenge</h3>
      <p className="help-text" style={{ marginBottom: 16 }}>Set your recommended daily ounces, then log your intake each day on the Tracker page.</p>

      {showCalc && (
        <div className="card" style={{ background: 'var(--paper)', marginBottom: 18 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Recommended intake calculator</div>
          <div className="form-grid">
            <div className="field"><label>Age</label><input type="number" value={age} onChange={(e) => setAge(e.target.value)} /></div>
            <div className="field">
              <label>Gender</label>
              <select value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </div>
            <div className="field"><label>Weight (lbs)</label><input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} /></div>
            <div className="field">
              <label>Activity level</label>
              <select value={activity} onChange={(e) => setActivity(e.target.value)}>
                {ACTIVITY_LEVEL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Climate</label>
              <select value={climate} onChange={(e) => setClimate(e.target.value)}>
                {CLIMATE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <button type="button" className="btn btn-outline" onClick={runCalc}>Calculate my target</button>
        </div>
      )}

      <div className="field" style={{ maxWidth: 240 }}>
        <label>Daily target (oz)</label>
        <input type="number" value={target} onChange={(e) => setTarget(e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-primary" disabled={saving || !target} onClick={() => onSave(Number(target))}>
          {enrollment ? 'Update target' : 'Enroll this month'}
        </button>
        <button type="button" className="btn btn-outline" onClick={() => setShowCalc((s) => !s)}>{showCalc ? 'Hide calculator' : 'Recalculate'}</button>
        {enrollment && <button className="btn btn-danger" disabled={saving} onClick={onLeave}>Leave challenge</button>}
      </div>
    </div>
  )
}

function NutritionPanel({ enrollment, onSave, onLeave, saving }) {
  const [showCalc, setShowCalc] = useState(!enrollment)
  const [age, setAge] = useState(30)
  const [gender, setGender] = useState('female')
  const [weightLbs, setWeightLbs] = useState(150)
  const [heightFt, setHeightFt] = useState(5)
  const [heightIn, setHeightIn] = useState(6)
  const [activityMultiplier, setActivityMultiplier] = useState(1.375)
  const [goal, setGoal] = useState('maintain')
  const [target, setTarget] = useState(enrollment?.daily_target || '')

  const runCalc = () => {
    const { target: t } = calculateCalorieTarget({
      age: Number(age),
      gender,
      heightCm: ftInToCm(heightFt, heightIn),
      weightKg: lbsToKg(Number(weightLbs)),
      activityMultiplier: Number(activityMultiplier),
      goal,
    })
    setTarget(t)
  }

  return (
    <div className="card" style={{ maxWidth: 680 }}>
      <h3 style={{ fontSize: 20, marginBottom: 6 }}>Nutrition challenge</h3>
      <p className="help-text" style={{ marginBottom: 16 }}>Set a daily calorie goal, then log what you actually ate each day on the Tracker page.</p>

      {showCalc && (
        <div className="card" style={{ background: 'var(--paper)', marginBottom: 18 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Calorie target calculator (Mifflin–St Jeor)</div>
          <div className="form-grid">
            <div className="field"><label>Age</label><input type="number" value={age} onChange={(e) => setAge(e.target.value)} /></div>
            <div className="field">
              <label>Gender</label>
              <select value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </div>
            <div className="field"><label>Weight (lbs)</label><input type="number" value={weightLbs} onChange={(e) => setWeightLbs(e.target.value)} /></div>
            <div className="field">
              <label>Height</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="number" value={heightFt} onChange={(e) => setHeightFt(e.target.value)} placeholder="ft" />
                <input type="number" value={heightIn} onChange={(e) => setHeightIn(e.target.value)} placeholder="in" />
              </div>
            </div>
            <div className="field">
              <label>Activity level</label>
              <select value={activityMultiplier} onChange={(e) => setActivityMultiplier(e.target.value)}>
                {TDEE_ACTIVITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Goal</label>
              <select value={goal} onChange={(e) => setGoal(e.target.value)}>
                <option value="lose">Lose weight (-500 cal/day)</option>
                <option value="maintain">Maintain weight</option>
                <option value="gain">Gain weight (+500 cal/day)</option>
              </select>
            </div>
          </div>
          <button type="button" className="btn btn-outline" onClick={runCalc}>Calculate my target</button>
          <p className="help-text" style={{ marginTop: 10 }}>This is a general estimate, not medical advice — check with a doctor or dietitian for personalized guidance.</p>
        </div>
      )}

      <div className="field" style={{ maxWidth: 240 }}>
        <label>Daily calorie target</label>
        <input type="number" value={target} onChange={(e) => setTarget(e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-primary" disabled={saving || !target} onClick={() => onSave(Number(target))}>
          {enrollment ? 'Update target' : 'Enroll this month'}
        </button>
        <button type="button" className="btn btn-outline" onClick={() => setShowCalc((s) => !s)}>{showCalc ? 'Hide calculator' : 'Recalculate'}</button>
        {enrollment && <button className="btn btn-danger" disabled={saving} onClick={onLeave}>Leave challenge</button>}
      </div>
    </div>
  )
}
