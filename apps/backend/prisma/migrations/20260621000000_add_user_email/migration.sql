-- AlterTable: Add email column to User — implements EMAIL-01
-- Column is nullable (no NOT NULL constraint) so existing users remain valid with email = NULL.
-- UNIQUE constraint permits multiple NULLs in Postgres per SQL standard.
-- Applied via `prisma migrate deploy` in Docker Compose entrypoint (entrypoint.sh).
-- Note: `prisma migrate dev` is unavailable in the dev shell (no DATABASE_URL in bash env — 10-02/18-01 decisions).
ALTER TABLE "User" ADD COLUMN "email" TEXT UNIQUE;
