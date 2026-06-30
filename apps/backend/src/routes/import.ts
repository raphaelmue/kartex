import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { mkdir } from 'node:fs/promises'
import unzipper from 'unzipper'
import { Prisma } from '@prisma/client'
import { parseKartex } from '@kartex/shared'
import { prisma } from '../lib/prisma.js'
import { rewriteMediaRefs, collectAndValidateMedia, storeMediaBuffers } from '../lib/importMedia.js'

const MAX_BYTES = parseInt(process.env.MAX_UPLOAD_BYTES ?? '10485760', 10)

const importRouter = new Hono<{ Variables: { userId: string } }>()

// GET /api/import/config — returns configured max upload size (D-10)
// Requires JWT (inherited from global authMiddleware in index.ts)
importRouter.get('/config', (c) => {
  const maxFileSizeBytes = parseInt(process.env.MAX_UPLOAD_BYTES ?? '10485760', 10)
  return c.json({ maxFileSizeBytes })
})

// POST /api/import — accepts .kartex (plain) or .kartex.zip (bundle with media/)
// bodyLimit is FIRST in the handler chain (Pitfall 6 — must intercept before parseBody)
importRouter.post(
  '/',
  bodyLimit({
    maxSize: MAX_BYTES,
    onError: (c) =>
      c.json({ error: `File too large. Maximum size is ${MAX_BYTES} bytes.` }, 413),
  }),
  async (c) => {
    const userId = c.get('userId')
    const body = await c.req.parseBody()
    const file = body['file']

    // instanceof File guard (media.ts pattern)
    if (!(file instanceof File)) {
      return c.json({ error: 'File is required.' }, 400)
    }

    // Normalize path separators before extension check (Pitfall 8)
    const normalizedName = file.name.replace(/\\/g, '/')
    const isZip = normalizedName.endsWith('.kartex.zip')
    const isKartex = normalizedName.endsWith('.kartex') && !isZip

    if (!isKartex && !isZip) {
      return c.json({ error: 'File must be a .kartex or .kartex.zip.' }, 400)
    }

    // Read deck name override from FormData (D-05, Pitfall 7)
    const rawDeckName = body['deckName']
    const deckNameOverride =
      typeof rawDeckName === 'string' && rawDeckName.trim() ? rawDeckName.trim() : null

    const storagePath = process.env.STORAGE_PATH ?? '/app/media'
    await mkdir(storagePath, { recursive: true })

    // ── Plain .kartex file ────────────────────────────────────────────────────
    if (isKartex) {
      const text = Buffer.from(await file.arrayBuffer()).toString('utf-8')
      const parseResult = parseKartex(text)

      if ('fatal' in parseResult) {
        return c.json({ error: parseResult.message }, 422)
      }

      const deckName = deckNameOverride ?? parseResult.deck.deck

      // Prisma transaction: deck.create + card.createMany — atomic (Pattern 5)
      const deck = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const created = await tx.deck.create({
          data: {
            ownerId: userId,
            title: deckName,
            description: parseResult.deck.author
              ? `Imported from ${parseResult.deck.author}`
              : undefined,
            visibility: 'PRIVATE',
          },
        })
        await tx.card.createMany({
          data: parseResult.cards.map((card) => ({
            deckId: created.id,
            frontContent: card.front,
            backContent: card.back,
            tags: card.tags,
          })),
        })
        return created
      })

      return c.json(
        {
          deckId: deck.id,
          cardCount: parseResult.cards.length,
          warnings: parseResult.warnings,
        },
        201,
      )
    }

    // ── .kartex.zip bundle ────────────────────────────────────────────────────
    const buffer = Buffer.from(await file.arrayBuffer())

    let directory: Awaited<ReturnType<typeof unzipper.Open.buffer>>
    try {
      directory = await unzipper.Open.buffer(buffer)
    } catch {
      return c.json(
        { error: 'Could not open zip file. Ensure it is a valid .kartex.zip.' },
        422,
      )
    }

    // Find deck.kartex entry (handle both root-level and nested, Pitfall 8)
    const kartexEntry = directory.files.find(
      (f) =>
        f.path === 'deck.kartex' ||
        f.path.replace(/\\/g, '/').endsWith('/deck.kartex'),
    )
    if (!kartexEntry) {
      return c.json(
        {
          error:
            'No deck.kartex found in zip. Ensure the zip contains deck.kartex at the root.',
        },
        422,
      )
    }

    const kartexText = (await kartexEntry.buffer()).toString('utf-8')
    const parseResult = parseKartex(kartexText)

    if ('fatal' in parseResult) {
      return c.json({ error: parseResult.message }, 422)
    }

    const deckName = deckNameOverride ?? parseResult.deck.deck

    // Find media entries — skip macOS metadata and directory entries (Pitfall 8, T-5-02)
    const mediaEntries = directory.files.filter((f) => {
      const normalized = f.path.replace(/\\/g, '/')
      return (
        normalized.startsWith('media/') &&
        !normalized.startsWith('__MACOSX/') &&
        !normalized.endsWith('/')
      )
    })

    // VALIDATION PHASE — collect ALL errors before writing anything (D-08, T-5-01, T-5-03, T-5-04)
    // Rule: if any media file fails validation, abort entire import — nothing written to DB or disk.
    const collected = await collectAndValidateMedia(mediaEntries, MAX_BYTES)
    if (collected.ok === false) {
      if (collected.files) {
        return c.json({ error: 'Validation failed', files: collected.files }, 422)
      }
      return c.json({ error: collected.error }, 422)
    }

    // STORAGE PHASE — validation passed; write all media files (media.ts pattern)
    // T-5-07 (accepted): if transaction fails after media writes, orphaned files remain on disk
    const storedFilenames = await storeMediaBuffers(collected.entryBuffers, storagePath, userId, prisma)

    // D-09: warn about media:// references in cards that have no corresponding file in zip
    // These are warnings only — deck and cards are still created (not a fatal error).
    const allCardText = parseResult.cards
      .flatMap((card) => [card.front, card.back])
      .join('\n')
    const mediaRefRegex = /media:\/\/([^\s)'"]+)/g
    const warnings = [...parseResult.warnings]
    let refMatch: RegExpExecArray | null

    while ((refMatch = mediaRefRegex.exec(allCardText)) !== null) {
      const refName = refMatch[1]
      if (!storedFilenames.has(refName)) {
        const alreadyWarned = warnings.some((w) => w.reason.includes(refName))
        if (!alreadyWarned) {
          // cardIndex 0 = deck-level warning (not card-specific)
          warnings.push({
            cardIndex: 0,
            reason: `Media file referenced but not found in zip: ${refName}`,
          })
        }
      }
    }

    // Prisma transaction: deck.create + card.createMany — atomic (Pattern 5)
    // T-5-07 (accepted): if transaction fails after media writes, orphaned files remain on disk
    const deck = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const created = await tx.deck.create({
        data: {
          ownerId: userId,
          title: deckName,
          description: parseResult.deck.author
            ? `Imported from ${parseResult.deck.author}`
            : undefined,
          visibility: 'PRIVATE',
        },
      })
      await tx.card.createMany({
        data: parseResult.cards.map((card) => ({
          deckId: created.id,
          frontContent: rewriteMediaRefs(card.front, storedFilenames),
          backContent: rewriteMediaRefs(card.back, storedFilenames),
          tags: card.tags,
        })),
      })
      return created
    })

    return c.json(
      {
        deckId: deck.id,
        cardCount: parseResult.cards.length,
        warnings,
      },
      201,
    )
  },
)

export { importRouter }
