import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'

// mm:ss is rendered as `<span>{mins}:{secs}</span>` — three separate text nodes
// per the UI-SPEC-mandated markup, so query the span's combined textContent
// rather than getByText (which requires a single text node by default).
function timerText(container: HTMLElement): string | null {
  return container.querySelector('span')?.textContent ?? null
}

// Mock react-i18next: t returns key, with {{...}} interpolation (StatsSummaryPanel.test.tsx pattern)
const mockT = vi.fn((key: string, opts?: Record<string, unknown>) => {
  if (!opts) return key
  let result = key
  for (const [k, v] of Object.entries(opts)) {
    result = result.replace(`{{${k}}}`, String(v))
  }
  return result
})
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: mockT }),
}))

// Import AFTER mock setup
import { SessionTimer } from '@/components/SessionTimer'

describe('SessionTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    // Restore document.hidden to its default (non-hidden) descriptor between tests
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
    vi.useRealTimers()
  })

  it('renders "00:00" initially when startedAt = now', () => {
    const now = Date.now()
    vi.setSystemTime(now)
    const { container } = render(<SessionTimer startedAt={now} />)
    expect(timerText(container)).toBe('00:00')
  })

  it('renders "01:05" after advancing time by 65s', () => {
    const now = Date.now()
    vi.setSystemTime(now)
    const { container } = render(<SessionTimer startedAt={now} />)
    act(() => { vi.advanceTimersByTime(65000) })
    expect(timerText(container)).toBe('01:05')
  })

  it('has role="timer" and aria-live="off"', () => {
    const now = Date.now()
    vi.setSystemTime(now)
    render(<SessionTimer startedAt={now} />)
    const el = screen.getByRole('timer')
    expect(el.getAttribute('aria-live')).toBe('off')
  })

  it('does not advance while document.hidden is true, and resumes after visibility returns', () => {
    const now = Date.now()
    vi.setSystemTime(now)
    const { container } = render(<SessionTimer startedAt={now} />)

    // Advance 5s while visible
    act(() => { vi.advanceTimersByTime(5000) })
    expect(timerText(container)).toBe('00:05')

    // Tab goes hidden
    act(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
      document.dispatchEvent(new Event('visibilitychange'))
    })

    // 10s pass while hidden — displayed value must not change
    act(() => { vi.advanceTimersByTime(10000) })
    expect(timerText(container)).toBe('00:05')

    // Tab becomes visible again
    act(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
      document.dispatchEvent(new Event('visibilitychange'))
    })

    // 3 more visible seconds — resumes from where it paused (00:05 -> 00:08)
    act(() => { vi.advanceTimersByTime(3000) })
    expect(timerText(container)).toBe('00:08')
  })
})
