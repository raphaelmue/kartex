import { basename, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import { fileTypeFromBuffer } from 'file-type'

// MDIA-01, MDIA-02: allowed image and audio MIME types (validated via magic bytes — D-08, T-5-03)
export const ALLOWED_MIMES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
])

// Rewrites media://originalName refs to media://storedUuidName after ZIP extraction.
// Card content is stored verbatim from the .kartex source; without this rewrite,
// media:// refs point to the original filenames which are never served (UUID names are).
export function rewriteMediaRefs(text: string, storedFilenames: Map<string, string>): string {
  return text.replace(/media:\/\/([^\s)'"]+)/g, (_match, refName: string) => {
    const stored = storedFilenames.get(refName)
    return stored ? `media://${stored}` : `media://${refName}`
  })
}

export const MAX_MEDIA_ENTRIES = 100

export type MediaValidationError = { name: string; reason: string }

export type CollectResult =
  | { ok: true; entryBuffers: Map<string, Buffer> }
  | { ok: false; status: 422; error: string; files?: MediaValidationError[] }

// collectAndValidateMedia — VALIDATION PHASE extracted from import.ts (T-5-01, T-5-03, T-5-04)
// Collects ALL validation errors before returning; only returns ok:true when zero errors.
export async function collectAndValidateMedia(
  mediaEntries: { path: string; buffer: () => Promise<Buffer> }[],
  maxFileBytes: number,
): Promise<CollectResult> {
  const MAX_TOTAL_BYTES = maxFileBytes * 10 // 100 MB uncompressed ceiling

  // T-5-04: cap total entry count
  if (mediaEntries.length > MAX_MEDIA_ENTRIES) {
    return {
      ok: false,
      status: 422,
      error: `Too many media files in zip (${mediaEntries.length}). Maximum is ${MAX_MEDIA_ENTRIES}.`,
    }
  }

  const validationErrors: MediaValidationError[] = []
  const entryBuffers = new Map<string, Buffer>() // cache to avoid re-reading in storage phase
  let totalUncompressedBytes = 0

  for (const entry of mediaEntries) {
    // T-5-02: basename strips directory components — raw zip path never touches filesystem
    const entryName = basename(entry.path.replace(/\\/g, '/'))
    const bytes = await entry.buffer()
    totalUncompressedBytes += bytes.length

    if (totalUncompressedBytes > MAX_TOTAL_BYTES) {
      return {
        ok: false,
        status: 422,
        error: `Total uncompressed media size exceeds limit (max ${MAX_TOTAL_BYTES} bytes).`,
      }
    }

    entryBuffers.set(entryName, bytes)

    // T-5-04: check individual extracted file size (not just the zip total)
    if (bytes.length > maxFileBytes) {
      validationErrors.push({
        name: entryName,
        reason: `Exceeds size limit (${bytes.length} bytes, max ${maxFileBytes} bytes)`,
      })
      continue
    }

    // T-5-03: magic bytes validation — never trust client-declared MIME type
    const detected = await fileTypeFromBuffer(bytes)
    if (!detected || !ALLOWED_MIMES.has(detected.mime)) {
      validationErrors.push({
        name: entryName,
        reason: `File type not allowed: ${detected?.mime ?? 'unknown'}`,
      })
    }
  }

  // D-08: if any validation failure, abort — return 422 with all offending files
  if (validationErrors.length > 0) {
    return { ok: false, status: 422, error: 'Validation failed', files: validationErrors }
  }

  return { ok: true, entryBuffers }
}

type MediaCreateData = {
  ownerId: string
  filename: string
  mimeType: string
  storagePath: string
  sizeBytes: number
}

// storeMediaBuffers — STORAGE PHASE extracted from import.ts (T-5-02, T-5-07)
// Writes all media files to disk and creates DB records.
// T-5-07 (accepted): if caller's transaction fails after this call, orphaned files remain on disk.
export async function storeMediaBuffers(
  entryBuffers: Map<string, Buffer>,
  storagePath: string,
  userId: string,
  prismaClient: { media: { create: (args: { data: MediaCreateData }) => Promise<unknown> } },
): Promise<Map<string, string>> {
  const storedFilenames = new Map<string, string>() // originalName → storedFilename

  for (const [entryName, bytes] of entryBuffers) {
    // Re-detect (guaranteed non-null here — passed validation above)
    const detected = await fileTypeFromBuffer(bytes)
    // T-5-02: UUID-based filename — raw ZIP entry path never touches the filesystem
    const filename = randomUUID() + '.' + detected!.ext
    const fullPath = join(storagePath, filename)
    await writeFile(fullPath, bytes)
    await prismaClient.media.create({
      data: {
        ownerId: userId,
        filename,
        mimeType: detected!.mime,
        storagePath: fullPath,
        sizeBytes: bytes.length,
      },
    })
    storedFilenames.set(entryName, filename)
  }

  return storedFilenames
}
