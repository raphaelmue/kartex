import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'

// Mock react-i18next: t returns key, with basic {{count}} interpolation
const mockT = vi.fn((key: string, opts?: { count?: number }) => {
  if (opts?.count !== undefined) {
    return key.replace('{{count}}', String(opts.count))
  }
  return key
})
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: mockT }),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn() } }))
vi.mock('@/lib/api', () => ({ api: { postForm: vi.fn() } }))

// Import AFTER mock setup
import { DeckUpdateModal } from '@/components/DeckUpdateModal'
import { api } from '@/lib/api'
import { toast } from 'sonner'

const mockApiPostForm = api.postForm as ReturnType<typeof vi.fn>
const mockToastSuccess = toast.success as ReturnType<typeof vi.fn>

describe('DeckUpdateModal (T-16-FE-01..T-16-FE-06)', () => {
  const defaultFile = new File(['front: A\n---\nback: B'], 'test.kartex')
  const defaultOnOpenChange = vi.fn()
  const defaultOnSuccess = vi.fn()
  const defaultProps = {
    open: true,
    onOpenChange: defaultOnOpenChange,
    deckId: 'deck-123',
    file: defaultFile,
    onSuccess: defaultOnSuccess,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('T-16-FE-01: uploading state — shows spinner while preview fetch is in-flight', () => {
    mockApiPostForm.mockReturnValue(new Promise(() => {}))
    render(<DeckUpdateModal {...defaultProps} />)
    // Dialog should be present
    expect(screen.getByRole('dialog')).toBeTruthy()
    // Loader2 renders with animate-spin class
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeTruthy()
    // Uploading key text should be visible
    expect(screen.getByText('deckUpdate.uploading')).toBeTruthy()
  })

  it('T-16-FE-02: previewing state — shows diff counts after preview fetch succeeds', async () => {
    mockApiPostForm.mockResolvedValue({
      ok: true,
      json: async () => ({ added: 2, updated: 1, unchanged: 3, removed: 0 }),
    })
    render(<DeckUpdateModal {...defaultProps} />)
    // Wait for previewing state — chip grid appears with count values
    await waitFor(() => screen.getByText('2'))
    expect(screen.getByText('1')).toBeTruthy()
    expect(screen.getByText('3')).toBeTruthy()
    // 0 appears in "removed" chip
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(1)
  })

  it('T-16-FE-03: keepRemoved toggle — default state is checked (true)', async () => {
    mockApiPostForm.mockResolvedValue({
      ok: true,
      json: async () => ({ added: 2, updated: 1, unchanged: 3, removed: 0 }),
    })
    render(<DeckUpdateModal {...defaultProps} />)
    await waitFor(() => screen.getByRole('switch'))
    const switchEl = screen.getByRole('switch')
    expect(switchEl.getAttribute('data-state')).toBe('checked')
  })

  it('T-16-FE-04: Apply button triggers apply fetch with keepRemoved value', async () => {
    // First call: preview
    mockApiPostForm.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ added: 2, updated: 1, unchanged: 3, removed: 0 }),
    })
    // Second call: apply
    mockApiPostForm.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ added: 2, updated: 1, unchanged: 3, removed: 0, deckId: 'deck-123' }),
    })
    render(<DeckUpdateModal {...defaultProps} />)
    // Wait for Apply button to appear (previewing state)
    await waitFor(() => screen.getByText('deckUpdate.apply'))
    fireEvent.click(screen.getByText('deckUpdate.apply'))
    // Second postForm call should be for apply endpoint
    await waitFor(() => expect(mockApiPostForm).toHaveBeenCalledTimes(2))
    const secondCall = mockApiPostForm.mock.calls[1]
    expect(secondCall[0]).toMatch(/update\/apply/)
    const sentFormData = secondCall[1] as FormData
    expect(sentFormData.get('keepRemoved')).toBe('true')
  })

  it('T-16-FE-05: error state — shows error message on preview fetch failure', async () => {
    mockApiPostForm.mockRejectedValue(new Error('Parse error'))
    render(<DeckUpdateModal {...defaultProps} />)
    await waitFor(() => screen.getByRole('alert'))
    const alert = screen.getByRole('alert')
    expect(alert).toBeTruthy()
  })

  it('T-16-FE-06: done — calls onSuccess() and closes modal on successful apply', async () => {
    const onOpenChange = vi.fn()
    const onSuccess = vi.fn()
    // First call: preview
    mockApiPostForm.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ added: 1, updated: 0, unchanged: 0, removed: 0 }),
    })
    // Second call: apply
    mockApiPostForm.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ added: 1, updated: 0, unchanged: 0, removed: 0, deckId: 'deck-123' }),
    })
    render(
      <DeckUpdateModal
        {...defaultProps}
        onOpenChange={onOpenChange}
        onSuccess={onSuccess}
      />
    )
    // Wait for previewing state
    await waitFor(() => screen.getByText('deckUpdate.apply'))
    fireEvent.click(screen.getByText('deckUpdate.apply'))
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(mockToastSuccess).toHaveBeenCalled()
  })
})
