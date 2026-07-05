-- Adds a unique index on RefreshToken.tokenHash.
-- Required by the switch from bcrypt-hashed refresh tokens (non-deterministic,
-- unindexable — required an O(n) findMany + bcrypt.compare scan over every
-- valid token system-wide) to SHA-256-hashed tokens (deterministic, matching
-- the existing PasswordResetToken/InviteToken pattern), enabling an O(1)
-- findUnique({ where: { tokenHash } }) lookup on POST /auth/refresh and
-- POST /auth/logout.
--
-- Existing rows were hashed with bcrypt before this migration and will never
-- match a future SHA-256 lookup; they are harmless (naturally expire within
-- 30 days) and are left in place rather than deleted.

CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");
