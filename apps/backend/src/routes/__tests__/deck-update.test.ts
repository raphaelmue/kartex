import { describe, it } from 'vitest'

describe('POST /api/decks/:id/update/preview — deck update preview (T-16-01..T-16-05)', () => {
  it.todo('T-16-01: 403 when caller is not deck owner')
  it.todo('T-16-02: 404 when deckId does not exist')
  it.todo('T-16-03: 422 when file is not a .kartex file')
  it.todo('T-16-04: returns correct added/updated/unchanged/removed counts')
  it.todo('T-16-05: cards without kartexId in file → counted as added')
})

describe('POST /api/decks/:id/update/apply — deck update apply (T-16-06..T-16-12)', () => {
  it.todo('T-16-06: 403 when caller is not deck owner')
  it.todo('T-16-07: creates new cards for added bucket')
  it.todo("T-16-08: updates front/back/tags for matched cards; CardProgress untouched")
  it.todo('T-16-09: keepRemoved=true — absent deck cards remain')
  it.todo('T-16-10: keepRemoved=false — absent deck cards deleted')
  it.todo('T-16-11: transaction is atomic — if update fails, no partial changes')
  it.todo("T-16-12: userId is taken from JWT (c.get('userId')), never from request body")
})
