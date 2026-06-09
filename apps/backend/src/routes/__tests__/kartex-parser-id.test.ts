import { describe, it, expect } from 'vitest'
import { parseKartex } from '@kartex/shared'

function makeSource(cardBlock: string): string {
  return `---\ndeck: Test Deck\n---\n\n${cardBlock}`
}

describe('kartex-parser — optional id: field (IMP-07)', () => {
  it('Test 1: parses id: field and exposes the value on cards[0].id', () => {
    const source = makeSource(
      `:: card\nid: foo-123\nfront: Question?\nback: Answer.\n::`
    )
    const result = parseKartex(source)
    if ('fatal' in result) throw new Error(`Fatal parse error: ${result.message}`)
    expect(result.cards).toHaveLength(1)
    expect(result.cards[0].id).toBe('foo-123')
  })

  it('Test 2: backward compat — card without id: field parses successfully with id === undefined', () => {
    const source = makeSource(
      `:: card\nfront: Question?\nback: Answer.\n::`
    )
    const result = parseKartex(source)
    if ('fatal' in result) throw new Error(`Fatal parse error: ${result.message}`)
    expect(result.cards).toHaveLength(1)
    expect(result.cards[0].id).toBeUndefined()
  })

  it('Test 3: duplicate id values within the same file are tolerated by the parser (uniqueness is Phase 16 concern)', () => {
    const source = makeSource(
      `:: card\nid: dup\nfront: First question?\nback: First answer.\n::\n\n:: card\nid: dup\nfront: Second question?\nback: Second answer.\n::`
    )
    const result = parseKartex(source)
    if ('fatal' in result) throw new Error(`Fatal parse error: ${result.message}`)
    expect(result.cards).toHaveLength(2)
    expect(result.cards[0].id).toBe('dup')
    expect(result.cards[1].id).toBe('dup')
  })

  it('Test 4: card with all four fields (id, front, back, tags) parses correctly regardless of field order', () => {
    const source = makeSource(
      `:: card\ntags: [math, physics]\nid: card-abc-123\nback: The answer is 42.\nfront: What is the ultimate answer?\n::`
    )
    const result = parseKartex(source)
    if ('fatal' in result) throw new Error(`Fatal parse error: ${result.message}`)
    expect(result.cards).toHaveLength(1)
    expect(result.cards[0].id).toBe('card-abc-123')
    expect(result.cards[0].front).toBeTruthy()
    expect(result.cards[0].back).toBeTruthy()
    expect(result.cards[0].tags).toEqual(['math', 'physics'])
  })

  it('Test 5: empty id: (no value after colon) results in id === undefined (D-03 min-length-1)', () => {
    const source = makeSource(
      `:: card\nid:\nfront: Question?\nback: Answer.\n::`
    )
    const result = parseKartex(source)
    if ('fatal' in result) throw new Error(`Fatal parse error: ${result.message}`)
    expect(result.cards).toHaveLength(1)
    expect(result.cards[0].id).toBeUndefined()
  })
})
