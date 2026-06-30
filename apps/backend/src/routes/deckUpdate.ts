import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { mkdir } from 'node:fs/promises'
import { Prisma } from '@prisma/client'
import unzipper from 'unzipper'
import { parseKartex } from '@kartex/shared'
import { prisma } from '../lib/prisma.js'
import { rewriteMediaRefs, collectAndValidateMedia, storeMediaBuffers } from '../lib/importMedia.js'

const MAX_BYTES = parseInt(process.env.MAX_UPLOAD_BYTES ?? '10485760', 10)

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
    const isZip = normalizedName.endsWith('.kartex.zip')
    const isKartex = normalizedName.endsWith('.kartex') && !isZip
    if (!isKartex && !isZip) {
      return c.json({ error: 'File must be a .kartex or .kartex.zip.' }, 400)
    }

    // ── .kartex.zip branch (preview — stateless, NO media extraction) ─────────
    if (isZip) {
      const buffer = Buffer.from(await file.arrayBuffer())
      let directory: Awaited<ReturnType<typeof unzipper.Open.buffer>>
      try {
        directory = await unzipper.Open.buffer(buffer)
      } catch {
        return c.json({ error: 'Could not open zip file.' }, 422)
      }
      const kartexEntry = directory.files.find(
        (f) => f.path === 'deck.kartex' || f.path.replace(/\\/g, '/').endsWith('/deck.kartex'),
      )
      if (!kartexEntry) return c.json({ error: 'No deck.kartex found in zip.' }, 422)
      const kartexText = (await kartexEntry.buffer()).toString('utf-8')
      const parseResult = parseKartex(kartexText)
      if ('fatal' in parseResult) return c.json({ error: parseResult.message }, 422)
      if (hasDuplicateKartexIds(parseResult.cards)) return c.json({ error: 'Duplicate id values in file.' }, 422)
      const deckCards = await prisma.card.findMany({
        where: { deckId },
        select: { id: true, kartexId: true, frontContent: true, backContent: true, tags: true },
      })
      const diff = computeDiff(parseResult.cards, deckCards)
      return c.json(
        { added: diff.added, updated: diff.updated, unchanged: diff.unchanged, removed: diff.removed },
        200,
      )
    }

    // ── Plain .kartex branch (preview) ────────────────────────────────────────
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
    const isZip = normalizedName.endsWith('.kartex.zip')
    const isKartex = normalizedName.endsWith('.kartex') && !isZip
    if (!isKartex && !isZip) {
      return c.json({ error: 'File must be a .kartex or .kartex.zip.' }, 400)
    }

    // ── .kartex.zip branch (apply — full media validate + store + rewrite) ────
    if (isZip) {
      const buffer = Buffer.from(await file.arrayBuffer())
      let directory: Awaited<ReturnType<typeof unzipper.Open.buffer>>
      try {
        directory = await unzipper.Open.buffer(buffer)
      } catch {
        return c.json({ error: 'Could not open zip file.' }, 422)
      }
      const kartexEntry = directory.files.find(
        (f) => f.path === 'deck.kartex' || f.path.replace(/\\/g, '/').endsWith('/deck.kartex'),
      )
      if (!kartexEntry) return c.json({ error: 'No deck.kartex found in zip.' }, 422)
      const kartexText = (await kartexEntry.buffer()).toString('utf-8')
      const parseResult = parseKartex(kartexText)
      if ('fatal' in parseResult) return c.json({ error: parseResult.message }, 422)
      if (hasDuplicateKartexIds(parseResult.cards)) return c.json({ error: 'Duplicate id values in file.' }, 422)

      // keepRemoved: string "false" → delete absent cards; anything else → keep (default true)
      const rawKeepRemoved = body['keepRemoved']
      const keepRemoved = typeof rawKeepRemoved === 'string' ? rawKeepRemoved !== 'false' : true

      // Find media entries — skip macOS metadata and directory entries (Pitfall 8, T-5-02)
      const mediaEntries = directory.files.filter((f) => {
        const normalized = f.path.replace(/\\/g, '/')
        return (
          normalized.startsWith('media/') &&
          !normalized.startsWith('__MACOSX/') &&
          !normalized.endsWith('/')
        )
      })

      const storagePath = process.env.STORAGE_PATH ?? '/app/media'
      await mkdir(storagePath, { recursive: true })

      // Validate all media files BEFORE writing anything (D-08, T-27-02)
      const collected = await collectAndValidateMedia(mediaEntries, MAX_BYTES)
      if (collected.ok === false) {
        return c.json(
          { error: collected.error, ...(collected.files ? { files: collected.files } : {}) },
          422,
        )
      }

      const deckCards = await prisma.card.findMany({
        where: { deckId },
        select: { id: true, kartexId: true, frontContent: true, backContent: true, tags: true },
      })
      const diff = computeDiff(parseResult.cards, deckCards)

      // T-5-07 (accepted): if $transaction fails after media writes, orphaned files remain on disk
      const storedFilenames = await storeMediaBuffers(collected.entryBuffers, storagePath, userId, prisma)

      // Execute atomic Prisma interactive transaction
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Add new cards (with rewritten media refs)
        if (diff.addedCards.length > 0) {
          await tx.card.createMany({
            data: diff.addedCards.map((fc) => ({
              deckId,
              frontContent: rewriteMediaRefs(fc.front, storedFilenames),
              backContent: rewriteMediaRefs(fc.back, storedFilenames),
              tags: fc.tags,
              kartexId: fc.id ?? null,
            })),
          })
        }

        // Update matched cards — only frontContent, backContent, tags (DECKU-04: never kartexId, never CardProgress)
        for (const { fileCard, deckCard } of diff.updatedCards) {
          await tx.card.update({
            where: { id: deckCard.id },
            data: {
              frontContent: rewriteMediaRefs(fileCard.front, storedFilenames),
              backContent: rewriteMediaRefs(fileCard.back, storedFilenames),
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
    }

    // ── Plain .kartex branch (apply) — NO rewriteMediaRefs (no media refs in plain .kartex) ──
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
