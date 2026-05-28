import { describe, it, expect } from 'vitest'
import { calculateSM2, calculateStreak } from '@kartex/shared'

describe('calculateSM2', () => {
  const defaults = { repetitions: 0, easeFactor: 2.5, interval: 1 }

  it('Again (quality=0) resets interval to 1 and repetitions to 0', () => {
    const result = calculateSM2({ quality: 0, repetitions: 3, easeFactor: 2.5, interval: 15 })
    expect(result.interval).toBe(1)
    expect(result.repetitions).toBe(0)
  })

  it('Again (quality=0) still adjusts easeFactor downward', () => {
    const result = calculateSM2({ quality: 0, ...defaults })
    expect(result.easeFactor).toBeLessThan(2.5)
  })

  it('easeFactor never falls below 1.3', () => {
    let state = { ...defaults }
    for (let i = 0; i < 20; i++) {
      const out = calculateSM2({ quality: 0, ...state })
      state = { repetitions: out.repetitions, easeFactor: out.easeFactor, interval: out.interval }
    }
    expect(state.easeFactor).toBeGreaterThanOrEqual(1.3)
  })

  it('first review (repetitions=0) with quality>=3 gives interval=1', () => {
    const result = calculateSM2({ quality: 4, ...defaults })
    expect(result.interval).toBe(1)
    expect(result.repetitions).toBe(1)
  })

  it('second review (repetitions=1) with quality>=3 gives interval=6', () => {
    const result = calculateSM2({ quality: 4, repetitions: 1, easeFactor: 2.5, interval: 1 })
    expect(result.interval).toBe(6)
    expect(result.repetitions).toBe(2)
  })

  it('third review uses ceil(interval * easeFactor)', () => {
    const result = calculateSM2({ quality: 4, repetitions: 2, easeFactor: 2.5, interval: 6 })
    expect(result.interval).toBe(Math.ceil(6 * 2.5))
  })

  it('Easy (quality=5) increases easeFactor above 2.5', () => {
    const result = calculateSM2({ quality: 5, repetitions: 2, easeFactor: 2.5, interval: 6 })
    expect(result.easeFactor).toBeGreaterThan(2.5)
  })

  it('nextReview is in the future (at least 1 day from now)', () => {
    const result = calculateSM2({ quality: 4, ...defaults })
    expect(result.nextReview.getTime()).toBeGreaterThan(Date.now())
  })
})

describe('calculateStreak', () => {
  const today = new Date('2026-05-28')

  it('returns 0 for empty array', () => {
    expect(calculateStreak([], today)).toBe(0)
  })

  it('returns 1 when only today has a review', () => {
    expect(calculateStreak(['2026-05-28'], today)).toBe(1)
  })

  it('returns 1 when only yesterday has a review (streak still active)', () => {
    expect(calculateStreak(['2026-05-27'], today)).toBe(1)
  })

  it('returns 0 when last review was 2 days ago (gap)', () => {
    expect(calculateStreak(['2026-05-26'], today)).toBe(0)
  })

  it('counts consecutive days ending today', () => {
    expect(calculateStreak(['2026-05-26', '2026-05-27', '2026-05-28'], today)).toBe(3)
  })

  it('breaks streak on a gap', () => {
    expect(calculateStreak(['2026-05-25', '2026-05-26', '2026-05-28'], today)).toBe(1)
  })
})
