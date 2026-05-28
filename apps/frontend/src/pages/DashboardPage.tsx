import { CheckCircle2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import type { DashboardStats } from '@kartex/shared'
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

export function DashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.title = 'Dashboard — Kartex'
  }, [])

  const fetchStats = async () => {
    try {
      const res = await api.get('/api/dashboard/stats')
      if (res.ok) {
        setStats((await res.json()) as DashboardStats)
      } else {
        toast.error('Could not load your cards. Please refresh.')
      }
    } catch {
      toast.error('Could not reach the server. Check your connection.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">Loading…</p>
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
        <p className="text-sm text-muted-foreground mt-1">cards due today</p>

        {stats.totalDue > 0 ? (
          // "Start Studying" CTA — navigates to /study (global SR mode)
          <Button
            size="lg"
            className="w-full mt-4"
            onClick={() => navigate('/study')}
          >
            Start Studying
          </Button>
        ) : (
          // 1d. Empty state (discretion — UI-SPEC §1d)
          <div
            className="mt-4 flex flex-col items-center justify-center gap-2 py-6"
            role="status"
          >
            <CheckCircle2 className="h-10 w-10 text-green-500" aria-hidden="true" />
            <p className="text-xl font-semibold text-foreground">You're all caught up!</p>
            <p className="text-sm text-muted-foreground">
              No cards are due today. Come back tomorrow.
            </p>
          </div>
        )}
      </div>

      {/* ── 1b. Per-Deck Due Counts Table (D-07 — locked) ─────────────── */}
      <div className="mb-8">
        <Table aria-label="Due cards by deck">
          <TableHeader>
            <TableRow>
              <TableHead>Deck</TableHead>
              <TableHead className="text-right">Due</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stats.byDeck.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={2}
                  className="text-center text-sm text-muted-foreground py-6"
                >
                  No cards due across any deck.
                </TableCell>
              </TableRow>
            ) : (
              stats.byDeck.map((d) => (
                <TableRow key={d.deckId}>
                  <TableCell>
                    {/* Deck name is a clickable link (UI-SPEC §1b) */}
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
            Reviewed today
          </p>
          <p className="text-xl font-semibold text-foreground mt-1">{stats.reviewedToday}</p>
        </div>

        {/* Chip 2: Streak */}
        <div className="flex-1 border border-border rounded-lg p-4">
          <p className="text-xs font-normal text-muted-foreground uppercase tracking-wide">
            Streak
          </p>
          <p className="text-xl font-semibold text-foreground mt-1">{stats.streak} days</p>
        </div>
      </div>
    </div>
  )
}
