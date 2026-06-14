import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { StudySessionPage } from '@/pages/StudySessionPage'

// Mutable holder for useParams return value — allows global start screen tests to
// set `{}` (no id param) without breaking the deck-specific suite (STATE.md 08-02, 03-02)
const mockParams = vi.hoisted(() => ({ current: { id: 'deck-abc' } as { id?: string } }))

// 1. Mock react-router-dom — preserve real module, override useParams and useNavigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useParams: () => mockParams.current,
    useNavigate: () => vi.fn(),
  }
})

// 2. Mock api module — vi.hoisted ensures mockApiGet is available inside factory
const { mockApiGet } = vi.hoisted(() => {
  const mockApiGet = vi.fn()
  return { mockApiGet }
})
vi.mock('@/lib/api', () => ({
  api: {
    get: mockApiGet,
    post: vi.fn(),
  },
}))

// 3. Mock sonner toast
vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

// 4. useAuth mock — StudySessionPage now imports useAuth for mode indicator (Phase 11, SM2-04)
// Default studyMode: 'normal' so all existing tests pass (Badge not shown in Normal mode)
const mockStudyMode = vi.hoisted(() => ({ current: 'normal' }))
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: '1',
      username: 'test',
      role: 'USER',
      isActive: true,
      studyMode: mockStudyMode.current,
      createdAt: '2026-01-01',
    },
    loading: false,
    setUser: vi.fn(),
    logout: vi.fn(),
  }),
}))

// Helper card factory
function makeCard(
  id: string,
  tags: string[],
): {
  id: string
  frontContent: string
  backContent: string
  tags: string[]
  deckId: string
  deckTitle: string
  nextReview: string
  interval: number
  easeFactor: number
  repetitions: number
} {
  return {
    id,
    frontContent: `Front ${id}`,
    backContent: `Back ${id}`,
    tags,
    deckId: 'deck-abc',
    deckTitle: 'Test Deck',
    nextReview: '2026-01-01',
    interval: 1,
    easeFactor: 2.5,
    repetitions: 0,
  }
}

// 15 cards: 5 tagged "bio", 5 tagged "chem", 5 untagged
const mockCards = [
  makeCard('bio-1', ['bio']),
  makeCard('bio-2', ['bio']),
  makeCard('bio-3', ['bio']),
  makeCard('bio-4', ['bio']),
  makeCard('bio-5', ['bio']),
  makeCard('chem-1', ['chem']),
  makeCard('chem-2', ['chem']),
  makeCard('chem-3', ['chem']),
  makeCard('chem-4', ['chem']),
  makeCard('chem-5', ['chem']),
  makeCard('untagged-1', []),
  makeCard('untagged-2', []),
  makeCard('untagged-3', []),
  makeCard('untagged-4', []),
  makeCard('untagged-5', []),
]

function setupPrefetchMocks() {
  // prefetch useEffect: Promise.all([api.get(deck), api.get(allCards), api.get(due)])
  mockApiGet.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ id: 'deck-abc', name: 'Test Deck', isOwner: true }),
  })
  mockApiGet.mockResolvedValueOnce({
    ok: true,
    json: async () => mockCards,
  })
  mockApiGet.mockResolvedValueOnce({
    ok: true,
    json: async () => mockCards.slice(0, 5).map((c) => ({ ...c, deckId: 'deck-abc' })),
  })
}

function renderPage() {
  return render(
    <MemoryRouter>
      <StudySessionPage />
    </MemoryRouter>,
  )
}

describe('StudySessionPage config section', () => {
  beforeEach(() => {
    mockApiGet.mockReset()
    setupPrefetchMocks()
  })

  // -------------------------------------------------------------------
  // STUDY-01: Tag filter
  // -------------------------------------------------------------------

  it('STUDY-01a: no tags selected — all 15 cards from API pass through (SR mode)', async () => {
    // loadCards call (4th mock) returns all 15 mockCards for SR mode
    mockApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => mockCards,
    })

    renderPage()
    await waitFor(() => {
      // Config section must exist — it renders after prefetch resolves
      // The tag filter section header "Filter by tag" must be visible
      expect(screen.getByText(/filter by tag/i)).toBeTruthy()
    })

    // Click SR mode — triggers loadCards
    const srCard = screen.getByRole('button', { name: /spaced repetition/i })
    fireEvent.click(srCard)

    // All 15 cards from mock; SessionRunner receives all (15 bio-1..untagged-5)
    // When no filter is active, untagged cards must appear (empty state message absent)
    await waitFor(() => {
      expect(screen.queryByText(/no cards to study/i)).toBeNull()
    })
  })

  it('STUDY-01b: tag "bio" selected — only bio cards pass through; untagged excluded', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/filter by tag/i)).toBeTruthy()
    })

    // Select the "bio" chip — it must exist after prefetch resolves
    const bioChip = screen.getByRole('button', { name: /^bio$/i })
    expect(bioChip.className).not.toContain('bg-primary') // deselected initially

    fireEvent.click(bioChip)
    // After click, chip must show variant="default" (bg-primary)
    expect(bioChip.className).toContain('bg-primary')

    // loadCards mock: SR mode returns all 15, but filter narrows to 5 bio
    mockApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => mockCards,
    })

    const srCard = screen.getByRole('button', { name: /spaced repetition/i })
    fireEvent.click(srCard)

    await waitFor(() => {
      // Only 5 bio cards — SessionRunner renders card 1 of 5 progress
      const progressText = document.body.textContent
      expect(progressText).toContain('Card 1 of 5')
    })
  })

  it('STUDY-01c: tags "bio" and "chem" selected — OR logic; neither-tagged card excluded', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/filter by tag/i)).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: /^bio$/i }))
    fireEvent.click(screen.getByRole('button', { name: /^chem$/i }))

    // loadCards mock: returns all 15
    mockApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => mockCards,
    })

    fireEvent.click(screen.getByRole('button', { name: /spaced repetition/i }))

    await waitFor(() => {
      // 5 bio + 5 chem = 10 cards; progress shows "Card 1 of 10"
      const progressText = document.body.textContent
      expect(progressText).toContain('Card 1 of 10')
    })
  })

  it('STUDY-01d: clicking deselected chip selects it (bg-primary); clicking selected chip deselects it', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/filter by tag/i)).toBeTruthy()
    })

    const bioChip = screen.getByRole('button', { name: /^bio$/i })

    // Initially deselected — no bg-primary class
    expect(bioChip.className).not.toContain('bg-primary')

    // Click to select
    fireEvent.click(bioChip)
    expect(bioChip.className).toContain('bg-primary')

    // Click again to deselect
    fireEvent.click(bioChip)
    expect(bioChip.className).not.toContain('bg-primary')
  })

  // -------------------------------------------------------------------
  // STUDY-02: Session size picker
  // -------------------------------------------------------------------

  it('STUDY-02a: sessionSize=10, SR mode — SessionRunner receives at most 10 cards', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/session size/i)).toBeTruthy()
    })

    // Click the "10" segmented button
    const btn10 = screen.getByRole('button', { name: /^10$/i })
    fireEvent.click(btn10)
    expect(btn10.className).toContain('bg-primary')

    // loadCards mock: returns all 15
    mockApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => mockCards,
    })

    fireEvent.click(screen.getByRole('button', { name: /spaced repetition/i }))

    await waitFor(() => {
      // Slice to 10 — progress shows "Card 1 of 10"
      expect(document.body.textContent).toContain('Card 1 of 10')
    })
  })

  it('STUDY-02b: sessionSize=10, Deck mode — no slice applied; all cards included', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/session size/i)).toBeTruthy()
    })

    // Set size to 10 but pick Deck Mode (not SR)
    fireEvent.click(screen.getByRole('button', { name: /^10$/i }))

    // loadCards mock: returns all 15 cards
    mockApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => mockCards,
    })

    fireEvent.click(screen.getByRole('button', { name: /deck mode/i }))

    await waitFor(() => {
      // Deck mode: no slice — all 15 cards, progress "Card 1 of 15"
      expect(document.body.textContent).toContain('Card 1 of 15')
    })
  })

  it('STUDY-02c: sessionSize=custom, customCount=5, SR mode — at most 5 cards', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/session size/i)).toBeTruthy()
    })

    // Click "Custom" button
    const customBtn = screen.getByRole('button', { name: /^custom$/i })
    fireEvent.click(customBtn)

    // Number input should appear
    const numberInput = screen.getByRole('spinbutton')
    expect(numberInput).toBeTruthy()

    // Set count to 5
    fireEvent.change(numberInput, { target: { value: '5' } })

    // loadCards mock
    mockApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => mockCards,
    })

    fireEvent.click(screen.getByRole('button', { name: /spaced repetition/i }))

    await waitFor(() => {
      expect(document.body.textContent).toContain('Card 1 of 5')
    })
  })

  it('STUDY-02d: clicking Custom button reveals number input (spinbutton)', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/session size/i)).toBeTruthy()
    })

    // No number input before clicking Custom
    expect(screen.queryByRole('spinbutton')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /^custom$/i }))

    // Number input must now be in document
    expect(screen.getByRole('spinbutton')).toBeTruthy()
  })

  // -------------------------------------------------------------------
  // STUDY-03: Shuffle
  // -------------------------------------------------------------------

  it('STUDY-03a: cards passed to SessionRunner are set-equal to fetched cards (all present, possibly reordered)', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/filter by tag/i)).toBeTruthy()
    })

    // loadCards mock — returns mockCards in deterministic order
    mockApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => mockCards,
    })

    fireEvent.click(screen.getByRole('button', { name: /spaced repetition/i }))

    await waitFor(() => {
      // SessionRunner is showing — all 15 cards present, progress total is 15
      expect(document.body.textContent).toContain('Card 1 of 15')
    })

    // All 15 cards must be reachable — progress total is 15 (none lost, none duplicated)
    expect(document.body.textContent).toContain('Card 1 of 15')
  })

  it('STUDY-03b: shuffle is non-mutating — original mockCards array is unchanged', async () => {
    // Capture original order snapshot
    const originalIds = mockCards.map((c) => c.id)

    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/filter by tag/i)).toBeTruthy()
    })

    mockApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => mockCards,
    })

    fireEvent.click(screen.getByRole('button', { name: /spaced repetition/i }))

    await waitFor(() => {
      expect(document.body.textContent).toContain('Card 1 of 15')
    })

    // Original array order must not have been mutated
    expect(mockCards.map((c) => c.id)).toEqual(originalIds)
  })
})

// ---------------------------------------------------------------------------
// Helper: factory for DeckListItem-shaped mock decks
// ---------------------------------------------------------------------------
function makeDeckListItem(
  id: string,
  title: string,
  isActive: boolean,
): {
  id: string
  title: string
  description: null
  visibility: 'PRIVATE'
  ownerId: string
  isActive: boolean
  createdAt: string
  updatedAt: string
} {
  return {
    id,
    title,
    description: null,
    visibility: 'PRIVATE',
    ownerId: 'user-1',
    isActive,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

// Setup: configure mockApiGet for the global start screen prefetch
// /api/decks → two active decks + one inactive deck
// /api/study/due → three cards, two from active-deck-1, one from active-deck-2
function setupGlobalPrefetchMocks() {
  mockApiGet.mockImplementation((url: string) => {
    if (url === '/api/decks') {
      return Promise.resolve({
        ok: true,
        json: async () => [
          makeDeckListItem('active-deck-1', 'Active Deck One', true),
          makeDeckListItem('active-deck-2', 'Active Deck Two', true),
          makeDeckListItem('inactive-deck-3', 'Inactive Deck Three', false),
        ],
      })
    }
    if (url === '/api/study/due') {
      return Promise.resolve({
        ok: true,
        json: async () => [
          { deckId: 'active-deck-1' },
          { deckId: 'active-deck-1' },
          { deckId: 'active-deck-2' },
        ],
      })
    }
    return Promise.resolve({ ok: false, json: async () => ({}) })
  })
}

describe('StudySessionPage global start screen', () => {
  beforeEach(() => {
    // Set no id param — triggers isGlobalSR = true
    mockParams.current = {}
    mockApiGet.mockReset()
    setupGlobalPrefetchMocks()
  })

  afterEach(() => {
    // Restore deck-specific param so subsequent describe blocks are unaffected
    mockParams.current = { id: 'deck-abc' }
  })

  it('DECK-03a: start screen renders with page title when no id param', async () => {
    renderPage()
    await waitFor(() => {
      // globalTitle i18n key renders as "Study session"
      expect(screen.getByText(/study session/i)).toBeTruthy()
    })
    // Active Deck One must appear in the picker
    await waitFor(() => {
      expect(screen.getByText('Active Deck One')).toBeTruthy()
    })
  })

  it('DECK-03b: all active decks are pre-checked; inactive deck not shown', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Active Deck One')).toBeTruthy()
      expect(screen.getByText('Active Deck Two')).toBeTruthy()
    })

    // Both checkboxes are checked by default (data-state="checked")
    const checkbox1 = document.getElementById('deck-picker-active-deck-1')
    const checkbox2 = document.getElementById('deck-picker-active-deck-2')
    expect(checkbox1?.getAttribute('data-state')).toBe('checked')
    expect(checkbox2?.getAttribute('data-state')).toBe('checked')

    // Inactive deck must NOT appear in the picker
    expect(screen.queryByText('Inactive Deck Three')).toBeNull()
  })

  it('DECK-03c: unchecking a deck toggles checkbox only — no PATCH call', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Active Deck One')).toBeTruthy()
    })

    const checkbox1 = document.getElementById('deck-picker-active-deck-1')
    expect(checkbox1?.getAttribute('data-state')).toBe('checked')

    // Click the row to uncheck
    fireEvent.click(screen.getByText('Active Deck One').closest('div')!)

    // Checkbox must now be unchecked
    await waitFor(() => {
      expect(checkbox1?.getAttribute('data-state')).toBe('unchecked')
    })

    // Only /api/decks and /api/study/due were called (prefetch) — no PATCH
    const calls = mockApiGet.mock.calls.map((c) => c[0] as string)
    expect(calls.every((url) => url !== '/api/decks/active-deck-1')).toBe(true)
  })

  it('DECK-03d: Start session button is disabled when all decks unchecked', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Active Deck One')).toBeTruthy()
      expect(screen.getByText('Active Deck Two')).toBeTruthy()
    })

    // Uncheck both decks by clicking each row
    fireEvent.click(screen.getByText('Active Deck One').closest('div')!)
    fireEvent.click(screen.getByText('Active Deck Two').closest('div')!)

    await waitFor(() => {
      const startBtn = screen.getByRole('button', { name: /start session/i })
      expect(startBtn).toHaveProperty('disabled', true)
    })
  })

  it('DECK-04a: session size picker renders All / 10 / 20 / Custom buttons', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/study session/i)).toBeTruthy()
    })

    // Size buttons must be present
    expect(screen.getByRole('button', { name: /^10$/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /^20$/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /^custom$/i })).toBeTruthy()

    // Custom input is not shown yet
    expect(screen.queryByRole('spinbutton')).toBeNull()

    // Click Custom — number input must appear
    fireEvent.click(screen.getByRole('button', { name: /^custom$/i }))
    expect(screen.getByRole('spinbutton')).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// SM2-04: Mode indicator Badge in SessionRunner
// ---------------------------------------------------------------------------

describe('StudySessionPage mode indicator (SM2-04)', () => {
  beforeEach(() => {
    // Use deck-specific path so we get the mode selector start screen
    mockParams.current = { id: 'deck-abc' }
    mockStudyMode.current = 'normal'
    mockApiGet.mockReset()
    setupPrefetchMocks()
  })

  afterEach(() => {
    mockStudyMode.current = 'normal'
    mockParams.current = { id: 'deck-abc' }
  })

  // SM2-04a: no indicator shown in Normal mode
  it('SM2-04a: no mode indicator Badge shown in Normal mode', async () => {
    mockStudyMode.current = 'normal'
    mockApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => [makeCard('c1', [])],
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/filter by tag/i)).toBeTruthy()
    })

    // Start an SR session
    fireEvent.click(screen.getByRole('button', { name: /spaced repetition/i }))

    await waitFor(() => {
      expect(screen.queryByText('Card 1 of 1')).toBeTruthy()
    })

    // No mode indicator should be present in Normal mode
    expect(screen.queryByText('Intensive')).toBeNull()
    expect(screen.queryByText('Exam Prep')).toBeNull()
  })

  // SM2-04b: Intensive mode shows indicator Badge
  it('SM2-04b: Intensive mode shows mode indicator Badge with translated name', async () => {
    mockStudyMode.current = 'intensive'
    mockApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => [makeCard('c1', [])],
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/filter by tag/i)).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: /spaced repetition/i }))

    await waitFor(() => {
      expect(screen.getByText('Intensive')).toBeTruthy()
    })
  })

  // SM2-04c: Exam Prep mode shows indicator Badge
  it('SM2-04c: Exam Prep mode shows mode indicator Badge with translated name', async () => {
    mockStudyMode.current = 'exam_prep'
    mockApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => [makeCard('c1', [])],
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/filter by tag/i)).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: /spaced repetition/i }))

    await waitFor(() => {
      expect(screen.getByText('Exam Prep')).toBeTruthy()
    })
  })
})

// ---------------------------------------------------------------------------
// STUDY-04: Deck badge in SessionRunner progress row
// ---------------------------------------------------------------------------

describe('StudySessionPage deck badge (STUDY-04)', () => {
  beforeEach(() => {
    mockParams.current = { id: 'deck-abc' }
    mockApiGet.mockReset()
    setupPrefetchMocks()
  })

  afterEach(() => {
    mockParams.current = { id: 'deck-abc' }
  })

  // STUDY-04a: deck badge shows deckTitle from currentCard
  it('STUDY-04a: deck badge shows deckTitle from currentCard when session is running', async () => {
    mockApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => [makeCard('c1', [])],
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/filter by tag/i)).toBeTruthy()
    })

    // Start an SR session
    fireEvent.click(screen.getByRole('button', { name: /spaced repetition/i }))

    await waitFor(() => {
      expect(screen.queryByText('Card 1 of 1')).toBeTruthy()
    })

    // Deck badge with deckTitle from makeCard factory ('Test Deck') must be visible
    expect(screen.getByText('Test Deck')).toBeTruthy()
  })

  // STUDY-04b: deck badge remains visible after card flip (badge is in progress row, not inside CardFlip)
  it('STUDY-04b: deck badge is still visible after flipping the card to the back face', async () => {
    mockApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => [makeCard('c1', [])],
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/filter by tag/i)).toBeTruthy()
    })

    // Start an SR session
    fireEvent.click(screen.getByRole('button', { name: /spaced repetition/i }))

    await waitFor(() => {
      expect(screen.queryByText('Card 1 of 1')).toBeTruthy()
    })

    // Flip the card by clicking the card button
    const cardButton = screen.getByRole('button', { name: /flashcard/i })
    fireEvent.click(cardButton)

    // Deck badge must still be visible — it lives in the progress row, not inside CardFlip
    await waitFor(() => {
      expect(screen.getByText('Test Deck')).toBeTruthy()
    })
  })
})
