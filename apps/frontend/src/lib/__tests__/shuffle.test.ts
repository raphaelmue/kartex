import { describe, it, expect, vi, afterEach } from 'vitest'
import { shuffle } from '../shuffle'

describe('shuffle utility', () => {
  // STUDY-05a: set-equality — no cards lost or duplicated
  it('STUDY-05a: returns array with same elements (set-equality)', () => {
    const input = [1, 2, 3, 4, 5]
    const result = shuffle(input)
    expect(result.length).toBe(input.length)
    expect([...result].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5])
  })

  // STUDY-05b: non-mutation — input array is unchanged
  it('STUDY-05b: does not mutate the input array', () => {
    const input = [10, 20, 30, 40, 50]
    const originalIds = [...input]
    shuffle(input)
    expect(input).toEqual(originalIds)
  })

  // STUDY-05c: empty array
  it('STUDY-05c: returns empty array for empty input', () => {
    expect(shuffle([])).toEqual([])
  })

  // STUDY-05d: single element
  it('STUDY-05d: returns single-element array unchanged', () => {
    expect(shuffle(['x'])).toEqual(['x'])
  })

  // STUDY-05e: cross-deck interleaving — statistical proof
  it('STUDY-05e: produces cross-deck interleaving in >95% of 1000 shuffles', () => {
    function makeCards(deckId: string, count: number): Array<{ id: string; deckId: string }> {
      return Array.from({ length: count }, (_, i) => ({ id: `${deckId}-${i}`, deckId }))
    }

    const cards = [
      ...makeCards('deck-A', 10),
      ...makeCards('deck-B', 10),
      ...makeCards('deck-C', 10),
    ]

    let mixedCount = 0
    const RUNS = 1000

    for (let run = 0; run < RUNS; run++) {
      const shuffled = shuffle(cards)
      // Count transitions: how many times deckId changes between consecutive cards
      let transitions = 0
      for (let i = 1; i < shuffled.length; i++) {
        if (shuffled[i].deckId !== shuffled[i - 1].deckId) {
          transitions++
        }
      }
      // A fully deck-grouped output has exactly 2 transitions (A→B, B→C in any permutation)
      // Interleaved output has at least 4 transitions
      if (transitions >= 4) {
        mixedCount++
      }
    }

    expect(mixedCount).toBeGreaterThan(950)
  })

  // STUDY-05f: deterministic with seeded Math.random — mock returning 0 means j always = 0*i = 0
  // When Math.random returns 0: j = Math.floor(0 * (i+1)) = 0
  // swap(out[i], out[0]) for i from length-1 down to 1
  // For [3,1,2]: i=2 swap(out[2], out[0]) => [2,1,3], i=1 swap(out[1], out[0]) => [1,2,3]
  it('STUDY-05f: behaves deterministically when Math.random is mocked to return 0', () => {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0)
    try {
      // When j=0 always: each element swaps toward front
      // [3,1,2] with j=0: i=2 → swap idx2 and idx0 → [2,1,3], i=1 → swap idx1 and idx0 → [1,2,3]
      const result = shuffle([3, 1, 2])
      expect(result).toEqual([1, 2, 3])
    } finally {
      spy.mockRestore()
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })
})
