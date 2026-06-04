# Kartex

Self-hosted flashcard application with spaced repetition, rich content (LaTeX, Typst, code, media), and PWA support.

## Features

- SM-2 spaced repetition with Normal / Intensive / Exam Prep study modes
- Rich card content: Markdown, KaTeX math (`$...$`, `$$...$$`), Typst WASM (`#typst` blocks), images, audio, syntax-highlighted code
- Import decks from `.kartex` text files or `.kartex.zip` bundles with media
- Deck sharing between users; public explore page
- PWA-installable (Add to Home Screen, offline app shell)
- Invite-only registration; admin user management
- Dark mode

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | yarn workspaces (yarn@4.15.0) |
| Frontend | React + Vite + TypeScript |
| UI Library | shadcn/ui (Radix UI + Tailwind CSS) |
| Backend | Hono (Node.js, TypeScript) — serves API + React SPA |
| ORM | Prisma |
| Database | PostgreSQL 16 |
| Deployment | Docker Compose (2 services: backend, db) |

## Prerequisites

- Docker and Docker Compose
- No other tools needed on the host (everything runs in containers)

## Quick Start

**1. Clone the repository**

```bash
git clone <repo-url>
cd kartex
```

**2. Copy the environment file**

```bash
cp .env.example .env
```

**3. Edit `.env` and set these four values**

```
JWT_SECRET=<generate with the command below>
DB_PASSWORD=<choose any strong password>
ADMIN_USERNAME=<username for the first admin account>
ADMIN_PASSWORD=<password for the first admin account>
```

Generate a secure `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`DB_PASSWORD` is only used inside the PostgreSQL container — choose any strong password.

**4. Start the application**

```bash
docker compose up -d
```

**5. Open the app**

Visit http://localhost:3000 in your browser.

**6. Log in**

Use the `ADMIN_USERNAME` and `ADMIN_PASSWORD` you set in `.env`.

## Configuration

All configuration is via environment variables in `.env`:

| Variable | Default / Example | Description |
|----------|-------------------|-------------|
| `DATABASE_URL` | `postgresql://kartex:changeme@db:5432/kartex` | PostgreSQL connection URL used by Prisma. For Docker Compose deployments the host is the service name (`db`). |
| `JWT_SECRET` | `change-this-to-a-long-random-secret` | JWT signing secret — must be a long random string (at least 32 characters). |
| `ADMIN_USERNAME` | `admin` | Initial admin account username (created on first startup if no admin exists). |
| `ADMIN_PASSWORD` | `change-this-admin-password` | Initial admin account password (created on first startup if no admin exists). |
| `ALLOWED_ORIGIN` | `http://localhost:3000` | Origin allowed for CORS. In a Docker Compose deployment the default fallback is `http://localhost:3000` (the port the SPA is served from). For local Vite dev use `http://localhost:5173`. In production set this to your full domain (e.g. `https://kartex.example.com`). |
| `BACKEND_PORT` | `3000` | Host port for the backend container. |
| `STORAGE_PATH` | `/app/media` | Absolute path inside the container where uploaded media files are stored. Mapped to a Docker volume — do not change without also updating the volume mount path. |
| `MAX_UPLOAD_BYTES` | `10485760` | Maximum upload file size in bytes (default: 10 MB). |

## Architecture

The Hono backend serves both the REST API (`/api/*`) and the React SPA static files from a single Node.js container on port 3000. PostgreSQL 16 stores all application data. Media files (images, audio) are stored on a Docker volume at `/app/media`.

## Documentation

- [Architecture & Design](docs/design.md) — full data model, auth flow, API overview
- [Kartex Format Reference](docs/kartex-format.md) — `.kartex` file format spec for deck import/export
