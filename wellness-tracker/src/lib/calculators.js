// ---------------------------------------------------------------
// Native calculators, built in-house instead of embedding the two
// external sites (most sites block iframing anyway via X-Frame-Options,
// and keeping people in-app is a better experience).
// ---------------------------------------------------------------

/**
 * Daily water intake calculator.
 * Rebuilt from the published logic flowchart for the linked calculator
 * (weight-based baseline + activity level + climate adjustment).
 * Children under 14 get the fixed pediatric amounts from that same chart;
 * everyone in this workplace tool will realistically be an adult, but the
 * bands are included for completeness/accuracy.
 */
export function calculateWaterIntakeOz({ age, gender, weightLbs, activityLevel, climate }) {
  if (age < 1) return { ounces: 6, note: 'Infant guidance (4–8 oz) — consult a pediatrician.' }
  if (age < 4) return { ounces: 32, note: 'Toddler guidance (~32 oz).' }
  if (age < 9) return { ounces: 40, note: 'Child guidance (~40 oz).' }
  if (age < 14) return { ounces: 60, note: 'Pre-teen guidance (56–64 oz).' }

  const base = gender === 'male' ? weightLbs * 0.67 : weightLbs * 0.5

  const activityBonus = {
    sedentary: 0,
    light: 6,
    moderate: 12,
    high: 24,
    extreme: 32,
  }[activityLevel] ?? 0

  const climateBonus = climate === 'tropical' ? 12 : 0

  const ounces = Math.round(base + activityBonus + climateBonus)
  return { ounces, note: null }
}

export const ACTIVITY_LEVEL_OPTIONS = [
  { value: 'sedentary', label: 'Sedentary (little or no exercise)' },
  { value: 'light', label: 'Light (exercise 1–3x/week)' },
  { value: 'moderate', label: 'Moderate (exercise 3–5x/week)' },
  { value: 'high', label: 'High (exercise 6–7x/week)' },
  { value: 'extreme', label: 'Extreme (very heavy training or physical job)' },
]

export const CLIMATE_OPTIONS = [
  { value: 'temperate', label: 'Temperate' },
  { value: 'cold', label: 'Cold' },
  { value: 'tropical', label: 'Tropical / hot & humid' },
]

/**
 * Basal Metabolic Rate + daily calorie target, using the
 * Mifflin–St Jeor equation — the standard formula behind most
 * modern BMR/TDEE calculators (including hospital wellness pages).
 */
export function calculateCalorieTarget({ age, gender, heightCm, weightKg, activityMultiplier, goal }) {
  const bmr =
    gender === 'male'
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161

  const tdee = bmr * activityMultiplier

  const goalAdjustment = {
    lose: -500,
    maintain: 0,
    gain: 500,
  }[goal] ?? 0

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    target: Math.round(tdee + goalAdjustment),
  }
}

export const TDEE_ACTIVITY_OPTIONS = [
  { value: 1.2, label: 'Sedentary (desk job, little exercise)' },
  { value: 1.375, label: 'Lightly active (light exercise 1–3x/week)' },
  { value: 1.55, label: 'Moderately active (moderate exercise 3–5x/week)' },
  { value: 1.725, label: 'Very active (hard exercise 6–7x/week)' },
  { value: 1.9, label: 'Extremely active (physical job or 2x/day training)' },
]

export const lbsToKg = (lbs) => lbs * 0.453592
export const ftInToCm = (ft, inches) => (ft * 12 + Number(inches || 0)) * 2.54

export const STEP_LEVELS = [8000, 10000, 12000, 20000]
