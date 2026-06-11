import { CheckCircle2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import type { DashboardStats, StatsSummary } from '@kartex/shared'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatsSummaryPanel } from '@/components/StatsSummaryPanel'

export function DashboardPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [statsSummary, setStatsSummary] = useState<StatsSummary | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    document.title = t('dashboard.title')
  }, [t, i18n.language])

  const fetchDashboardStats = async () => {
    try {
      const res = await api.get('/api/dashboard/stats')
      if (res.ok) {
        setStats((await res.json()) as DashboardStats)
      } else {
        toast.error(t('common.somethingWrong'))
      }
    } catch {
      toast.error(t('common.somethingWrong'))
    } finally {
      setLoading(false)
    }
  }

  const fetchStatsSummary = async () => {
    try {
      const res = await api.get('/api/stats/summary')
      if (res.ok) {
        setStatsSummary((await res.json()) as StatsSummary)
      }
      // On any failure: leave statsSummary as null (no toast — SC-5 / T-15-04)
    } catch {
      // silent failure
    } finally {
      setStatsLoading(false)
    }
  }

  useEffect(() => {
    void fetchDashboardStats()
    void fetchStatsSummary()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* ── 1a. Hero Section (D-07 — locked) ─────────────────────────── */}
      <div className="mb-8">
        {/* Due count: Display role — text-5xl font-semibold (UI-SPEC Typography) */}
        <p className="text-5xl font-semibold">{stats.totalDue}</p>
        <p className="text-sm text-muted-foreground mt-1">{t('dashboard.cardsDueToday')}</p>

        {stats.totalDue > 0 ? (
          // "Start Studying" CTA — navigates to /study (global SR mode)
          <Button
            size="lg"
            className="w-full mt-4"
            onClick={() => navigate('/study')}
          >
            {t('dashboard.startStudying')}
          </Button>
        ) : (
          // 1d. Empty state (discretion — UI-SPEC §1d)
          <div
            className="mt-4 flex flex-col items-center justify-center gap-2 py-6"
            role="status"
          >
            <CheckCircle2 className="h-10 w-10 text-green-500" aria-hidden="true" />
            <p className="text-xl font-semibold text-foreground">{t('dashboard.allCaughtUp')}</p>
            <p className="text-sm text-muted-foreground">
              {t('dashboard.noDueCards')}
            </p>
          </div>
        )}
      </div>

      {/* ── 1b. Per-Deck Due Counts Table (D-07 — locked) ─────────────── */}
      <div className="mb-8 overflow-x-auto">
        <Table aria-label={t('dashboard.deckColumn')}>
          <TableHeader>
            <TableRow>
              <TableHead>{t('dashboard.deckColumn')}</TableHead>
              <TableHead className="text-right">{t('dashboard.dueColumn')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stats.byDeck.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={2}
                  className="text-center text-sm text-muted-foreground py-6"
                >
                  {t('dashboard.noDueAnyDeck')}
                </TableCell>
              </TableRow>
            ) : (
              stats.byDeck.map((d) => (
                <TableRow key={d.deckId}>
                  <TableCell>
                    {/* Deck name is a clickable link (UI-SPEC §1b) — user content, not translated (D-07) */}
                    <Link
                      to={`/decks/${d.deckId}`}
                      className="text-sm font-normal text-foreground cursor-pointer hover:underline"
                    >
                      {d.deckTitle}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right">
                    {d.dueCount > 0 ? (
                      <Badge variant="secondary">{d.dueCount}</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">{d.dueCount}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── 1c. Stats Chips (D-08 — locked) ───────────────────────────── */}
      {/* Exactly two chips: "Reviewed today" and "Streak" */}
      <div className="flex gap-4">
        {/* Chip 1: Reviewed today */}
        <div className="flex-1 border border-border rounded-lg p-4">
          <p className="text-xs font-normal text-muted-foreground uppercase tracking-wide">
            {t('dashboard.reviewedToday')}
          </p>
          <p className="text-xl font-semibold text-foreground mt-1">{stats.reviewedToday}</p>
        </div>

        {/* Chip 2: Streak */}
        <div className="flex-1 border border-border rounded-lg p-4">
          <p className="text-xs font-normal text-muted-foreground uppercase tracking-wide">
            {t('dashboard.streak')}
          </p>
          <p className="text-xl font-semibold text-foreground mt-1">
            {t('dashboard.streakDays', { count: stats.streak })}
          </p>
        </div>
      </div>

      {/* ── 1d. Stats Summary Panel (Phase 15) ──────────────────────── */}
      <StatsSummaryPanel summary={statsSummary} loading={statsLoading} />
    </div>
  )
}
