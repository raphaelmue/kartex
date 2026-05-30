#!/bin/sh
set -e

echo "[entrypoint] Running database migrations..."
cd /app/apps/backend
npx prisma migrate deploy

echo "[entrypoint] Starting server..."
exec node dist/index.js
