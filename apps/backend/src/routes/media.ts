import { Hono } from 'hono'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { prisma } from '../lib/prisma.js'

// ─── Public router — GET /:filename (no auth required) ───────────────────────
// Register this BEFORE authMiddleware in index.ts so browser <img> and <audio>
// src attributes can resolve media files without a cookie.
const mediaPublic = new Hono()

mediaPublic.get('/:filename', async (c) => {
  const filename = c.req.param('filename')

  // Validate filename to prevent path traversal (T-03-PATH)
  // UUID-based filenames only — rejects slashes, double-dots, etc.
  if (!/^[A-Za-z0-9_-]+\.[a-z0-9]{1,10}$/.test(filename)) {
    return c.json({ error: 'Invalid filename.' }, 400)
  }

  const storagePath = process.env.STORAGE_PATH ?? '/app/media'
  const fullPath = join(storagePath, filename)

  // Verify the file exists in the DB (prevents serving arbitrary files on disk)
  const media = await prisma.media.findFirst({ where: { filename } })
  if (!media) {
    return c.json({ error: 'Not found.' }, 404)
  }

  let bytes: Buffer
  try {
    bytes = await readFile(fullPath)
  } catch {
    return c.json({ error: 'Not found.' }, 404)
  }

  return c.newResponse(bytes, 200, { 'Content-Type': media.mimeType })
})

// ─── Protected router — POST /upload (auth required) ─────────────────────────
// Register this AFTER authMiddleware in index.ts.
const media = new Hono<{ Variables: { userId: string } }>()

media.post('/upload', async (c) => {
  const userId = c.get('userId')

  const body = await c.req.parseBody()
  const file = body['file']

  if (!(file instanceof File)) {
    return c.json({ error: 'File is required.' }, 400)
  }

  const storagePath = process.env.STORAGE_PATH ?? '/app/media'
  await mkdir(storagePath, { recursive: true })

  const ext = extname(file.name)
  const filename = randomUUID() + ext
  const fullPath = join(storagePath, filename)

  await writeFile(fullPath, Buffer.from(await file.arrayBuffer()))

  await prisma.media.create({
    data: {
      ownerId: userId,
      filename,
      mimeType: file.type,
      storagePath: fullPath,
      sizeBytes: file.size,
    },
  })

  return c.json({ filename, url: `/api/media/${filename}` }, 201)
})

export { media as mediaRouter, mediaPublic as mediaPublicRouter }
