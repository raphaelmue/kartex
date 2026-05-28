import { describe, it, expect } from 'vitest'
import { parseKartex } from '@kartex/shared'

describe('parseKartex', () => {
  const VALID_KARTEX = `---
deck: Test Deck
author: Test Author
tags: [physics, math]
---
:: card
front: What is 1+1?
back: 2
tags: [arithmetic]
::
:: card
front: What is $E = mc^2$?
back: Mass-energy equivalence
::
`

  const NO_HEADER_KARTEX = `:: card
front: No header here
back: Should fail
::`

  const MALFORMED_YAML_KARTEX = `---
deck: [invalid yaml: {{{
---
:: card
front: A
back: B
::`

  const MISSING_BACK_KARTEX = `---
deck: Test Deck
---
:: card
front: Card without back
::
:: card
front: Valid card
back: Valid back
::`

  const TAGS_KARTEX = `---
deck: Tag Test
---
:: card
front: Tagged card
back: Has tags
tags: [alpha, beta, gamma]
::`

  const DECK_TAGS_KARTEX = `---
deck: Tagged Deck
author: Jane
tags: [physics, thermo]
---
:: card
front: Q
back: A
::`

  const COMMENT_KARTEX = `# This is a comment
---
deck: Comment Test
---
# Another comment
:: card
front: Visible
back: Content
::`

  const MEDIA_KARTEX = `---
deck: Media Test
---
:: card
front: "![carnot diagram](media://carnot.png)"
back: "Adiabatic expansion"
::`

  const MATH_KARTEX = `---
deck: Math Test
---
:: card
front: "$E = mc^2$"
back: "$$\\Delta U = Q + W$$"
::`

  const TYPST_KARTEX = `---
deck: Typst Test
---
:: card
front: "#typst\\n$ eta = 1 - T_\\"cold\\" / T_\\"hot\\" $"
back: "Efficiency formula"
::`

  it('happy path: returns deck header, cards, and empty warnings for valid input', () => {
    const result = parseKartex(VALID_KARTEX)
    if ('fatal' in result) throw new Error('Expected parse success')
    expect(result.deck.deck).toBe('Test Deck')
    expect(result.deck.author).toBe('Test Author')
    expect(result.deck.tags).toEqual(['physics', 'math'])
    expect(result.cards).toHaveLength(2)
    expect(result.warnings).toHaveLength(0)
  })

  it('fatal error — no header: returns fatal: true when no --- block present', () => {
    const result = parseKartex(NO_HEADER_KARTEX)
    if (!('fatal' in result)) throw new Error('Expected fatal error')
    expect(result.fatal).toBe(true)
    expect(result.message).toContain('No deck header found')
  })

  it('fatal error — malformed YAML: returns fatal: true when header YAML is invalid', () => {
    const result = parseKartex(MALFORMED_YAML_KARTEX)
    if (!('fatal' in result)) throw new Error('Expected fatal error')
    expect(result.fatal).toBe(true)
  })

  it('lenient parsing — missing back: skips malformed card and adds warning, keeps valid cards', () => {
    const result = parseKartex(MISSING_BACK_KARTEX)
    if ('fatal' in result) throw new Error('Expected parse success')
    expect(result.cards).toHaveLength(1)
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0].cardIndex).toBe(1)
    expect(result.warnings[0].reason).toBeTruthy()
  })

  it('tags in card block: parses tags list correctly into ParsedCard.tags', () => {
    const result = parseKartex(TAGS_KARTEX)
    if ('fatal' in result) throw new Error('Expected parse success')
    expect(result.cards[0].tags).toEqual(['alpha', 'beta', 'gamma'])
  })

  it('deck header tags: parses deck-level tags and author correctly', () => {
    const result = parseKartex(DECK_TAGS_KARTEX)
    if ('fatal' in result) throw new Error('Expected parse success')
    expect(result.deck.tags).toEqual(['physics', 'thermo'])
    expect(result.deck.author).toBe('Jane')
  })

  it('comments ignored: lines starting with # are ignored by the parser', () => {
    const result = parseKartex(COMMENT_KARTEX)
    if ('fatal' in result) throw new Error('Expected parse success')
    expect(result.deck.deck).toBe('Comment Test')
    expect(result.cards).toHaveLength(1)
  })

  it('media references: media:// URLs are passed through verbatim in card content', () => {
    const result = parseKartex(MEDIA_KARTEX)
    if ('fatal' in result) throw new Error('Expected parse success')
    expect(result.cards[0].front).toContain('media://carnot.png')
  })

  it('math content: $...$ and $$...$$ are passed through verbatim in card content', () => {
    const result = parseKartex(MATH_KARTEX)
    if ('fatal' in result) throw new Error('Expected parse success')
    expect(result.cards[0].front).toContain('$E = mc^2$')
    expect(result.cards[0].back).toContain('$$')
  })

  it('#typst blocks: #typst marker is passed through verbatim in card content', () => {
    const result = parseKartex(TYPST_KARTEX)
    if ('fatal' in result) throw new Error('Expected parse success')
    expect(result.cards[0].front).toContain('#typst')
  })
})
