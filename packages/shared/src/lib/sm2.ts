// SM-2 Spaced Repetition Algorithm
// Source: design.md §9 + https://github.com/cnnrhill/sm-2
// Rating key mapping (UI button → SM-2 quality score):
//   Button "Again (1)" → quality 0  (did not recall)
//   Button "Hard (2)"  → quality 3  (recalled with effort)
//   Button "Good (3)"  → quality 4  (recalled confidently)
//   Button "Easy (4)"  → quality 5  (recalled instantly)

export type SM2Quality = 0 | 3 | 4 | 5

export interface SM2Input {
  quality: SM2Quality
  repetitions: number   // CardProgress.repetitions (default 0)
  easeFactor: number    // CardProgress.easeFactor  (default 2.5)
  interval: number      // CardProgress.interval    (default 1)
}

export interface SM2Output {
  repetitions: number
  easeFactor: number
  interval: number
  nextReview: Date
}

export const RATING_TO_QUALITY: Record<1 | 2 | 3 | 4, SM2Quality> = {
  1: 0,  // Again
  2: 3,  // Hard
  3: 4,  // Good
  4: 5,  // Easy
}

export function calculateSM2(input: SM2Input): SM2Output {
  const { quality, repetitions, easeFactor, interval } = input

  // Step 1: adjust ease factor (EF floor: 1.3)
  const newEF = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  )

  // Step 2: compute interval and repetitions
  let newInterval: number
  let newRepetitions: number

  if (quality < 3) {
    // "Again" — reset BOTH interval and repetitions (Pitfall 1: must reset both)
    newInterval = 1
    newRepetitions = 0
  } else {
    if (repetitions === 0) {
      newInterval = 1
    } else if (repetitions === 1) {
      newInterval = 6
    } else {
      newInterval = Math.ceil(interval * easeFactor)
    }
    newRepetitions = repetitions + 1
  }

  // Step 3: nextReview = start of day (midnight) newInterval days from now
  const nextReview = new Date()
  nextReview.setDate(nextReview.getDate() + newInterval)
  nextReview.setHours(0, 0, 0, 0)

  return { repetitions: newRepetitions, easeFactor: newEF, interval: newInterval, nextReview }
}

// Streak utility — exported here for testability from frontend runner
// Input: array of 'YYYY-MM-DD' date strings (deduplicated review days)
// Returns: count of consecutive calendar days ending today or yesterday
export function calculateStreak(reviewDates: string[], today?: Date): number {
  if (reviewDates.length === 0) return 0

  const refDate = today ?? new Date()
  const toDateStr = (d: Date) => d.toISOString().slice(0, 10)
  const dateSet = new Set(reviewDates)

  const todayStr = toDateStr(refDate)
  const yesterday = new Date(refDate)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = toDateStr(yesterday)

  // Start walk from today if studied today, else from yesterday if studied yesterday
  let startStr: string | null = null
  if (dateSet.has(todayStr)) {
    startStr = todayStr
  } else if (dateSet.has(yesterdayStr)) {
    startStr = yesterdayStr
  } else {
    return 0
  }

  let streak = 0
  const cursor = new Date(startStr)
  while (dateSet.has(toDateStr(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}
