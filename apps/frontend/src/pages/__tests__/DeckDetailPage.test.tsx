import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DeckDetailPage } from '@/pages/DeckDetailPage'
// groupCardsByFirstTag stub exists in Wave 0 — throws "not yet implemented".
// Real implementation will be created in Wave 2 (08-03-PLAN.md).
import { groupCardsByFirstTag } from '@/utils/groupCardsByFirstTag'

// 1. Mock AuthContext — DeckDetailPage imports useAuth
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      username: 'testuser',
      role: 'USER',
      isActive: true,
      createdAt: '2026-01-01',
    },
    loading: false,
    setUser: vi.fn(),
    logout: vi.fn(),
  }),
}))

// 2. Mock react-router-dom — preserve real module, override useParams and useNavigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ id: 'deck-abc' }),
    useNavigate: () => vi.fn(),
  }
})

// 3. Mock api module — vi.hoisted ensures mockApiGet is available inside factory
const { mockApiGet } = vi.hoisted(() => {
  const mockApiGet = vi.fn()
  return { mockApiGet }
})
vi.mock('@/lib/api', () => ({
  api: {
    get: mockApiGet,
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

// 4. Mock sonner toast
vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

// 5. Mock DeckUpdateModal — prevents it from triggering its own api calls in DeckDetailPage tests
vi.mock('@/components/DeckUpdateModal', () => ({ DeckUpdateModal: () => null }))

// Test card data
const cardBio = {
  id: 'c1',
  frontContent: 'Front bio',
  backContent: 'Back bio',
  tags: ['bio'],
  deckId: 'deck-abc',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
}

const cardChem = {
  id: 'c2',
  frontContent: 'Front chem',
  backContent: 'Back chem',
  tags: ['chem', 'bio'],
  deckId: 'deck-abc',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
}

const cardUntagged = {
  id: 'c3',
  frontContent: 'Front untagged',
  backContent: 'Back untagged',
  tags: [],
  deckId: 'deck-abc',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
}

// -------------------------------------------------------------------
// Block 1: groupCardsByFirstTag pure function tests (STUDY-04a, STUDY-04b)
// The stub throws "not yet implemented" — both tests fail RED.
// Wave 2 replaces the stub with real implementation to turn these GREEN.
// -------------------------------------------------------------------
describe('groupCardsByFirstTag (pure function)', () => {
  it('STUDY-04a: returns sections sorted alpha by tag, Untagged section last', () => {
    // When real: groupCardsByFirstTag([cardBio, cardChem, cardUntagged]) should return:
    // [{tag:'bio', cards:[cardBio]}, {tag:'chem', cards:[cardChem]}, {tag:'Untagged', cards:[cardUntagged]}]
    const result = groupCardsByFirstTag([cardBio, cardChem, cardUntagged])

    expect(result).toHaveLength(3)

    // "bio" section first (alphabetically)
    expect((result[0] as { tag: string }).tag).toBe('bio')
    expect((result[0] as { cards: unknown[] }).cards).toHaveLength(1)

    // "chem" section second (cardChem has tags ['chem', 'bio'] — first tag is 'chem')
    expect((result[1] as { tag: string }).tag).toBe('chem')
    expect((result[1] as { cards: unknown[] }).cards).toHaveLength(1)

    // "Untagged" section last
    expect((result[2] as { tag: string }).tag).toBe('Untagged')
    expect((result[2] as { cards: unknown[] }).cards).toHaveLength(1)
  })

  it('STUDY-04b: card with tags ["chem", "bio"] appears only in "chem" section (first tag wins)', () => {
    const result = groupCardsByFirstTag([cardBio, cardChem, cardUntagged])

    // cardChem has tags ['chem', 'bio'] — must be in 'chem' section, not 'bio'
    const chemSection = (result as { tag: string; cards: { id: string }[] }[]).find(
      (s) => s.tag === 'chem',
    )
    const bioSection = (result as { tag: string; cards: { id: string }[] }[]).find(
      (s) => s.tag === 'bio',
    )

    expect(chemSection).toBeDefined()
    expect(chemSection!.cards.some((c) => c.id === 'c2')).toBe(true)

    expect(bioSection).toBeDefined()
    // cardChem must NOT appear in bio section
    expect(bioSection!.cards.some((c) => c.id === 'c2')).toBe(false)
  })
})

// -------------------------------------------------------------------
// Block 2: DeckDetailPage tag filter bar rendering (STUDY-04c)
// Tests that DeckDetailPage renders tag filter buttons for each unique tag.
// Flat table design — no h3 section headers.
// -------------------------------------------------------------------
describe('DeckDetailPage tag section rendering', () => {
  beforeEach(() => {
    mockApiGet.mockReset()
  })

  it('STUDY-04c: renders tag filter buttons for each unique tag when deck has tagged cards', async () => {
    mockApiGet.mockImplementation((url: string) => {
      if (url === '/api/decks/deck-abc') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: 'deck-abc',
            title: 'Test Deck',
            description: null,
            visibility: 'PRIVATE',
            ownerId: 'other-user',
            userPermission: null,
            owner: null,
            shareCode: null,
            sharedBy: null,
          }),
        })
      }
      if (url === '/api/decks/deck-abc/cards') {
        return Promise.resolve({
          ok: true,
          json: async () => [cardBio, cardChem, cardUntagged],
        })
      }
      return Promise.resolve({ ok: false, json: async () => ({}) })
    })

    render(
      <MemoryRouter>
        <DeckDetailPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Test Deck')).toBeTruthy()
    })

    // Filter buttons for each unique tag should appear
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'bio' })).toBeTruthy()
      expect(screen.getByRole('button', { name: 'chem' })).toBeTruthy()
    })

    // No h3 section headers — flat table design
    expect(screen.queryByRole('heading', { level: 3, name: /bio/i })).toBeNull()
  })
})

// -------------------------------------------------------------------
// Block 3: "Update from file" button owner visibility (T-16-FE-07, T-16-FE-08)
// -------------------------------------------------------------------
describe('DeckDetailPage update from file button visibility', () => {
  beforeEach(() => {
    mockApiGet.mockReset()
  })

  it('T-16-FE-07: Update from file button visible when deck.ownerId === user.id', async () => {
    // user.id === 'user-1' (from AuthContext mock above)
    // Note: this test file uses real i18next (no vi.mock for react-i18next),
    // so the button renders the actual en.json translation: "Update from file"
    mockApiGet.mockImplementation((url: string) => {
      if (url === '/api/decks/deck-abc') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: 'deck-abc',
            title: 'Owner Deck',
            description: null,
            visibility: 'PRIVATE',
            ownerId: 'user-1',
            isActive: true,
            userPermission: null,
            owner: null,
            shareCode: null,
            sharedBy: null,
          }),
        })
      }
      if (url === '/api/decks/deck-abc/cards') {
        return Promise.resolve({
          ok: true,
          json: async () => [],
        })
      }
      if (url === '/api/decks/deck-abc/shares') {
        return Promise.resolve({
          ok: true,
          json: async () => [],
        })
      }
      return Promise.resolve({ ok: false, json: async () => ({}) })
    })

    render(
      <MemoryRouter>
        <DeckDetailPage />
      </MemoryRouter>,
    )

    await waitFor(() => screen.getByText('Update from file'))
    expect(screen.getByText('Update from file')).toBeInTheDocument()
  })

  it('T-16-FE-08: Update from file button absent when user is not owner', async () => {
    // ownerId !== user.id ('other-user' !== 'user-1')
    // Note: this test file uses real i18next; button text would be "Update from file" if rendered
    mockApiGet.mockImplementation((url: string) => {
      if (url === '/api/decks/deck-abc') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: 'deck-abc',
            title: 'Non-owner Deck',
            description: null,
            visibility: 'PRIVATE',
            ownerId: 'other-user',
            isActive: true,
            userPermission: null,
            owner: null,
            shareCode: null,
            sharedBy: null,
          }),
        })
      }
      if (url === '/api/decks/deck-abc/cards') {
        return Promise.resolve({
          ok: true,
          json: async () => [],
        })
      }
      return Promise.resolve({ ok: false, json: async () => ({}) })
    })

    render(
      <MemoryRouter>
        <DeckDetailPage />
      </MemoryRouter>,
    )

    await waitFor(() => screen.getByText('Non-owner Deck'))
    expect(screen.queryByText('Update from file')).not.toBeInTheDocument()
  })
})
