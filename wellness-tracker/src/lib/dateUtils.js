export const currentMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const daysElapsedInMonth = (monthStr) => {
  const [y, m] = monthStr.split('-').map(Number)
  const now = new Date()
  const isCurrentMonth = now.getFullYear() === y && now.getMonth() + 1 === m
  if (isCurrentMonth) return now.getDate()
  return new Date(y, m, 0).getDate() // days in that month if it's a past month
}

export const monthLabel = (monthStr) => {
  const [y, m] = monthStr.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

// Returns the current month plus the `count - 1` months before it, newest first.
export const recentMonths = (count = 12) => {
  const d = new Date()
  return Array.from({ length: count }, (_, i) => {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1)
    return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`
  })
}

// 'YYYY-MM-DD' (or 'YYYY-MM') -> 'YYYY-MM'
export const monthOf = (dateStr) => dateStr.slice(0, 7)

// First day of the month after `monthStr`, as 'YYYY-MM-DD'.
export const nextMonthStart = (monthStr) => {
  const [y, m] = monthStr.split('-').map(Number)
  const d = new Date(y, m, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
