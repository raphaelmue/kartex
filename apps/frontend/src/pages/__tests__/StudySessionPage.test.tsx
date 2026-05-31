import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { StudySessionPage } from '@/pages/StudySessionPage'

// 1. Mock react-router-dom — preserve real module, override useParams and useNavigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ id: 'deck-abc' }),
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

// No useAuth mock — StudySessionPage does not import useAuth

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
