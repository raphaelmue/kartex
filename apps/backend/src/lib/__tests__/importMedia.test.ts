import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock node:fs/promises ────────────────────────────────────────────────────
vi.mock('node:fs/promises', () => ({
  writeFile: vi.fn(),
  mkdir: vi.fn(),
}))

// ─── Mock file-type ───────────────────────────────────────────────────────────
vi.mock('file-type', () => ({
  fileTypeFromBuffer: vi.fn(),
}))

import { writeFile } from 'node:fs/promises'
import { fileTypeFromBuffer } from 'file-type'
import {
  ALLOWED_MIMES,
  rewriteMediaRefs,
  collectAndValidateMedia,
  storeMediaBuffers,
  MAX_MEDIA_ENTRIES,
} from '../importMedia.js'

// ─── Test helpers ─────────────────────────────────────────────────────────────
function makeFakeEntry(path: string, content: Buffer) {
  return {
    path,
    buffer: () => Promise.resolve(content),
  }
}

// ─────────────────────────────────────────────────────────────────────────────

describe('rewriteMediaRefs', () => {
  it('rewrites a known media:// ref to the stored UUID name', () => {
    const storedFilenames = new Map([['carnot.png', 'uuid-1.png']])
    const result = rewriteMediaRefs('see media://carnot.png here', storedFilenames)
    expect(result).toBe('see media://uuid-1.png here')
  })

  it('leaves a media:// ref with no entry in the map unchanged', () => {
    const storedFilenames = new Map<string, string>()
    const result = rewriteMediaRefs('see media://unknown.png here', storedFilenames)
    expect(result).toBe('see media://unknown.png here')
  })
})

describe('ALLOWED_MIMES', () => {
  it('is a Set containing image and audio types', () => {
    expect(ALLOWED_MIMES).toBeInstanceOf(Set)
    expect(ALLOWED_MIMES.has('image/png')).toBe(true)
    expect(ALLOWED_MIMES.has('audio/mpeg')).toBe(true)
    expect(ALLOWED_MIMES.has('application/javascript')).toBe(false)
  })
})

describe('MAX_MEDIA_ENTRIES', () => {
  it('equals 100', () => {
    expect(MAX_MEDIA_ENTRIES).toBe(100)
  })
})

describe('collectAndValidateMedia', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns ok:true with entryBuffers for a valid png entry', async () => {
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]) // PNG magic bytes
    ;(fileTypeFromBuffer as ReturnType<typeof vi.fn>).mockResolvedValue({ mime: 'image/png', ext: 'png' })

    const entries = [makeFakeEntry('media/carnot.png', pngBuffer)]
    const result = await collectAndValidateMedia(entries, 10 * 1024 * 1024)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.entryBuffers.has('carnot.png')).toBe(true)
    }
  })

  it('returns ok:false when detected MIME is not in ALLOWED_MIMES', async () => {
    const jsBuffer = Buffer.from('console.log("hello")')
    ;(fileTypeFromBuffer as ReturnType<typeof vi.fn>).mockResolvedValue({ mime: 'application/javascript', ext: 'js' })

    const entries = [makeFakeEntry('media/script.js', jsBuffer)]
    const result = await collectAndValidateMedia(entries, 10 * 1024 * 1024)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.files).toBeDefined()
      expect(result.files!.length).toBeGreaterThan(0)
      expect(result.files![0].reason).toMatch(/application\/javascript/)
    }
  })

  it('returns ok:false with size reason when entry exceeds maxFileBytes', async () => {
    const bigBuffer = Buffer.alloc(11 * 1024 * 1024) // 11 MB
    ;(fileTypeFromBuffer as ReturnType<typeof vi.fn>).mockResolvedValue({ mime: 'image/png', ext: 'png' })

    const entries = [makeFakeEntry('media/big.png', bigBuffer)]
    const result = await collectAndValidateMedia(entries, 10 * 1024 * 1024) // 10 MB limit

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.files).toBeDefined()
      expect(result.files!.some((f) => f.reason.includes('size') || f.reason.includes('Exceeds'))).toBe(true)
    }
  })

  it('returns ok:false with error string when more than MAX_MEDIA_ENTRIES entries are provided', async () => {
    ;(fileTypeFromBuffer as ReturnType<typeof vi.fn>).mockResolvedValue({ mime: 'image/png', ext: 'png' })

    const entries = Array.from({ length: MAX_MEDIA_ENTRIES + 1 }, (_, i) =>
      makeFakeEntry(`media/file${i}.png`, Buffer.from([0x89, 0x50, 0x4e, 0x47])),
    )
    const result = await collectAndValidateMedia(entries, 10 * 1024 * 1024)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toMatch(/[Tt]oo many/)
    }
  })
})

describe('storeMediaBuffers', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('calls writeFile once per buffer, calls prismaClient.media.create once per buffer, and returns a Map keyed by original basename', async () => {
    ;(fileTypeFromBuffer as ReturnType<typeof vi.fn>).mockResolvedValue({ mime: 'image/png', ext: 'png' })
    ;(writeFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

    const fakePrisma = { media: { create: vi.fn().mockResolvedValue({}) } }
    const entryBuffers = new Map([
      ['carnot.png', Buffer.from([0x89, 0x50, 0x4e, 0x47])],
    ])

    const result = await storeMediaBuffers(entryBuffers, '/app/media', 'user-abc', fakePrisma)

    expect(writeFile).toHaveBeenCalledTimes(1)
    expect(fakePrisma.media.create).toHaveBeenCalledTimes(1)
    expect(result).toBeInstanceOf(Map)
    expect(result.has('carnot.png')).toBe(true)
    // The stored filename should be a UUID-based name
    const storedName = result.get('carnot.png')!
    expect(storedName).toMatch(/^[0-9a-f-]{36}\.png$/)
  })

  it('calls media.create exactly N times for N buffers and returns N entries in the map', async () => {
    ;(fileTypeFromBuffer as ReturnType<typeof vi.fn>).mockResolvedValue({ mime: 'image/jpeg', ext: 'jpg' })
    ;(writeFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

    const fakePrisma = { media: { create: vi.fn().mockResolvedValue({}) } }
    const entryBuffers = new Map([
      ['img1.jpg', Buffer.from([0xff, 0xd8, 0xff])],
      ['img2.jpg', Buffer.from([0xff, 0xd8, 0xff])],
      ['img3.jpg', Buffer.from([0xff, 0xd8, 0xff])],
    ])

    const result = await storeMediaBuffers(entryBuffers, '/app/media', 'user-abc', fakePrisma)

    expect(fakePrisma.media.create).toHaveBeenCalledTimes(3)
    expect(result.size).toBe(3)
  })
})
