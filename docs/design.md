# Kartex – Self-Hosted Flashcard System
## Design Document v0.4

---

## 1. Project Goal

Self-hosted web application for creating, importing, and learning with multimedia flashcards. Optimized for exam preparation, deployable via Docker Compose, usable on desktop and mobile. Multi-user with deck sharing. AI integration is planned for a future version.

---

## 2. Tech Stack

| Layer         | Technology                               |
|---------------|------------------------------------------|
| Monorepo      | `pnpm workspaces`                        |
| Frontend      | React + Vite + TypeScript                |
| UI Library    | shadcn/ui (Radix UI + Tailwind CSS)      |
| Backend       | Hono (Node.js, TypeScript)               |
| ORM           | Prisma                                   |
| Database      | PostgreSQL 16                            |
| Proxy         | Nginx                                    |
| Shared Types  | `packages/shared` (Zod schemas)          |

### Why shadcn/ui?

shadcn/ui is not an npm package but a set of copy-paste components (Button, Dialog, Card, Tabs, etc.) that are copied directly into the project and customized freely. It is built on Radix UI (accessibility, keyboard navigation) + Tailwind CSS (styling). This gives full control over the design without fighting against a library.

### Why Hono for the backend?

- Fully TypeScript → shared types with the frontend
- Very lightweight, fast, minimal overhead
- Excellent DX: middleware, routing, validation out of the box
- Runs natively on Node.js (no vendor lock-in)
- For future AI features: the Anthropic SDK is available in TypeScript/JS

---

## 3. Monorepo Structure

```
kartex/
├── apps/
│   ├── frontend/                ← React + Vite + shadcn/ui
│   │   ├── src/
│   │   │   ├── components/      ← shadcn/ui components (copied & customized)
│   │   │   ├── pages/
│   │   │   ├── hooks/
│   │   │   └── lib/
│   │   └── vite.config.ts
│   └── backend/                 ← Hono API
│       ├── src/
│       │   ├── routes/
│       │   ├── middleware/
│       │   └── lib/
│       └── prisma/
│           └── schema.prisma
├── packages/
│   └── shared/                  ← Shared types & validation
│       └── src/
│           ├── schemas/         ← Zod schemas (Card, Deck, User ...)
│           └── types/           ← Derived TypeScript types
├── docker-compose.yml
├── pnpm-workspace.yaml
└── .env
```

The `shared` package is the **single source of truth** for all data types. Frontend and backend import the same Zod schemas — no type drift possible.

---

## 4. Architecture Overview

```
┌─────────────────────────────────────────────┐
│                  Browser                    │
│              (React SPA)                    │
└───────────────────┬─────────────────────────┘
                    │ HTTPS
┌───────────────────▼─────────────────────────┐
│              Nginx (Reverse Proxy)          │
│         TLS Termination, Static Files       │
└──────┬──────────────────────────────────────┘
       │ /api/*
┌──────▼──────────┐    ┌─────────────────────┐
│  Hono Backend   │    │   Local Volume       │
│  (Node.js/TS)   │    │   (Images, Audio)    │
└──────┬──────────┘    └─────────────────────┘
       │ Prisma
┌──────▼──────────┐
│   PostgreSQL    │
└─────────────────┘
```

### Services (Docker Compose)

| Service     | Image                | Purpose                     |
|-------------|----------------------|-----------------------------|
| `frontend`  | node (build) → nginx | React SPA, static serving   |
| `backend`   | node:22-slim         | REST API (Hono)             |
| `db`        | postgres:16          | Persistence (via Prisma)    |
| `proxy`     | nginx:alpine         | Reverse proxy, TLS          |

> Videos are embedded as external links (YouTube, Vimeo, etc.) — no self-hosted video storage needed. Images and audio are stored on a local volume.

---

## 5. Authentication

### Approach: Simple JWT Auth

- Registration via **invite code** (no open sign-up) or admin-only
- Login via **username + password** → JWT access token (15 min) + refresh token (30 days)
- Tokens stored in `httpOnly` cookie (XSS-safe)
- Password hashing with **bcrypt**
- Roles: `admin` and `user`

```
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
POST /api/auth/register   ← invite code or admin only
```

---

## 6. Data Model (Prisma Schema)

```prisma
model User {
  id             String        @id @default(cuid())
  username       String        @unique
  email          String        @unique
  hashedPassword String
  role           Role          @default(USER)
  createdAt      DateTime      @default(now())
  decks          Deck[]
  sharedDecks    DeckShare[]
  progress       CardProgress[]
}

model Deck {
  id          String      @id @default(cuid())
  owner       User        @relation(fields: [ownerId], references: [id])
  ownerId     String
  title       String
  description String?
  visibility  Visibility  @default(PRIVATE)
  cards       Card[]
  shares      DeckShare[]
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
}

model DeckShare {
  id               String     @id @default(cuid())
  deck             Deck       @relation(fields: [deckId], references: [id])
  deckId           String
  sharedWithUser   User       @relation(fields: [sharedWithUserId], references: [id])
  sharedWithUserId String
  permission       Permission @default(READ)
}

model Card {
  id           String         @id @default(cuid())
  deck         Deck           @relation(fields: [deckId], references: [id])
  deckId       String
  frontContent String         // Kartex format (Markdown + Typst)
  backContent  String         // Kartex format
  tags         String[]
  progress     CardProgress[]
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
}

model CardProgress {
  id           String    @id @default(cuid())
  user         User      @relation(fields: [userId], references: [id])
  userId       String
  card         Card      @relation(fields: [cardId], references: [id])
  cardId       String
  easeFactor   Float     @default(2.5)   // SM-2
  interval     Int       @default(1)     // days
  repetitions  Int       @default(0)
  nextReview   DateTime  @default(now())
  lastReviewed DateTime?
  @@unique([userId, cardId])
}

model Media {
  id          String   @id @default(cuid())
  ownerId     String
  filename    String
  mimeType    String
  storagePath String
  sizeBytes   Int
  createdAt   DateTime @default(now())
}

enum Role       { ADMIN USER }
enum Visibility { PRIVATE SHARED PUBLIC }
enum Permission { READ EDIT }
```

---

## 7. The Kartex Format (.kartex)

A custom, LLM-friendly text format for importing and exporting decks. Goal: a language model can produce a valid `.kartex` file directly from a study script.

### Spec

```
# Kartex Format v1
# Encoding: UTF-8

---
deck: Thermodynamics Basics
author: Jane Doe
tags: [physics, thermo, exam-2025]
---

:: card
front:
  What is the first law of thermodynamics?

back:
  The internal energy of a closed system is constant:
  $$\Delta U = Q + W$$
  - $Q$ = heat supplied
  - $W$ = work done on the system
tags: [laws, formula]
::

:: card
front:
  ![Carnot cycle diagram](media://carnot.png)
  Label the four phases.

back:
  1. Isothermal expansion (A→B)
  2. Adiabatic expansion (B→C)
  3. Isothermal compression (C→D)
  4. Adiabatic compression (D→A)
tags: [carnot, diagram]
::

:: card
front:
  Formula for the efficiency of a heat engine?

back:
  #typst
  $ eta = 1 - T_"cold" / T_"hot" $
  Maximum efficiency is achieved in the Carnot process.
tags: [formula, efficiency]
::
```

### Syntax Reference

| Element      | Syntax                       | Description                         |
|---|---|---|
| Deck header  | `--- ... ---`                | YAML block, once at the top         |
| Card start   | `:: card`                    | Delimiter                           |
| Card end     | `::`                         | Closing tag                         |
| Fields       | `front:` / `back:`           | Required fields                     |
| Tags         | `tags: [a, b]`               | Optional, per card                  |
| Inline math  | `$...$`                      | LaTeX/Typst syntax                  |
| Block math   | `$$...$$`                    | Centered math block                 |
| Typst block  | `#typst\n...`                | Full Typst for complex expressions  |
| Image        | `![alt](media://file.png)`   | Reference to bundled media          |
| Ext. video   | `[video](https://youtu.be/)` | External link, embedded as player   |
| Comment      | `# ...`                      | Ignored by the parser               |

### Import Bundle

```
my-deck.kartex.zip
├── deck.kartex
└── media/
    ├── carnot.png
    └── audio-example.mp3
```

### LLM Prompt Template (for future AI integration)

```
You are an assistant that creates flashcards from study material in Kartex Format v1.
Generate a complete Kartex deck from the text below.
Use $$...$$ for mathematical formulas, #typst for complex expressions.
Follow the Kartex v1 spec exactly.
Output only the contents of the .kartex file, nothing else.

[SCRIPT CONTENT]
```

---

## 8. Multimedia Flashcards

| Type   | Format                  | Rendering            |
|--------|-------------------------|----------------------|
| Text   | Markdown                | react-markdown       |
| Math   | LaTeX syntax (`$...$`)  | KaTeX                |
| Typst  | `#typst` block          | Typst WASM (typst.ts)|
| Image  | PNG, JPEG, WebP, GIF    | Inline               |
| Audio  | MP3, OGG, WAV           | Native audio player  |
| Video  | External link           | Embedded player      |
| Code   | Markdown code block     | highlight.js         |

---

## 9. Spaced Repetition (SM-2)

After each card the user rates their recall:

| Key | Rating       | Meaning              |
|-----|--------------|----------------------|
| `1` | Again (0)    | Did not know it      |
| `2` | Hard (3)     | Recalled with effort |
| `3` | Good (4)     | Recalled confidently |
| `4` | Easy (5)     | Recalled instantly   |

- `easeFactor` starts at 2.5 and adjusts per card
- `interval` grows exponentially on success
- Again → interval resets to 1 day
- Dashboard shows all cards due today across all decks

### Study Modes

| Mode              | Description                                  |
|-------------------|----------------------------------------------|
| Spaced Repetition | SM-2, due cards across all decks             |
| Deck Mode         | All cards in a deck, sequentially            |
| Exam Mode         | Time limit, progress not saved               |

---

## 10. Sharing & Multi-User

- Every user has their own decks (`visibility: PRIVATE`)
- Deck owners can share with specific users (READ/EDIT) or make public (PUBLIC)
- Learning progress is always stored **per user**
- **Fork**: users can copy a shared deck into their own collection and edit it freely

---

## 11. Frontend – Pages

```
/login
/dashboard            ← Cards due today, statistics
/decks                ← Own + shared decks
/decks/:id            ← Deck view, manage cards
/decks/:id/learn      ← Study mode
/explore              ← Browse public decks
/import               ← .kartex upload & preview
/settings             ← Account, theme
/admin                ← User management (admin only)
```

---

## 12. Docker Compose

```yaml
services:
  proxy:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/ssl:ro

  backend:
    build: ./apps/backend
    environment:
      - DATABASE_URL=postgresql://kartex:${DB_PASSWORD}@db:5432/kartex
      - JWT_SECRET=${JWT_SECRET}
      - STORAGE_PATH=/data/media
    volumes:
      - media_data:/data/media
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16
    volumes:
      - pg_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=kartex
      - POSTGRES_USER=kartex
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U kartex"]
      interval: 5s
      retries: 5

volumes:
  pg_data:
  media_data:
```

### Deployment

```bash
cp .env.example .env   # set JWT_SECRET and DB_PASSWORD
docker compose up -d
# Available at http://localhost
```

---

## 13. Security

- All API endpoints require a valid JWT (except `/api/auth/login`)
- File uploads: MIME + magic bytes validation, configurable max size
- Rate limiting on auth endpoints (Hono middleware)
- CORS: own domain only
- Secrets via `.env` only

---

## 14. Future Features (v2)

- **AI integration**: script upload → Claude API → generate Kartex file
- **Offline / PWA**: service worker for already-loaded decks
- **OIDC / LDAP**: for institutional deployments
- **Statistics**: learning curves, retention rate per deck
- **Quiz mode**: multiple choice, AI-generated
