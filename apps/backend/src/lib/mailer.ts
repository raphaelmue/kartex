import nodemailer from 'nodemailer'
import type { SendMailOptions, Transporter } from 'nodemailer'

// ─── Singleton initialization ─────────────────────────────────────────────────
// D-09: nodemailer singleton configured via env vars.
// D-10: Soft fail on startup — if SMTP env vars are missing or incomplete,
//       log a warning and set transporter to null (server still starts).

const SMTP_HOST = process.env.SMTP_HOST
const SMTP_PORT = process.env.SMTP_PORT
const SMTP_SECURE = process.env.SMTP_SECURE
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS
const SMTP_FROM = process.env.SMTP_FROM

let transporter: Transporter | null = null

const requiredVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM']
const allPresent =
  SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS && SMTP_FROM

if (allPresent) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: SMTP_SECURE === 'true',
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  })
  console.log('[mailer] SMTP configured.')
} else {
  console.warn('[mailer] SMTP env vars missing — email disabled.')
}

// ─── Exports ──────────────────────────────────────────────────────────────────

/**
 * Returns true when the SMTP transporter is configured and ready.
 * D-10: soft-fail check — callers use this to guard before calling sendMail.
 */
export function isConfigured(): boolean {
  return transporter !== null
}

/**
 * Sends an email using the configured SMTP transporter.
 * Throws a descriptive Error when the transporter is null (SMTP not configured).
 */
export async function sendMail(options: SendMailOptions): Promise<void> {
  if (!transporter) {
    throw new Error(
      `SMTP is not configured. Required env vars: ${requiredVars.join(', ')}.`,
    )
  }
  await transporter.sendMail({ from: SMTP_FROM, ...options })
}

/**
 * Verifies the SMTP connection by calling transporter.verify().
 * Only called from the test endpoint — NOT at module init (D-10 anti-pattern:
 * verify() opens a connection and can delay startup if SMTP server is down).
 * Throws when unconfigured or when the connection fails.
 */
export async function verifyConnection(): Promise<void> {
  if (!transporter) {
    throw new Error(
      `SMTP is not configured. Required env vars: ${requiredVars.join(', ')}.`,
    )
  }
  await transporter.verify()
}
