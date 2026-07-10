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
