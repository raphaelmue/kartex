// Streak tests are co-located in sm2.test.ts (calculateStreak is exported from @kartex/shared alongside calculateSM2)
// This file satisfies the Wave 0 file reference in VALIDATION.md — no additional tests needed here.
import { calculateStreak } from '@kartex/shared'

describe('calculateStreak (re-export check)', () => {
  it('is importable from @kartex/shared', () => {
    expect(typeof calculateStreak).toBe('function')
  })
})
