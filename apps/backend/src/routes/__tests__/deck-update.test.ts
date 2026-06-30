import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'

// ─── Prisma mock ─────────────────────────────────────────────────────────────
// Must be hoisted before any imports that pull in ../lib/prisma.js
vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    deck: {
      findUnique: vi.fn(),
    },
    card: {
      findMany: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    media: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

// ─── parseKartex mock ─────────────────────────────────────────────────────────
vi.mock('@kartex/shared', () => ({
  parseKartex: vi.fn(),
}))

// ─── unzipper mock ───────────────────────────────────────────────────────────
vi.mock('unzipper', () => ({
  default: {
    Open: {
      buffer: vi.fn(),
    },
  },
}))

// ─── file-type mock ───────────────────────────────────────────────────────────
vi.mock('file-type', () => ({
  fileTypeFromBuffer: vi.fn(),
}))

// ─── node:fs/promises mock ───────────────────────────────────────────────────
vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn(),
  writeFile: vi.fn(),
}))

import { prisma } from '../../lib/prisma.js'
import { parseKartex } from '@kartex/shared'
import unzipper from 'unzipper'
import { fileTypeFromBuffer } from 'file-type'
import { mkdir, writeFile } from 'node:fs/promises'
import { deckUpdateRouter } from '../deckUpdate.js'

// ─── Test app factory ─────────────────────────────────────────────────────────
// The deckUpdateRouter requires c.get('userId') to be set — inject via middleware
function makeApp(userId = 'user-123') {
  const app = new Hono()
  app.use('*', (c, next) => {
    c.set('userId', userId)
    return next()
  })
  app.route('/decks', deckUpdateRouter)
  return app
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function makeFormData(fileContent: string, filename = 'test.kartex', extras?: Record<string, string>) {
  const file = new File([fileContent], filename, { type: 'text/plain' })
  const fd = new FormData()
  fd.append('file', file)
  if (extras) {
    for (const [k, v] of Object.entries(extras)) fd.append(k, v)
  }
  return fd
}

function makeZipFormData(filename = 'deck.kartex.zip') {
  const file = new File([Buffer.from('FAKE_ZIP_CONTENT')], filename, { type: 'application/zip' })
  const fd = new FormData()
  fd.append('file', file)
  return fd
}

const mockDeck = {
  id: 'deck-abc',
  ownerId: 'user-123',
  title: 'Test Deck',
}

const mockDeckCards = [
  { id: 'card-1', kartexId: 'k1', frontContent: 'Front 1', backContent: 'Back 1', tags: ['a'] },
  { id: 'card-2', kartexId: 'k2', frontContent: 'Front 2', backContent: 'Back 2', tags: [] },
]

const validParseResult = {
  deck: { deck: 'Test', author: undefined, tags: [] },
  cards: [
    { id: 'k1', front: 'Front 1 updated', back: 'Back 1', tags: ['a'] },
    { id: 'k3', front: 'New Front', back: 'New Back', tags: [] },
  ],
  warnings: [],
}

// ─── Fake unzipper directory builder ────────────────────────────────────────
// kartexText: the deck.kartex file content
// mediaFiles: array of { path, buffer } for media entries
function makeFakeDirectory(kartexText: string, mediaFiles: { path: string; buffer: Buffer }[] = []) {
  const kartexEntry = {
    path: 'deck.kartex',
    buffer: () => Promise.resolve(Buffer.from(kartexText, 'utf-8')),
  }
  const mediaEntries = mediaFiles.map((m) => ({
    path: m.path,
    buffer: () => Promise.resolve(m.buffer),
  }))
  return { files: [kartexEntry, ...mediaEntries] }
}

// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/decks/:id/update/preview — deck update preview (T-16-01..T-16-05)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    ;(prisma.deck.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockDeck)
    ;(prisma.card.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockDeckCards)
    ;(parseKartex as ReturnType<typeof vi.fn>).mockReturnValue(validParseResult)
  })

  it('T-16-01: 403 when caller is not deck owner', async () => {
    const app = makeApp('other-user')
    ;(prisma.deck.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockDeck)

    const res = await app.request('/decks/deck-abc/update/preview', {
      method: 'POST',
      body: makeFormData('dummy content'),
    })

    expect(res.status).toBe(403)
    const json = await res.json() as { error: string }
    expect(json.error).toBeTruthy()
  })

  it('T-16-02: 404 when deckId does not exist', async () => {
    ;(prisma.deck.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    const app = makeApp()

    const res = await app.request('/decks/nonexistent/update/preview', {
      method: 'POST',
      body: makeFormData('dummy content'),
    })

    expect(res.status).toBe(404)
  })

  it('T-16-03: .kartex.zip is now ACCEPTED on the preview path (not rejected)', async () => {
    // DECKU-01: zip must be accepted (the old 400 rejection guard is gone)
    const kartexText = 'KARTEX_TEXT'
    ;(unzipper.Open.buffer as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeFakeDirectory(kartexText),
    )
    ;(parseKartex as ReturnType<typeof vi.fn>).mockReturnValue(validParseResult)

    const app = makeApp()
    const res = await app.request('/decks/deck-abc/update/preview', {
      method: 'POST',
      body: makeZipFormData('deck.kartex.zip'),
    })

    // Must return 200 (accepted), not 400/422
    expect(res.status).toBe(200)
    const json = await res.json() as { added: number; updated: number; unchanged: number; removed: number }
    expect(typeof json.added).toBe('number')
  })

  it('T-16-04: returns correct added/updated/unchanged/removed counts', async () => {
    // validParseResult has: k1 matches deck (updated because front differs), k3 is new (added)
    // deck card k2 has no match in file → removed
    ;(prisma.card.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockDeckCards)
    ;(parseKartex as ReturnType<typeof vi.fn>).mockReturnValue({
      ...validParseResult,
      cards: [
        { id: 'k1', front: 'Front 1', back: 'Back 1', tags: ['a'] }, // unchanged (same content)
        { id: 'k3', front: 'New Front', back: 'New Back', tags: [] }, // added (no deck card with k3)
        // k2 not in file → removed
      ],
    })

    const app = makeApp()
    const res = await app.request('/decks/deck-abc/update/preview', {
      method: 'POST',
      body: makeFormData('file content'),
    })

    expect(res.status).toBe(200)
    const json = await res.json() as { added: number; updated: number; unchanged: number; removed: number }
    expect(json.added).toBe(1)
    expect(json.updated).toBe(0)
    expect(json.unchanged).toBe(1)
    expect(json.removed).toBe(1)
    // Response should NOT include deckId in preview (only apply includes deckId)
    expect((json as Record<string, unknown>).deckId).toBeUndefined()
  })

  it('T-16-05: cards without kartexId in file → counted as added', async () => {
    ;(parseKartex as ReturnType<typeof vi.fn>).mockReturnValue({
      ...validParseResult,
      cards: [
        { front: 'No ID front', back: 'No ID back', tags: [] }, // no id field → added
        { front: 'Also no id', back: 'Also no id back', tags: [] }, // no id → added
      ],
    })

    const app = makeApp()
    const res = await app.request('/decks/deck-abc/update/preview', {
      method: 'POST',
      body: makeFormData('file content'),
    })

    expect(res.status).toBe(200)
    const json = await res.json() as { added: number; updated: number; unchanged: number; removed: number }
    expect(json.added).toBe(2)
    expect(json.updated).toBe(0)
    expect(json.unchanged).toBe(0)
    expect(json.removed).toBe(2) // both deck cards (k1, k2) not matched
  })
})

describe('POST /api/decks/:id/update/apply — deck update apply (T-16-06..T-16-12)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    ;(prisma.deck.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockDeck)
    ;(prisma.card.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockDeckCards)
    ;(parseKartex as ReturnType<typeof vi.fn>).mockReturnValue(validParseResult)
    // $transaction executes the callback with a mock tx client
    ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          card: {
            createMany: vi.fn().mockResolvedValue({ count: 0 }),
            update: vi.fn().mockResolvedValue({}),
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
        }
        return fn(tx)
      },
    )
  })

  it('T-16-06: 403 when caller is not deck owner', async () => {
    const app = makeApp('other-user')

    const res = await app.request('/decks/deck-abc/update/apply', {
      method: 'POST',
      body: makeFormData('dummy content'),
    })

    expect(res.status).toBe(403)
    // $transaction must NOT have been called
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('T-16-07: creates new cards for added bucket', async () => {
    ;(parseKartex as ReturnType<typeof vi.fn>).mockReturnValue({
      ...validParseResult,
      cards: [
        { id: 'knew1', front: 'New Front', back: 'New Back', tags: ['x'] },
        // k1 and k2 not in file → removed (but keepRemoved defaults to true)
      ],
    })

    let capturedTx: Record<string, Record<string, ReturnType<typeof vi.fn>>> | undefined
    ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          card: {
            createMany: vi.fn().mockResolvedValue({ count: 1 }),
            update: vi.fn().mockResolvedValue({}),
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
        }
        capturedTx = tx as Record<string, Record<string, ReturnType<typeof vi.fn>>>
        return fn(tx)
      },
    )

    const app = makeApp()
    const res = await app.request('/decks/deck-abc/update/apply', {
      method: 'POST',
      body: makeFormData('file content'),
    })

    expect(res.status).toBe(200)
    // createMany should have been called with the new card
    expect(capturedTx!.card.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            deckId: 'deck-abc',
            frontContent: 'New Front',
            backContent: 'New Back',
            tags: ['x'],
            kartexId: 'knew1',
          }),
        ]),
      }),
    )
    const json = await res.json() as { added: number; deckId: string }
    expect(json.added).toBe(1)
    expect(json.deckId).toBe('deck-abc')
  })

  it('T-16-08: updates front/back/tags for matched cards; CardProgress untouched', async () => {
    ;(parseKartex as ReturnType<typeof vi.fn>).mockReturnValue({
      ...validParseResult,
      cards: [
        { id: 'k1', front: 'Updated Front', back: 'Updated Back', tags: ['b', 'c'] },
        { id: 'k2', front: 'Front 2', back: 'Back 2', tags: [] }, // unchanged
      ],
    })

    let capturedTx: Record<string, Record<string, ReturnType<typeof vi.fn>>> | undefined
    ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          card: {
            createMany: vi.fn().mockResolvedValue({ count: 0 }),
            update: vi.fn().mockResolvedValue({}),
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
        }
        capturedTx = tx as Record<string, Record<string, ReturnType<typeof vi.fn>>>
        return fn(tx)
      },
    )

    const app = makeApp()
    const res = await app.request('/decks/deck-abc/update/apply', {
      method: 'POST',
      body: makeFormData('file content'),
    })

    expect(res.status).toBe(200)
    // card.update called for the updated card (k1)
    expect(capturedTx!.card.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'card-1' },
        data: expect.objectContaining({
          frontContent: 'Updated Front',
          backContent: 'Updated Back',
          tags: ['b', 'c'],
        }),
      }),
    )
    // Verify data does NOT include CardProgress fields or kartexId
    const updateCall = capturedTx!.card.update.mock.calls[0][0] as { data: Record<string, unknown> }
    expect(updateCall.data).not.toHaveProperty('kartexId')
    expect(updateCall.data).not.toHaveProperty('easeFactor')
    expect(updateCall.data).not.toHaveProperty('interval')
    expect(updateCall.data).not.toHaveProperty('repetitions')
    expect(updateCall.data).not.toHaveProperty('nextReviewAt')
  })

  it('T-16-09: keepRemoved=true — absent deck cards remain', async () => {
    ;(parseKartex as ReturnType<typeof vi.fn>).mockReturnValue({
      ...validParseResult,
      cards: [
        // Neither k1 nor k2 in file → both would be "removed"
        { front: 'Brand new', back: 'Card', tags: [] },
      ],
    })

    let capturedTx: Record<string, Record<string, ReturnType<typeof vi.fn>>> | undefined
    ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          card: {
            createMany: vi.fn().mockResolvedValue({ count: 1 }),
            update: vi.fn().mockResolvedValue({}),
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
        }
        capturedTx = tx as Record<string, Record<string, ReturnType<typeof vi.fn>>>
        return fn(tx)
      },
    )

    const app = makeApp()
    // keepRemoved not sent (default = true → keep removed cards)
    const res = await app.request('/decks/deck-abc/update/apply', {
      method: 'POST',
      body: makeFormData('file content'),
    })

    expect(res.status).toBe(200)
    // deleteMany should NOT be called when keepRemoved=true (default)
    expect(capturedTx!.card.deleteMany).not.toHaveBeenCalled()
  })

  it('T-16-10: keepRemoved=false — absent deck cards deleted', async () => {
    ;(parseKartex as ReturnType<typeof vi.fn>).mockReturnValue({
      ...validParseResult,
      cards: [
        // k1 and k2 absent from file → removed bucket
        { front: 'Brand new', back: 'Card', tags: [] },
      ],
    })

    let capturedTx: Record<string, Record<string, ReturnType<typeof vi.fn>>> | undefined
    ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          card: {
            createMany: vi.fn().mockResolvedValue({ count: 1 }),
            update: vi.fn().mockResolvedValue({}),
            deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
          },
        }
        capturedTx = tx as Record<string, Record<string, ReturnType<typeof vi.fn>>>
        return fn(tx)
      },
    )

    const app = makeApp()
    const fd = makeFormData('file content', 'test.kartex', { keepRemoved: 'false' })
    const res = await app.request('/decks/deck-abc/update/apply', {
      method: 'POST',
      body: fd,
    })

    expect(res.status).toBe(200)
    const json = await res.json() as { removed: number }
    expect(json.removed).toBe(2)
    // deleteMany must have been called with the removed card IDs
    expect(capturedTx!.card.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: expect.objectContaining({ in: expect.arrayContaining(['card-1', 'card-2']) }),
        }),
      }),
    )
  })

  it('T-16-11: transaction is atomic — if update fails, no partial changes', async () => {
    ;(parseKartex as ReturnType<typeof vi.fn>).mockReturnValue({
      ...validParseResult,
      cards: [
        { id: 'k1', front: 'Updated', back: 'Back', tags: [] },
        { front: 'New card', back: 'New back', tags: [] },
      ],
    })

    // Make the transaction throw (simulates a mid-transaction failure)
    ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('DB failure'))

    const app = makeApp()
    const res = await app.request('/decks/deck-abc/update/apply', {
      method: 'POST',
      body: makeFormData('file content'),
    })

    // Should return a 5xx error — not 200
    expect(res.status).toBeGreaterThanOrEqual(500)
  })

  it("T-16-12: userId is taken from JWT (c.get('userId')), never from request body", async () => {
    ;(parseKartex as ReturnType<typeof vi.fn>).mockReturnValue({
      ...validParseResult,
      cards: [{ id: 'k1', front: 'Front 1', back: 'Back 1', tags: ['a'] }],
    })

    // App uses userId='user-123' from JWT context
    // Include a different userId in the body to ensure it's ignored
    const app = makeApp('user-123')

    const fd = makeFormData('file content', 'test.kartex', { userId: 'evil-attacker' })
    const res = await app.request('/decks/deck-abc/update/apply', {
      method: 'POST',
      body: fd,
    })

    // The owner check uses c.get('userId') = 'user-123' which matches deck.ownerId — so 200
    expect(res.status).toBe(200)
    // Ensure deck was looked up with the deck ID, not modified for wrong user
    expect(prisma.deck.findUnique).toHaveBeenCalledWith({ where: { id: 'deck-abc' } })
  })
})

// ─── ZIP path tests (DECKU-01..DECKU-04) ─────────────────────────────────────

describe('POST /api/decks/:id/update/apply — zip path (DECKU-01..DECKU-04)', () => {
  const kartexText = 'KARTEX_TEXT'
  const fakePngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]) // PNG magic bytes

  beforeEach(() => {
    vi.resetAllMocks()
    ;(prisma.deck.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockDeck)
    ;(prisma.card.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockDeckCards)
    ;(prisma.media.create as ReturnType<typeof vi.fn>).mockResolvedValue({})
    ;(parseKartex as ReturnType<typeof vi.fn>).mockReturnValue({
      deck: { deck: 'Test', author: undefined, tags: [] },
      cards: [
        { id: 'k1', front: 'Front with media://img.png ref', back: 'Back', tags: [] },
      ],
      warnings: [],
    })
    ;(mkdir as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
    ;(writeFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
    ;(fileTypeFromBuffer as ReturnType<typeof vi.fn>).mockResolvedValue({ mime: 'image/png', ext: 'png' })
    ;(unzipper.Open.buffer as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeFakeDirectory(kartexText, [{ path: 'media/img.png', buffer: fakePngBuffer }]),
    )
    ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          card: {
            createMany: vi.fn().mockResolvedValue({ count: 0 }),
            update: vi.fn().mockResolvedValue({}),
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
        }
        return fn(tx)
      },
    )
  })

  it('DECKU-01: apply with .kartex.zip filename returns 200 (not rejected with 400)', async () => {
    const app = makeApp()
    const res = await app.request('/decks/deck-abc/update/apply', {
      method: 'POST',
      body: makeZipFormData('deck.kartex.zip'),
    })

    expect(res.status).toBe(200)
    const json = await res.json() as { deckId: string }
    expect(json.deckId).toBe('deck-abc')
  })

  it('DECKU-02: disallowed MIME in zip media entry → 422, $transaction not called', async () => {
    // Override file-type to return a disallowed MIME
    ;(fileTypeFromBuffer as ReturnType<typeof vi.fn>).mockResolvedValue({ mime: 'application/javascript', ext: 'js' })

    const app = makeApp()
    const res = await app.request('/decks/deck-abc/update/apply', {
      method: 'POST',
      body: makeZipFormData('deck.kartex.zip'),
    })

    expect(res.status).toBe(422)
    expect(prisma.$transaction).not.toHaveBeenCalled()
    const json = await res.json() as { error: string }
    expect(json.error).toBeTruthy()
  })

  it('DECKU-03: zip apply tx.card.update frontContent contains rewritten UUID media ref', async () => {
    // card k1 in mockDeckCards has frontContent 'Front 1' (differs from 'Front with media://img.png ref')
    // → it will land in updatedCards bucket
    let capturedTx: Record<string, Record<string, ReturnType<typeof vi.fn>>> | undefined
    ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          card: {
            createMany: vi.fn().mockResolvedValue({ count: 0 }),
            update: vi.fn().mockResolvedValue({}),
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
        }
        capturedTx = tx as Record<string, Record<string, ReturnType<typeof vi.fn>>>
        return fn(tx)
      },
    )

    const app = makeApp()
    const res = await app.request('/decks/deck-abc/update/apply', {
      method: 'POST',
      body: makeZipFormData('deck.kartex.zip'),
    })

    expect(res.status).toBe(200)
    expect(capturedTx!.card.update).toHaveBeenCalled()
    const updateCall = capturedTx!.card.update.mock.calls[0][0] as { data: { frontContent: string } }
    // frontContent must reference a UUID-based filename, not the original 'img.png'
    expect(updateCall.data.frontContent).toMatch(/media:\/\/[0-9a-f-]{36}\.png/)
  })

  it('DECKU-04: zip apply tx.card.update data has no kartexId, easeFactor, interval, repetitions, nextReviewAt', async () => {
    let capturedTx: Record<string, Record<string, ReturnType<typeof vi.fn>>> | undefined
    ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          card: {
            createMany: vi.fn().mockResolvedValue({ count: 0 }),
            update: vi.fn().mockResolvedValue({}),
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
        }
        capturedTx = tx as Record<string, Record<string, ReturnType<typeof vi.fn>>>
        return fn(tx)
      },
    )

    const app = makeApp()
    const res = await app.request('/decks/deck-abc/update/apply', {
      method: 'POST',
      body: makeZipFormData('deck.kartex.zip'),
    })

    expect(res.status).toBe(200)
    expect(capturedTx!.card.update).toHaveBeenCalled()
    const updateCall = capturedTx!.card.update.mock.calls[0][0] as { data: Record<string, unknown> }
    expect(updateCall.data).not.toHaveProperty('kartexId')
    expect(updateCall.data).not.toHaveProperty('easeFactor')
    expect(updateCall.data).not.toHaveProperty('interval')
    expect(updateCall.data).not.toHaveProperty('repetitions')
    expect(updateCall.data).not.toHaveProperty('nextReviewAt')
  })
})
