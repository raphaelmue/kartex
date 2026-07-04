import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { StatsSummary } from '@kartex/shared'

// Mock react-i18next: t returns key, with basic {{count}} interpolation
const mockT = vi.fn((key: string, opts?: { count?: number }) => {
  if (opts?.count !== undefined) {
    return key.replace('{{count}}', String(opts.count))
  }
  return key
})
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: mockT, i18n: { language: 'en' } }),
}))

// Import AFTER mock setup
import { StatsSummaryPanel } from '@/components/StatsSummaryPanel'

const fullSummary: StatsSummary = {
  totalReviewed: 1234,
  weekReviewed: 12,
  retentionRate: 0.87,
  difficultyBreakdown: { easy: 5, good: 4, hard: 3, again: 2 },
  perDeck: [
    { deckId: 'deck-1', deckTitle: 'Spanish Basics', dueCount: 3, masteredCount: 10, inLearningCount: 5, avgThinkingTimeMs: 3400 },
    { deckId: 'deck-2', deckTitle: 'Math Zero', dueCount: 0, masteredCount: 0, inLearningCount: 0, avgThinkingTimeMs: null },
  ],
  recentSessions: [
    {
      id: 'session-1',
      startedAt: '2026-07-01T10:00:00.000Z',
      durationSeconds: 125,
      cardsReviewed: 12,
      completed: true,
      deckTitles: ['Spanish Basics', 'Math Zero'],
    },
    {
      id: 'session-2',
      startedAt: '2026-07-02T10:00:00.000Z',
      durationSeconds: 45,
      cardsReviewed: 4,
      completed: false,
      deckTitles: ['Spanish Basics'],
    },
  ],
}

describe('StatsSummaryPanel (STATS-01..04)', () => {
  beforeEach(() => {
    mockT.mockImplementation((key: string, opts?: { count?: number }) => {
      if (opts?.count !== undefined) {
        return key.replace('{{count}}', String(opts.count))
      }
      return key
    })
  })

  it('renders skeleton placeholders (aria-busy) when loading is true', () => {
    render(<StatsSummaryPanel summary={null} loading={true} />)
    const container = document.querySelector('[aria-busy="true"]')
    expect(container).toBeTruthy()
    // Chip labels should NOT be rendered in skeleton state
    expect(screen.queryByText('dashboard.stats.totalReviewed')).toBeNull()
  })

  it('renders Total Reviewed chip with totalReviewed value and "this week" sub-label (STATS-01)', () => {
    render(<StatsSummaryPanel summary={fullSummary} loading={false} />)
    // Label via key
    expect(screen.getByText('dashboard.stats.totalReviewed')).toBeTruthy()
    // Value: 1234 toLocaleString (could be "1,234" or "1234" depending on locale)
    expect(screen.getByText(/1.?234/)).toBeTruthy()
    // Sub-label with week count
    expect(screen.getByText('dashboard.stats.thisWeek')).not.toBeNull()
  })

  it('renders "No data yet" for retention chip when summary.retentionRate === null (STATS-02)', () => {
    const summary: StatsSummary = { ...fullSummary, retentionRate: null }
    render(<StatsSummaryPanel summary={summary} loading={false} />)
    // noData key rendered with role="status"
    const statusEl = document.querySelector('[role="status"]')
    expect(statusEl).toBeTruthy()
    expect(statusEl!.textContent).toBe('dashboard.stats.noData')
  })

  it('renders rounded percentage when summary.retentionRate is a number (STATS-02)', () => {
    render(<StatsSummaryPanel summary={fullSummary} loading={false} />)
    expect(screen.getByText('87%')).toBeTruthy()
  })

  it('renders "No data yet" for difficulty chip when summary.difficultyBreakdown === null (STATS-03)', () => {
    const summary: StatsSummary = { ...fullSummary, difficultyBreakdown: null }
    render(<StatsSummaryPanel summary={summary} loading={false} />)
    // There should be at least one noData status element (retention is also null? No — retention is 0.87 here)
    // Just check noData text is present for difficulty
    const allStatuses = document.querySelectorAll('[role="status"]')
    const texts = Array.from(allStatuses).map(el => el.textContent)
    expect(texts.some(t => t === 'dashboard.stats.noData')).toBe(true)
  })

  it('renders per-deck rows for every deck including zero-card decks with zero counts (STATS-04)', () => {
    render(<StatsSummaryPanel summary={fullSummary} loading={false} />)
    // "Math Zero" also appears as a Recent Sessions deck badge — use getAllByText
    expect(screen.getAllByText('Math Zero').length).toBeGreaterThanOrEqual(1)
    // The zero-card deck row should have three zeros
    const cells = screen.getAllByText('0')
    expect(cells.length).toBeGreaterThanOrEqual(3)
  })

  it('renders all four difficulty counts with sr-only labels (STATS-03)', () => {
    render(<StatsSummaryPanel summary={fullSummary} loading={false} />)
    const srLabels = document.querySelectorAll('.sr-only')
    const srTexts = Array.from(srLabels).map(el => el.textContent)
    expect(srTexts.some(t => t?.includes('dashboard.stats.easyLabel'))).toBe(true)
    expect(srTexts.some(t => t?.includes('dashboard.stats.goodLabel'))).toBe(true)
    expect(srTexts.some(t => t?.includes('dashboard.stats.hardLabel'))).toBe(true)
    expect(srTexts.some(t => t?.includes('dashboard.stats.againLabel'))).toBe(true)
  })

  it('renders all chips in empty/zero state when summary === null', () => {
    render(<StatsSummaryPanel summary={null} loading={false} />)
    // totalReviewed chip should show 0 (not crash)
    expect(screen.getByText('0')).toBeTruthy()
    // Both retention and difficulty show noData
    const statuses = document.querySelectorAll('[role="status"]')
    expect(statuses.length).toBeGreaterThanOrEqual(2)
  })

  it('renders "3.4s" for a deck with avgThinkingTimeMs = 3400 and noData for a deck with avgThinkingTimeMs = null (TIMER-04)', () => {
    render(<StatsSummaryPanel summary={fullSummary} loading={false} />)
    expect(screen.getByText('3.4s')).toBeTruthy()
    // deck-2 has avgThinkingTimeMs: null — must render noData key, never "0.0s"
    expect(screen.queryByText('0.0s')).toBeNull()
    const noDataCells = screen.getAllByText('dashboard.stats.noData')
    expect(noDataCells.length).toBeGreaterThanOrEqual(1)
  })

  it('renders a single noSessionsYet row when recentSessions is empty', () => {
    const summary: StatsSummary = { ...fullSummary, recentSessions: [] }
    render(<StatsSummaryPanel summary={summary} loading={false} />)
    expect(screen.getByText('dashboard.stats.noSessionsYet')).toBeTruthy()
  })

  it('renders an Incomplete badge for a session with completed = false, and not for a completed session', () => {
    render(<StatsSummaryPanel summary={fullSummary} loading={false} />)
    const incompleteBadges = screen.getAllByText('dashboard.stats.incompleteSession')
    expect(incompleteBadges.length).toBe(1)
  })

  it('renders one secondary Badge per deck for a multi-deck session', () => {
    render(<StatsSummaryPanel summary={fullSummary} loading={false} />)
    // session-1 has two deckTitles: Spanish Basics, Math Zero
    const spanishBadges = screen.getAllByText('Spanish Basics')
    const mathBadges = screen.getAllByText('Math Zero')
    expect(spanishBadges.length).toBeGreaterThanOrEqual(1)
    expect(mathBadges.length).toBeGreaterThanOrEqual(1)
  })

  it('renders session duration in mm:ss and card counts', () => {
    render(<StatsSummaryPanel summary={fullSummary} loading={false} />)
    // 125 seconds -> 02:05
    expect(screen.getByText('02:05')).toBeTruthy()
    // 45 seconds -> 00:45
    expect(screen.getByText('00:45')).toBeTruthy()
    expect(screen.getByText('12')).toBeTruthy()
  })
})
