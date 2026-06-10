import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { Prisma } from '@prisma/client'
import { parseKartex } from '@kartex/shared'
import { prisma } from '../lib/prisma.js'

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB — same as import.ts

const deckUpdateRouter = new Hono<{ Variables: { userId: string } }>()

// ─── computeDiff (pure — no DB side effects) ─────────────────────────────────

type FileCard = {
  id?: string | null
  front: string
  back: string
  tags: string[]
}

type DeckCard = {
  id: string
  kartexId: string | null
  frontContent: string
  backContent: string
  tags: string[]
}

type DiffUpdatedEntry = { fileCard: FileCard; deckCard: DeckCard }

type DiffResult = {
  added: number
  updated: number
  unchanged: number
  removed: number
  addedCards: FileCard[]
  updatedCards: DiffUpdatedEntry[]
  removedIds: string[]
}

function sortedTagsJson(tags: string[]): string {
  return JSON.stringify([...tags].sort())
}

function computeDiff(fileCards: FileCard[], deckCards: DeckCard[]): DiffResult {
  const deckByKartexId = new Map<string, DeckCard>()
  for (const dc of deckCards) {
    if (dc.kartexId != null) {
      deckByKartexId.set(dc.kartexId, dc)
    }
  }

  const addedCards: FileCard[] = []
  const updatedCards: DiffUpdatedEntry[] = []
  const unchangedCount: { n: number } = { n: 0 }
  const matchedDeckCardIds = new Set<string>()

  for (const fc of fileCards) {
    if (!fc.id) {
      // No kartexId in file → added bucket
      addedCards.push(fc)
      continue
    }

    const deckCard = deckByKartexId.get(fc.id)
    if (!deckCard) {
      // kartexId not found in deck → added bucket
      addedCards.push(fc)
      continue
    }

    // Matched — compare content
    matchedDeckCardIds.add(deckCard.id)
    const contentChanged =
      deckCard.frontContent !== fc.front ||
      deckCard.backContent !== fc.back ||
      sortedTagsJson(deckCard.tags) !== sortedTagsJson(fc.tags)

    if (contentChanged) {
      updatedCards.push({ fileCard: fc, deckCard })
    } else {
      unchangedCount.n++
    }
  }

  // Cards in deck that were not matched by any file card → removed bucket
  // Exclude cards with kartexId = null (manually created — not import-managed)
  const removedIds: string[] = []
  for (const dc of deckCards) {
    if (dc.kartexId != null && !matchedDeckCardIds.has(dc.id)) {
      removedIds.push(dc.id)
    }
  }

  return {
    added: addedCards.length,
    updated: updatedCards.length,
    unchanged: unchangedCount.n,
    removed: removedIds.length,
    addedCards,
    updatedCards,
    removedIds,
  }
}

// ─── Duplicate kartexId guard ─────────────────────────────────────────────────
// Returns true if the file contains duplicate kartexId values (non-null ids).
function hasDuplicateKartexIds(fileCards: FileCard[]): boolean {
  const ids = fileCards.filter((fc) => fc.id != null).map((fc) => fc.id as string)
  return new Set(ids).size !== ids.length
}

// ─── POST /:id/update/preview ─────────────────────────────────────────────────
deckUpdateRouter.post(
  '/:id/update/preview',
  bodyLimit({
    maxSize: MAX_BYTES,
    onError: (c) => c.json({ error: 'File is too large.' }, 413),
  }),
  async (c) => {
    const deckId = c.req.param('id')
    const userId = c.get('userId')

    // Owner gate — check existence and ownership before any file processing
    const deck = await prisma.deck.findUnique({ where: { id: deckId } })
    if (!deck) return c.json({ error: 'Not found.' }, 404)
    if (deck.ownerId !== userId) return c.json({ error: 'Forbidden.' }, 403)

    // File validation
    const body = await c.req.parseBody()
    const file = body['file']
    if (!(file instanceof File)) return c.json({ error: 'File is required.' }, 400)

    const normalizedName = file.name.replace(/\\/g, '/')
    if (normalizedName.endsWith('.kartex.zip')) {
      return c.json({ error: 'File must be a .kartex file (not .kartex.zip).' }, 400)
    }
    if (!normalizedName.endsWith('.kartex')) {
      return c.json({ error: 'File must be a .kartex file.' }, 400)
    }

    // Parse kartex file
    const text = Buffer.from(await file.arrayBuffer()).toString('utf-8')
    const parseResult = parseKartex(text)
    if ('fatal' in parseResult) {
      return c.json({ error: parseResult.message }, 422)
    }

    // Duplicate kartexId guard
    if (hasDuplicateKartexIds(parseResult.cards)) {
      return c.json({ error: 'Duplicate id values in file.' }, 422)
    }

    // Load current deck cards
    const deckCards = await prisma.card.findMany({
      where: { deckId },
      select: { id: true, kartexId: true, frontContent: true, backContent: true, tags: true },
    })

    const diff = computeDiff(parseResult.cards, deckCards)

    return c.json(
      {
        added: diff.added,
        updated: diff.updated,
        unchanged: diff.unchanged,
        removed: diff.removed,
      },
      200,
    )
  },
)

// ─── POST /:id/update/apply ───────────────────────────────────────────────────
deckUpdateRouter.post(
  '/:id/update/apply',
  bodyLimit({
    maxSize: MAX_BYTES,
    onError: (c) => c.json({ error: 'File is too large.' }, 413),
  }),
  async (c) => {
    const deckId = c.req.param('id')
    const userId = c.get('userId')

    // Owner gate — stateless re-check (TOCTOU prevention per RESEARCH.md)
    const deck = await prisma.deck.findUnique({ where: { id: deckId } })
    if (!deck) return c.json({ error: 'Not found.' }, 404)
    if (deck.ownerId !== userId) return c.json({ error: 'Forbidden.' }, 403)

    // File validation (full re-computation — stateless, no server-side session)
    const body = await c.req.parseBody()
    const file = body['file']
    if (!(file instanceof File)) return c.json({ error: 'File is required.' }, 400)

    const normalizedName = file.name.replace(/\\/g, '/')
    if (normalizedName.endsWith('.kartex.zip')) {
      return c.json({ error: 'File must be a .kartex file (not .kartex.zip).' }, 400)
    }
    if (!normalizedName.endsWith('.kartex')) {
      return c.json({ error: 'File must be a .kartex file.' }, 400)
    }

    // Parse kartex file
    const text = Buffer.from(await file.arrayBuffer()).toString('utf-8')
    const parseResult = parseKartex(text)
    if ('fatal' in parseResult) {
      return c.json({ error: parseResult.message }, 422)
    }

    // Duplicate kartexId guard
    if (hasDuplicateKartexIds(parseResult.cards)) {
      return c.json({ error: 'Duplicate id values in file.' }, 422)
    }

    // keepRemoved: string "false" → delete absent cards; anything else → keep (default true)
    const rawKeepRemoved = body['keepRemoved']
    const keepRemoved = typeof rawKeepRemoved === 'string' ? rawKeepRemoved !== 'false' : true

    // Load current deck cards
    const deckCards = await prisma.card.findMany({
      where: { deckId },
      select: { id: true, kartexId: true, frontContent: true, backContent: true, tags: true },
    })

    const diff = computeDiff(parseResult.cards, deckCards)

    // Execute atomic Prisma interactive transaction
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Add new cards
      if (diff.addedCards.length > 0) {
        await tx.card.createMany({
          data: diff.addedCards.map((fc) => ({
            deckId,
            frontContent: fc.front,
            backContent: fc.back,
            tags: fc.tags,
            kartexId: fc.id ?? null,
          })),
        })
      }

      // Update matched cards — only frontContent, backContent, tags (never kartexId, never CardProgress)
      for (const { fileCard, deckCard } of diff.updatedCards) {
        await tx.card.update({
          where: { id: deckCard.id },
          data: {
            frontContent: fileCard.front,
            backContent: fileCard.back,
            tags: fileCard.tags,
          },
        })
      }

      // Delete removed cards only when keepRemoved=false
      if (!keepRemoved && diff.removedIds.length > 0) {
        await tx.card.deleteMany({
          where: { id: { in: diff.removedIds } },
        })
      }
    })

    return c.json(
      {
        added: diff.added,
        updated: diff.updated,
        unchanged: diff.unchanged,
        removed: diff.removed,
        deckId,
      },
      200,
    )
  },
)

export { deckUpdateRouter }
