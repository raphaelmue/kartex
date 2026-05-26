#!/bin/sh
set -e

echo "[entrypoint] Running database migrations..."
npx prisma migrate deploy --schema /app/apps/backend/prisma/schema.prisma

echo "[entrypoint] Starting server..."
cd /app/apps/backend
exec node dist/index.js
