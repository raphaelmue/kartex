# ─── Stage 1: Frontend builder ───────────────────────────────────────────────
FROM node:22-alpine AS frontend-builder

WORKDIR /build

# Copy workspace manifests for dependency installation
COPY package.json ./
COPY .yarnrc.yml ./
COPY yarn.lock ./
COPY apps/frontend/package.json apps/frontend/
COPY packages/shared/package.json packages/shared/
# Add a minimal backend package.json (needed for workspace resolution)
COPY apps/backend/package.json apps/backend/

RUN corepack enable && corepack prepare yarn@4.6.0 --activate
RUN yarn install

# Copy source
COPY apps/frontend/ apps/frontend/
COPY packages/shared/ packages/shared/

# Build frontend — outputs to apps/backend/public (per vite.config.ts outDir)
RUN yarn workspace @kartex/frontend build

# ─── Stage 2: Backend builder ─────────────────────────────────────────────────
FROM node:22-alpine AS backend-builder

WORKDIR /build

COPY package.json ./
COPY .yarnrc.yml ./
COPY yarn.lock ./
COPY apps/backend/package.json apps/backend/
COPY packages/shared/package.json packages/shared/

RUN corepack enable && corepack prepare yarn@4.6.0 --activate
RUN yarn install

# Copy source
COPY apps/backend/ apps/backend/
COPY packages/shared/ packages/shared/

# Generate Prisma client for the target platform
RUN yarn workspace @kartex/backend prisma generate

# Compile TypeScript
RUN yarn workspace @kartex/backend build

# ─── Stage 3: Production image ────────────────────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Install production dependencies only
COPY package.json ./
COPY .yarnrc.yml ./
COPY yarn.lock ./
COPY apps/backend/package.json apps/backend/
COPY packages/shared/package.json packages/shared/

RUN corepack enable && corepack prepare yarn@4.6.0 --activate && \
    yarn workspaces focus @kartex/backend --production

# Copy compiled backend
COPY --from=backend-builder /build/apps/backend/dist/ ./apps/backend/dist/
COPY --from=backend-builder /build/apps/backend/prisma/ ./apps/backend/prisma/

# Copy generated Prisma client (platform-specific binaries are in node_modules)
COPY --from=backend-builder /build/node_modules/.prisma/ ./node_modules/.prisma/
COPY --from=backend-builder /build/node_modules/@prisma/ ./node_modules/@prisma/

# Copy built frontend (SPA) to where Hono will serve it
COPY --from=frontend-builder /build/apps/backend/public/ ./apps/backend/public/

# Copy entrypoint script (strip CRLF in case of Windows checkout)
COPY apps/backend/entrypoint.sh /app/entrypoint.sh
RUN sed -i 's/\r$//' /app/entrypoint.sh && chmod +x /app/entrypoint.sh

EXPOSE 3000

CMD ["/app/entrypoint.sh"]
