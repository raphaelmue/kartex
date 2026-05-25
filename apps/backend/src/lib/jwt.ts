import { SignJWT, jwtVerify, type JWTPayload } from 'jose'

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set')
  }
  return new TextEncoder().encode(secret)
}

/**
 * Sign a JWT with the given payload and expiry.
 * @param payload - Claims to embed (e.g. { sub: userId, role })
 * @param expiresIn - Expiry string accepted by jose (e.g. '15m', '30d')
 * @returns Signed JWT string
 */
export async function signToken(
  payload: Record<string, unknown>,
  expiresIn: string,
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecret())
}

/**
 * Verify a JWT and return its payload.
 * Throws if the token is invalid or expired.
 */
export async function verifyToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, getSecret())
  return payload
}
