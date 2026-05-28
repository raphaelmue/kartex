# Requirements: Kartex

**Defined:** 2026-05-25
**Core Value:** A user can open their dashboard, see their due cards, and complete a spaced-repetition study session — that loop must always work.

## v1 Requirements

### Authentication (AUTH)

- [ ] **AUTH-01**: User can register with a username and password using a valid invite code (no open sign-up)
- [ ] **AUTH-02**: User can log in with username and password and receive a JWT stored in an httpOnly cookie
- [ ] **AUTH-03**: User session persists across browser refresh via refresh token (30-day validity)
- [ ] **AUTH-04**: User can log out, invalidating their session
- [ ] **AUTH-05**: Access token (15-min) is transparently refreshed via refresh token endpoint

### Admin (ADMN)

- [ ] **ADMN-01**: Admin can generate one-time invite codes for new user registration
- [ ] **ADMN-02**: Admin can view the list of all users and their roles
- [ ] **ADMN-03**: Admin can change a user's role (admin / user) or deactivate an account

### Deck Management (DECK)

- [ ] **DECK-01**: User can create a deck with a title and optional description
- [ ] **DECK-02**: User can view all their own decks on the decks page
- [ ] **DECK-03**: User can edit a deck's title and description
- [ ] **DECK-04**: User can delete a deck (and all its cards and progress)
- [ ] **DECK-05**: User can set deck visibility: private, shared (specific users), or public (explore page)

### Card Management (CARD)

- [ ] **CARD-01**: User can create a card in a deck with front and back content (Kartex format)
- [ ] **CARD-02**: User can edit an existing card's front, back, or tags
- [ ] **CARD-03**: User can delete a card from a deck
- [ ] **CARD-04**: User can add freeform tags to a card
- [ ] **CARD-05**: Card content renders Markdown text (via react-markdown)
- [ ] **CARD-06**: Card content renders inline math expressions (`$...$`) via KaTeX
- [ ] **CARD-07**: Card content renders block math expressions (`$$...$$`) via KaTeX
- [ ] **CARD-08**: Card content renders `#typst` blocks via Typst WASM (typst.ts)
- [x] **CARD-09**: Card content renders inline images (PNG, JPEG, WebP, GIF) from uploaded media
- [x] **CARD-10**: Card content renders audio files (MP3, OGG, WAV) with a native HTML audio player
- [x] **CARD-11**: Card content renders external video links (YouTube, Vimeo) as embedded players
- [ ] **CARD-12**: Card content renders fenced code blocks with syntax highlighting (highlight.js)

### Study & Learning (STDY)

- [x] **STDY-01**: User can start a spaced repetition session showing all cards due today across all decks (SM-2)
- [x] **STDY-02**: During a study session, each card flip is followed by a 4-key recall rating (1=Again, 2=Hard, 3=Good, 4=Easy)
- [x] **STDY-03**: SM-2 algorithm updates ease factor, interval, and next review date for each rating
- [x] **STDY-04**: User can start a deck mode session (all cards in one deck, sequentially; SM-2 progress saved)
- [x] **STDY-05**: User can start an exam mode session (time limit; SM-2 progress not saved)
- [x] **STDY-06**: Dashboard shows all cards due today across all decks with a count per deck
- [x] **STDY-07**: Dashboard shows study statistics: total cards reviewed today, current study streak

### Import (.kartex) (IMPT)

- [ ] **IMPT-01**: User can upload a `.kartex` file on the import page and see a preview of parsed cards before importing
- [ ] **IMPT-02**: User can upload a `.kartex.zip` bundle (deck.kartex + media/ folder) with preview before importing
- [ ] **IMPT-03**: Importing creates a new deck and all cards from the parsed `.kartex` file
- [ ] **IMPT-04**: Importing a `.kartex.zip` bundle stores bundled media files and links them to the created cards
- [ ] **IMPT-05**: Import preview renders card content using the Kartex renderer (Markdown, math, Typst)

### Media Storage (MDIA)

- [ ] **MDIA-01**: Images (PNG, JPEG, WebP, GIF) can be uploaded and are stored on the backend's local Docker volume
- [ ] **MDIA-02**: Audio files (MP3, OGG, WAV) can be uploaded and are stored on the backend's local Docker volume
- [ ] **MDIA-03**: All file uploads are validated by both MIME type header and magic bytes (first bytes of file)
- [ ] **MDIA-04**: Maximum upload file size is configurable via environment variable (default: 10 MB)

### Sharing & Collaboration (SHAR)

- [ ] **SHAR-01**: Deck owner can share a deck with a specific user granting READ or EDIT permission
- [ ] **SHAR-02**: Deck owner can revoke a user's access to a shared deck
- [ ] **SHAR-03**: Deck owner can make a deck public so it appears on the explore page
- [ ] **SHAR-04**: Any logged-in user can browse public decks on the /explore page
- [ ] **SHAR-05**: User can fork a public or shared deck into their own collection to edit it independently
- [ ] **SHAR-06**: Each user's SM-2 learning progress is stored independently (progress is never shared between users)

### Infrastructure (INFR)

- [ ] **INFR-01**: Full application runs with `docker compose up -d` after setting JWT_SECRET and DB_PASSWORD in `.env`
- [ ] **INFR-02**: Nginx serves the React SPA (static files) and reverse-proxies `/api/*` requests to the Hono backend
- [ ] **INFR-03**: All API endpoints except `/api/auth/login` and `/api/auth/refresh` require a valid JWT
- [ ] **INFR-04**: Rate limiting middleware is applied to authentication endpoints (login, register, refresh)
- [ ] **INFR-05**: CORS is restricted to own domain only (no wildcard)
- [ ] **INFR-06**: All secrets (JWT_SECRET, DB_PASSWORD) are sourced from `.env` only — no hardcoded values

---

## v2 Requirements

Deferred to a future release. Not in the current roadmap.

### AI Integration

- **AI-01**: User can upload a study script or document; system generates a `.kartex` deck via Claude API
- **AI-02**: LLM prompt template (defined in design doc) is used for card generation
- **AI-03**: Generated deck is previewed in import UI before saving

### Offline & PWA

- **PWA-01**: Service worker caches already-loaded decks for offline study
- **PWA-02**: App can be installed as a PWA on desktop and mobile

### Enterprise Auth

- **OIDC-01**: Admin can configure OIDC provider for federated login
- **LDAP-01**: Admin can configure LDAP directory for user authentication

### Advanced Statistics

- **STAT-01**: User can view per-deck learning curves (retention rate over time)
- **STAT-02**: User can view per-card retention rate and difficulty history
- **STAT-03**: User can see a heatmap of study activity (GitHub-style)

### AI Quiz Mode

- **QUIZ-01**: User can start a multiple-choice quiz session (AI-generated distractors)
- **QUIZ-02**: Quiz results are stored separately from SM-2 progress

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Open sign-up | Invite-only by design; prevents unauthorized access on self-hosted instance |
| AI card generation | v2 feature; requires Claude API integration |
| Offline / PWA | Not needed for 2-5 user local deployment in v1 |
| OIDC / LDAP | Overkill for 2-5 user self-hosted setup; may be added for institutional deployments |
| Self-hosted video storage | Unnecessary complexity; external YouTube/Vimeo links are sufficient |
| Advanced analytics / charts | Dashboard basics in scope; deep retention analytics deferred to v2 |
| AI-generated multiple choice quiz | Requires AI integration; manual exam mode (time limit) is in scope |
| Real-time collaborative editing | High complexity, not needed for small-group use case |
| Mobile native app | Web-first (React SPA); mobile browser works |

---

## Traceability

*Populated by roadmapper — updated during roadmap creation.*

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| AUTH-05 | Phase 1 | Pending |
| ADMN-01 | Phase 1 | Pending |
| ADMN-02 | Phase 1 | Pending |
| ADMN-03 | Phase 1 | Pending |
| DECK-01 | Phase 2 | Pending |
| DECK-02 | Phase 2 | Pending |
| DECK-03 | Phase 2 | Pending |
| DECK-04 | Phase 2 | Pending |
| DECK-05 | Phase 2 | Pending |
| CARD-01 | Phase 2 | Pending |
| CARD-02 | Phase 2 | Pending |
| CARD-03 | Phase 2 | Pending |
| CARD-04 | Phase 2 | Pending |
| CARD-05 | Phase 2 | Pending |
| CARD-06 | Phase 3 | Pending |
| CARD-07 | Phase 3 | Pending |
| CARD-08 | Phase 3 | Pending |
| CARD-09 | Phase 3 | Complete (03-03) |
| CARD-10 | Phase 3 | Complete (03-03) |
| CARD-11 | Phase 3 | Complete (03-03) |
| CARD-12 | Phase 3 | Pending |
| STDY-01 | Phase 4 | Complete (04-01) |
| STDY-02 | Phase 4 | Complete (04-01) |
| STDY-03 | Phase 4 | Complete (04-01) |
| STDY-04 | Phase 4 | Complete (04-01) |
| STDY-05 | Phase 4 | Complete (04-01) |
| STDY-06 | Phase 4 | Complete (04-01) |
| STDY-07 | Phase 4 | Complete (04-01) |
| IMPT-01 | Phase 5 | Pending |
| IMPT-02 | Phase 5 | Pending |
| IMPT-03 | Phase 5 | Pending |
| IMPT-04 | Phase 5 | Pending |
| IMPT-05 | Phase 5 | Pending |
| MDIA-01 | Phase 5 | Pending |
| MDIA-02 | Phase 5 | Pending |
| MDIA-03 | Phase 5 | Pending |
| MDIA-04 | Phase 5 | Pending |
| SHAR-01 | Phase 6 | Pending |
| SHAR-02 | Phase 6 | Pending |
| SHAR-03 | Phase 6 | Pending |
| SHAR-04 | Phase 6 | Pending |
| SHAR-05 | Phase 6 | Pending |
| SHAR-06 | Phase 6 | Pending |
| INFR-01 | Phase 1 | Pending |
| INFR-02 | Phase 1 | Pending |
| INFR-03 | Phase 1 | Pending |
| INFR-04 | Phase 1 | Pending |
| INFR-05 | Phase 1 | Pending |
| INFR-06 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 53 total
- Mapped to phases: 53 ✓
- Unmapped: 0

---
*Requirements defined: 2026-05-25*
*Last updated: 2026-05-25 after roadmap creation (6 phases)*
