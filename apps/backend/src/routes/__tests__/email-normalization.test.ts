import { describe, it, expect } from 'vitest'
import { normalizedEmail, PasswordResetRequestSchema, UpdateEmailSchema, UpdateMeSchema } from '@kartex/shared'

// Real, executable cross-schema normalization test proving normalizedEmail() is the
// single source of truth consumed by PasswordResetRequestSchema, UpdateEmailSchema,
// and UpdateMeSchema (Phase 29 Plan 05 — closes CR-01 / WR-01).

describe('normalizedEmail()', () => {
  it('trims whitespace and lowercases a mixed-case email', () => {
    const result = normalizedEmail().safeParse(' Foo@Bar.COM ')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBe('foo@bar.com')
    }
  })

  it('rejects a malformed email', () => {
    const result = normalizedEmail().safeParse('not-an-email')
    expect(result.success).toBe(false)
  })
})

describe('PasswordResetRequestSchema — normalization (CR-01)', () => {
  it('normalizes a whitespace-padded mixed-case email before validation', () => {
    const result = PasswordResetRequestSchema.safeParse({ email: ' Foo@Bar.COM ' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.email).toBe('foo@bar.com')
    }
  })
})

describe('UpdateEmailSchema — normalization (unchanged behavior after refactor)', () => {
  it('normalizes a whitespace-padded mixed-case email', () => {
    const result = UpdateEmailSchema.safeParse({ email: ' Foo@Bar.COM ' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.email).toBe('foo@bar.com')
    }
  })
})

describe('UpdateMeSchema — normalization (unchanged behavior after refactor)', () => {
  it('normalizes a whitespace-padded mixed-case email', () => {
    const result = UpdateMeSchema.safeParse({ email: ' Foo@Bar.COM ' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.email).toBe('foo@bar.com')
    }
  })
})
