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

// 2. Mock api module — vi.hoisted ensures mockApiGet / mockApiPatch are available inside factory
const { mockApiGet, mockApiPatch } = vi.hoisted(() => {
  return {
    mockApiGet: vi.fn(),
    mockApiPatch: vi.fn(),
  }
})
vi.mock('@/lib/api', () => ({
  api: {
    get: mockApiGet,
    patch: mockApiPatch,
    delete: vi.fn(),
  },
}))

// 3. Mock sonner toast
vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

// No AuthContext mock — DecksPage does not import useAuth

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
