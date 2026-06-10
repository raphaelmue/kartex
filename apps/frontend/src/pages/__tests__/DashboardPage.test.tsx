import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// 1. Mock react-router-dom — preserve real module, override useNavigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  }
})

// 2. Mock api module — vi.hoisted so mockApiGet is available in factory
const { mockApiGet } = vi.hoisted(() => ({
  mockApiGet: vi.fn(),
}))
vi.mock('@/lib/api', () => ({
  api: {
    get: mockApiGet,
  },
}))

// 3. Mock sonner toast
const { mockToastError } = vi.hoisted(() => ({
  mockToastError: vi.fn(),
}))
vi.mock('sonner', () => ({
  toast: { error: mockToastError, success: vi.fn() },
}))

// 4. Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { count?: number }) => {
      if (opts?.count !== undefined) return key.replace('{{count}}', String(opts.count))
      return key
    },
    i18n: { language: 'en' },
  }),
}))

import { DashboardPage } from '@/pages/DashboardPage'

// Default mock data
const dashboardData = {
  totalDue: 5,
  reviewedToday: 3,
  streak: 7,
  byDeck: [],
}

const summaryData = {
  totalReviewed: 100,
  weekReviewed: 10,
  retentionRate: 0.8,
  difficultyBreakdown: { easy: 5, good: 4, hard: 3, again: 2 },
  perDeck: [],
}

function renderPage() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  )
}

describe('DashboardPage stats integration (Phase 15)', () => {
  beforeEach(() => {
    mockApiGet.mockReset()
    mockToastError.mockReset()

    // Default: both endpoints succeed
    mockApiGet.mockImplementation((url: string) => {
      if (url === '/api/dashboard/stats') {
        return Promise.resolve({ ok: true, json: async () => dashboardData })
      }
      if (url === '/api/stats/summary') {
        return Promise.resolve({ ok: true, json: async () => summaryData })
      }
      return Promise.resolve({ ok: false, json: async () => ({}) })
    })
  })

  it('fires /api/dashboard/stats and /api/stats/summary in parallel via Promise.allSettled (STATS-01)', async () => {
    renderPage()
    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith('/api/dashboard/stats')
      expect(mockApiGet).toHaveBeenCalledWith('/api/stats/summary')
    })
    // Both called on mount (parallel — both invocations should happen)
    expect(mockApiGet).toHaveBeenCalledTimes(2)
  })

  it('renders the hero section as soon as dashboard stats resolve, regardless of summary fetch', async () => {
    renderPage()
    await waitFor(() => {
      // Hero shows totalDue (5) and cardsDueToday key
      expect(screen.getByText('5')).toBeTruthy()
    })
  })

  it('when /api/stats/summary rejects, the dashboard hero still renders and toast.error is NOT called (SC-5, T-15-04)', async () => {
    mockApiGet.mockImplementation((url: string) => {
      if (url === '/api/dashboard/stats') {
        return Promise.resolve({ ok: true, json: async () => dashboardData })
      }
      // Summary fetch rejects
      return Promise.reject(new Error('Network error'))
    })

    renderPage()

    await waitFor(() => {
      // Hero must still render
      expect(screen.getByText('5')).toBeTruthy()
    })

    // toast.error must NOT have been called for the stats failure
    expect(mockToastError).not.toHaveBeenCalled()
  })

  it('passes statsLoading to StatsSummaryPanel so skeletons show while the summary fetch is pending', async () => {
    // Make summary fetch delay so we can catch the skeleton state
    let resolveSummary!: (value: unknown) => void
    const summaryPromise = new Promise((res) => {
      resolveSummary = res
    })

    mockApiGet.mockImplementation((url: string) => {
      if (url === '/api/dashboard/stats') {
        return Promise.resolve({ ok: true, json: async () => dashboardData })
      }
      return summaryPromise.then(() => ({
        ok: true,
        json: async () => summaryData,
      }))
    })

    renderPage()

    // After dashboard resolves but before summary resolves, skeleton should be present
    await waitFor(() => {
      // aria-busy is set by StatsSummaryPanel when loading=true
      expect(document.querySelector('[aria-busy="true"]')).toBeTruthy()
    })

    // Resolve summary
    resolveSummary(undefined)

    await waitFor(() => {
      // After summary resolves, skeleton goes away
      expect(document.querySelector('[aria-busy="true"]')).toBeNull()
    })
  })
})
