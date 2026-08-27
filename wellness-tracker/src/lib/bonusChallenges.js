// "Mind & Spirit" challenges — trackable like the other challenges, but
// intentionally excluded from the prize drawing (see schema.sql: the
// winners table and monthly_qualification view are scoped to the
// original 5 challenge types only).
export const BONUS_CHALLENGES = [
  {
    key: 'recovery_break',
    title: '60-Second Recovery Challenge',
    cadence: '5 days / week',
    description: 'Take one real break between meetings each day — stand, stretch, breathe, or pray.',
  },
  {
    key: 'morning_ritual',
    title: 'Morning Ritual Challenge',
    cadence: null,
    description: 'Wake 5–10 minutes earlier for a phone-free start: sunlight, quiet reflection/prayer, or gratitude journaling before your workday.',
  },
  {
    key: 'phone_free_lunch',
    title: 'Phone-Free Lunch Challenge',
    cadence: '5 days / week',
    description: 'Eat without a screen for 5 days.',
  },
]

export const BONUS_CHALLENGE_KEYS = BONUS_CHALLENGES.map((c) => c.key)
