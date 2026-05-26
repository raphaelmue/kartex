#!/bin/sh
set -e

echo "[entrypoint] Running database migrations..."
npx prisma migrate deploy --schema /app/apps/backend/prisma/schema.prisma

echo "[entrypoint] Starting server..."
exec node /app/apps/backend/dist/index.js
