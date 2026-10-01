import { supabase } from './supabaseClient'

// Enrollments are stored per month. The first time someone opens the app in a
// new month with no enrollments yet, copy their most recent month's challenges
// (and goals) forward so they don't have to re-enroll every month.
//
// Weight: last month's ending weight becomes this month's starting weight, and
// the ending weight is cleared — otherwise last month's loss would count again.

const inFlight = new Map()

const markerKey = (userId, month) => `enrollments-carried:${userId}:${month}`

const alreadyCarried = (userId, month) => {
  try {
    return window.localStorage.getItem(markerKey(userId, month)) === '1'
  } catch {
    return false
  }
}

const markCarried = (userId, month) => {
  try {
    window.localStorage.setItem(markerKey(userId, month), '1')
  } catch {
    // storage unavailable — the "has any enrollments" check still prevents duplicates
  }
}

const run = async (userId, month) => {
  // Don't re-add challenges someone deliberately left earlier this month.
  if (alreadyCarried(userId, month)) return

  const { data: existing, error: existingError } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', userId)
    .eq('month', month)
    .limit(1)
  if (existingError) return
  if (existing?.length) {
    markCarried(userId, month)
    return
  }

  const { data: latest } = await supabase
    .from('enrollments')
    .select('month')
    .eq('user_id', userId)
    .lt('month', month)
    .order('month', { ascending: false })
    .limit(1)
  const prevMonth = latest?.[0]?.month
  if (!prevMonth) return

  const { data: prev } = await supabase
    .from('enrollments')
    .select('*')
    .eq('user_id', userId)
    .eq('month', prevMonth)
  if (!prev?.length) return

  const rows = prev.map((e) => ({
    user_id: userId,
    month,
    challenge_type: e.challenge_type,
    steps_target: e.steps_target,
    daily_target: e.daily_target,
    days_target: e.days_target,
    starting_weight: e.challenge_type === 'weight' ? (e.ending_weight ?? e.starting_weight) : null,
    ending_weight: null,
  }))

  const { error } = await supabase
    .from('enrollments')
    .upsert(rows, { onConflict: 'user_id,challenge_type,month', ignoreDuplicates: true })
  if (!error) markCarried(userId, month)
}

export const carryForwardEnrollments = (userId, month) => {
  if (!userId) return Promise.resolve()
  const key = `${userId}:${month}`
  if (!inFlight.has(key)) {
    inFlight.set(key, run(userId, month).catch(() => {}))
  }
  return inFlight.get(key)
}
