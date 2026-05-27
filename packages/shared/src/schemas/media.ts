import { z } from 'zod'

export const MediaUploadResponseSchema = z.object({
  filename: z.string(),
  url: z.string(),
})
export type MediaUploadResponse = z.infer<typeof MediaUploadResponseSchema>

export const MediaSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  filename: z.string(),
  mimeType: z.string(),
  storagePath: z.string(),
  sizeBytes: z.number(),
  createdAt: z.string(),
})
export type Media = z.infer<typeof MediaSchema>
