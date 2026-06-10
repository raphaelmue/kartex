import { useTranslation } from 'react-i18next'
import type { StatsSummary } from '@kartex/shared'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export interface StatsSummaryPanelProps {
  summary: StatsSummary | null
  loading: boolean
}

export function StatsSummaryPanel({ summary, loading }: StatsSummaryPanelProps) {
  const { t } = useTranslation()

  if (loading) {
    return (
      <div className="mt-8" aria-busy="true">
        <div className="flex gap-4">
          <div className="flex-1 h-[68px] bg-muted animate-pulse rounded-lg" aria-hidden="true" />
          <div className="flex-1 h-[68px] bg-muted animate-pulse rounded-lg" aria-hidden="true" />
        </div>
        <div className="h-[68px] bg-muted animate-pulse rounded-lg mt-4" aria-hidden="true" />
        <div className="h-[120px] bg-muted animate-pulse rounded-lg mt-6" aria-hidden="true" />
      </div>
    )
  }

  const totalReviewed = summary?.totalReviewed ?? 0
  const weekReviewed = summary?.weekReviewed ?? 0
  const retentionRate = summary?.retentionRate ?? null
  const diff = summary?.difficultyBreakdown ?? null
  const perDeck = summary?.perDeck ?? []

  const difficultyKeys = [
    { key: 'easy', labelKey: 'dashboard.stats.easyLabel' },
    { key: 'good', labelKey: 'dashboard.stats.goodLabel' },
    { key: 'hard', labelKey: 'dashboard.stats.hardLabel' },
    { key: 'again', labelKey: 'dashboard.stats.againLabel' },
  ] as const

  return (
    <div className="mt-8">
      {/* Row 1: Total Reviewed + Retention Rate chips */}
      <div className="flex gap-4">
        {/* Total Reviewed chip */}
        <div
          role="region"
          aria-label={t('dashboard.stats.totalReviewed')}
          className="flex-1 border border-border rounded-lg p-4 min-h-[44px]"
        >
          <p className="text-xs font-normal text-muted-foreground uppercase tracking-wide">
            {t('dashboard.stats.totalReviewed')}
          </p>
          <p className="text-xl font-semibold text-foreground mt-1">
            {totalReviewed.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('dashboard.stats.thisWeek', { count: weekReviewed })}
          </p>
        </div>

        {/* Retention Rate chip */}
        <div
          role="region"
          aria-label={t('dashboard.stats.retentionRate')}
          className="flex-1 border border-border rounded-lg p-4 min-h-[44px]"
        >
          <p className="text-xs font-normal text-muted-foreground uppercase tracking-wide">
            {t('dashboard.stats.retentionRate')}
          </p>
          {retentionRate === null ? (
            <p role="status" className="text-sm text-muted-foreground mt-1">
              {t('dashboard.stats.noData')}
            </p>
          ) : (
            <p className="text-xl font-semibold text-foreground mt-1">
              {Math.round(retentionRate * 100)}%
            </p>
          )}
        </div>
      </div>

      {/* Row 2: Difficulty Breakdown chip (full width) */}
      <div
        role="region"
        aria-label={t('dashboard.stats.difficultyBreakdown')}
        className="border border-border rounded-lg p-4 mt-4 min-h-[44px]"
      >
        <p className="text-xs font-normal text-muted-foreground uppercase tracking-wide">
          {t('dashboard.stats.difficultyBreakdown')}
        </p>
        {diff === null ? (
          <p role="status" className="text-sm text-muted-foreground mt-1">
            {t('dashboard.stats.noData')}
          </p>
        ) : (
          <div className="flex items-center mt-1">
            {difficultyKeys.map(({ key, labelKey }, index) => (
              <div key={key} className="flex items-center">
                {index > 0 && (
                  <span className="border-l border-border mx-2 h-4 inline-block" aria-hidden="true" />
                )}
                <span className="text-sm font-semibold text-foreground">
                  <span className="sr-only">{t(labelKey)}: </span>
                  {diff[key]}
                </span>
                <span className="text-xs text-muted-foreground ml-1" aria-hidden="true">
                  {t(labelKey)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Row 3: Per-Deck Progress table */}
      <div className="mt-6">
        <p className="text-sm font-semibold text-foreground mb-2">
          {t('dashboard.stats.perDeckProgress')}
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs font-normal uppercase tracking-wide text-muted-foreground">
                {t('dashboard.deckColumn')}
              </TableHead>
              <TableHead className="text-xs font-normal uppercase tracking-wide text-muted-foreground text-right">
                {t('dashboard.dueColumn')}
              </TableHead>
              <TableHead className="text-xs font-normal uppercase tracking-wide text-muted-foreground text-right">
                {t('dashboard.stats.masteredColumn')}
              </TableHead>
              <TableHead className="text-xs font-normal uppercase tracking-wide text-muted-foreground text-right">
                {t('dashboard.stats.inLearningColumn')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {perDeck.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-sm text-muted-foreground py-6"
                >
                  {t('dashboard.stats.noDecksYet')}
                </TableCell>
              </TableRow>
            ) : (
              perDeck.map((d) => (
                <TableRow key={d.deckId}>
                  <TableCell>
                    <span className="text-sm font-normal text-foreground">{d.deckTitle}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    {d.dueCount > 0 ? (
                      <Badge variant="secondary">{d.dueCount}</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">{d.dueCount}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-sm text-foreground">{d.masteredCount}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-sm text-foreground">{d.inLearningCount}</span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
