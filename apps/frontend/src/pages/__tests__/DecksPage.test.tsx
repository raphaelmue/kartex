import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DecksPage } from '@/pages/DecksPage'

// 1. Mock react-router-dom — preserve real module, override useNavigate only
// (DecksPage has no route params — no useParams override needed)
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  }
})

// 2. Mock api module — vi.hoisted ensures mockApiGet / mockApiPatch / mockApiDelete are available inside factory
const { mockApiGet, mockApiPatch, mockApiDelete } = vi.hoisted(() => {
  return {
    mockApiGet: vi.fn(),
    mockApiPatch: vi.fn(),
    mockApiDelete: vi.fn(),
  }
})
vi.mock('@/lib/api', () => ({
  api: {
    get: mockApiGet,
    patch: mockApiPatch,
    delete: mockApiDelete,
  },
}))

// 3. Mock sonner toast
vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

// AuthContext mock required — DecksPage uses useAuth for user.id check (ownerId guard)
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', username: 'testuser', role: 'USER', isActive: true, studyMode: 'normal', createdAt: '2026-01-01' },
    loading: false,
    setUser: vi.fn(),
    logout: vi.fn(),
  }),
}))

// Helper deck factory
// isActive is not yet on DeckListItem schema (Plan 02 adds it), so we cast to any.
// Tests assert against the rendered switch state which Plan 03 will implement.
function makeDeck(id: string, isActive = true) {
  return {
    id,
    title: `Deck ${id}`,
    description: null,
    visibility: 'PRIVATE' as const,
    ownerId: 'user-1',
    isActive,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    _count: { cards: 3 },
    // No sharedByUsername — toggle is expected to render for owned decks
  } as unknown as import('@kartex/shared').DeckListItem & { isActive: boolean }
}

function makeLibraryDeck(id: string, isActive = true) {
  return {
    id,
    title: `Library Deck ${id}`,
    description: null,
    visibility: 'PUBLIC' as const,
    ownerId: 'other-user',
    isActive,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    _count: { cards: 5 },
    sharedByUsername: 'other-user',
  } as unknown as import('@kartex/shared').DeckListItem & { isActive: boolean }
}

function renderPage() {
  return render(
    <MemoryRouter>
      <DecksPage />
    </MemoryRouter>,
  )
}

describe('DecksPage isActive toggle', () => {
  beforeEach(() => {
    mockApiGet.mockReset()
    mockApiPatch.mockReset()

    // Default GET /api/decks returns two decks (one active, one inactive)
    mockApiGet.mockResolvedValue({
      ok: true,
      json: async () => [makeDeck('d1', true), makeDeck('d2', false)],
    })

    // Default PATCH succeeds
    mockApiPatch.mockResolvedValue({ ok: true })
  })

  it('DECK-01a: Switch renders checked when deck.isActive === true', async () => {
    // Render with a single active deck
    mockApiGet.mockResolvedValue({
      ok: true,
      json: async () => [makeDeck('d1', true)],
    })

    renderPage()

    // Wait for deck list to load, then assert the switch exists and is checked
    const switchEl = await screen.findByRole('switch', { name: /toggle deck active/i })
    expect(
      switchEl.getAttribute('aria-checked') === 'true' ||
        switchEl.getAttribute('data-state') === 'checked',
    ).toBe(true)
  })

  it('DECK-01b: Switch renders unchecked when deck.isActive === false', async () => {
    mockApiGet.mockResolvedValue({
      ok: true,
      json: async () => [makeDeck('d2', false)],
    })

    renderPage()

    const switchEl = await screen.findByRole('switch', { name: /toggle deck active/i })
    expect(
      switchEl.getAttribute('aria-checked') === 'false' ||
        switchEl.getAttribute('data-state') === 'unchecked',
    ).toBe(true)
  })

  it('DECK-01c: PATCH called with { isActive: false } when toggled off', async () => {
    mockApiGet.mockResolvedValue({
      ok: true,
      json: async () => [makeDeck('d1', true)],
    })

    renderPage()

    const switchEl = await screen.findByRole('switch', { name: /toggle deck active/i })
    fireEvent.click(switchEl)

    await waitFor(() => {
      expect(mockApiPatch).toHaveBeenCalledWith('/api/decks/d1', { isActive: false })
    })
  })

  it('DECK-01d: optimistic revert on PATCH failure; toast.error shown', async () => {
    // PATCH fails
    mockApiPatch.mockResolvedValue({ ok: false })

    mockApiGet.mockResolvedValue({
      ok: true,
      json: async () => [makeDeck('d1', true)],
    })

    const { toast } = await import('sonner')

    renderPage()

    const switchEl = await screen.findByRole('switch', { name: /toggle deck active/i })

    // Toggle off (click on active switch)
    fireEvent.click(switchEl)

    await waitFor(() => {
      // toast.error must have been called (failure path)
      expect(toast.error).toHaveBeenCalled()
    })

    await waitFor(() => {
      // Switch must revert back to checked (optimistic revert)
      expect(
        switchEl.getAttribute('aria-checked') === 'true' ||
          switchEl.getAttribute('data-state') === 'checked',
      ).toBe(true)
    })
  })
})

describe('DecksPage library deck toggle (LIB-01)', () => {
  beforeEach(() => {
    mockApiGet.mockReset()
    mockApiPatch.mockReset()
    mockApiPatch.mockResolvedValue({ ok: true })
  })

  it('LIB-01a: library Switch renders checked when deck.isActive === true', async () => {
    mockApiGet.mockResolvedValue({
      ok: true,
      json: async () => [makeLibraryDeck('d3', true)],
    })

    renderPage()

    const switchEl = await screen.findByRole('switch', { name: /toggle deck active/i })
    expect(switchEl.id).toContain('active-lib-')
    expect(
      switchEl.getAttribute('aria-checked') === 'true' ||
        switchEl.getAttribute('data-state') === 'checked',
    ).toBe(true)
  })

  it('LIB-01b: library Switch renders unchecked when deck.isActive === false', async () => {
    mockApiGet.mockResolvedValue({
      ok: true,
      json: async () => [makeLibraryDeck('d3', false)],
    })

    renderPage()

    const switchEl = await screen.findByRole('switch', { name: /toggle deck active/i })
    expect(
      switchEl.getAttribute('aria-checked') === 'false' ||
        switchEl.getAttribute('data-state') === 'unchecked',
    ).toBe(true)
  })

  it('LIB-01c: clicking library Switch calls api.patch with /library path', async () => {
    mockApiGet.mockResolvedValue({
      ok: true,
      json: async () => [makeLibraryDeck('d3', true)],
    })

    renderPage()

    const switchEl = await screen.findByRole('switch', { name: /toggle deck active/i })
    fireEvent.click(switchEl)

    await waitFor(() => {
      expect(mockApiPatch).toHaveBeenCalledWith('/api/decks/d3/library', { isActive: false })
    })
  })

  it('LIB-01d: on PATCH failure, library Switch reverts and toast.error is called', async () => {
    mockApiPatch.mockResolvedValue({ ok: false })

    mockApiGet.mockResolvedValue({
      ok: true,
      json: async () => [makeLibraryDeck('d3', true)],
    })

    const { toast } = await import('sonner')

    renderPage()

    const switchEl = await screen.findByRole('switch', { name: /toggle deck active/i })
    fireEvent.click(switchEl)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(
        switchEl.getAttribute('aria-checked') === 'true' ||
          switchEl.getAttribute('data-state') === 'checked',
      ).toBe(true)
    })
  })
})

describe('DecksPage library deck remove from library (LIB-02)', () => {
  beforeEach(() => {
    mockApiGet.mockReset()
    mockApiPatch.mockReset()
    mockApiDelete.mockReset()
    mockApiDelete.mockResolvedValue({ ok: true })
  })

  it('LIB-02a: library deck footer shows a More actions trigger (DropdownMenu)', async () => {
    mockApiGet.mockResolvedValue({
      ok: true,
      json: async () => [makeLibraryDeck('d4', true)],
    })

    renderPage()

    // Should render the MoreVertical trigger with aria-label "More actions"
    const trigger = await screen.findByRole('button', { name: /more actions/i })
    expect(trigger).toBeTruthy()
  })

  it('LIB-02b: clicking More actions reveals "Remove from library" item', async () => {
    mockApiGet.mockResolvedValue({
      ok: true,
      json: async () => [makeLibraryDeck('d4', true)],
    })

    renderPage()

    const trigger = await screen.findByRole('button', { name: /more actions/i })
    fireEvent.click(trigger)

    // The DropdownMenuItem "Remove from library" should be visible
    const removeItem = await screen.findByText('Remove from library')
    expect(removeItem).toBeTruthy()
  })

  it('LIB-02c: clicking "Remove from library" opens AlertDialog with correct title and body', async () => {
    mockApiGet.mockResolvedValue({
      ok: true,
      json: async () => [makeLibraryDeck('d4', true)],
    })

    renderPage()

    const trigger = await screen.findByRole('button', { name: /more actions/i })
    fireEvent.click(trigger)

    const removeItem = await screen.findByText('Remove from library')
    fireEvent.click(removeItem)

    // AlertDialog should appear with the title and body copy
    await screen.findByText('Remove from library?')
    await screen.findByText(/Your study progress for this deck will be preserved/)
  })

  it('LIB-02d: clicking destructive "Remove Deck" confirm calls api.delete with /library URL and removes deck from list', async () => {
    mockApiGet.mockResolvedValue({
      ok: true,
      json: async () => [makeLibraryDeck('d4', true)],
    })

    const { toast } = await import('sonner')

    renderPage()

    const trigger = await screen.findByRole('button', { name: /more actions/i })
    fireEvent.click(trigger)

    const removeItem = await screen.findByText('Remove from library')
    fireEvent.click(removeItem)

    // Confirm dialog shown — click "Remove Deck" button
    const confirmBtn = await screen.findByText('Remove Deck')
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(mockApiDelete).toHaveBeenCalledWith('/api/decks/d4/library')
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled()
    })

    // Deck card should be removed from the list
    await waitFor(() => {
      expect(screen.queryByText('Library Deck d4')).toBeNull()
    })
  })

  it('LIB-02e: owned deck (ownerId === user-1) does NOT show the Remove from library menu item', async () => {
    mockApiGet.mockResolvedValue({
      ok: true,
      json: async () => [makeDeck('d5', true)],
    })

    renderPage()

    // Wait for deck to load
    await screen.findByText('Deck d5')

    // The "More actions" trigger for owned deck should exist but no "Remove from library"
    const trigger = await screen.findByRole('button', { name: /more actions/i })
    fireEvent.click(trigger)

    // Should show Edit and Delete but NOT "Remove from library"
    await screen.findByText('Edit')
    await screen.findByText('Delete')
    expect(screen.queryByText('Remove from library')).toBeNull()
  })
})
