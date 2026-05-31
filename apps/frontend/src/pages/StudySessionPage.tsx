import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Brain, BookOpen, Timer, Trophy, CheckCircle2 } from 'lucide-react'
import type { DueCard } from '@kartex/shared'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CardFlip } from '@/components/CardFlip'
import { RatingButtons } from '@/components/RatingButtons'
import { ExamTimer } from '@/components/ExamTimer'
import { SessionProgress } from '@/components/SessionProgress'
import { useStudySession, type StudyMode } from '@/hooks/useStudySession'

// Non-mutating Fisher-Yates shuffle (CR-01)
function shuffle<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

// EXAM_DURATIONS: user must pick (D-06 — no default)
const EXAM_DURATIONS = [
  { label: '5 minutes', value: '300' },
  { label: '10 minutes', value: '600' },
  { label: '15 minutes', value: '900' },
  { label: '30 minutes', value: '1800' },
  { label: '60 minutes', value: '3600' },
]

// SIZE_OPTIONS: segmented button row for session size picker (STUDY-02)
const SIZE_OPTIONS: { label: string; value: 'all' | 10 | 20 | 'custom' }[] = [
  { label: 'All due', value: 'all' },
  { label: '10', value: 10 },
  { label: '20', value: 20 },
  { label: 'Custom', value: 'custom' },
]

// Inner component that runs the actual session loop (cards already loaded)
function SessionRunner({
  cards,
  mode,
  examDurationSeconds,
  deckId,
}: {
  cards: DueCard[]
  mode: StudyMode
  examDurationSeconds: number | null
  deckId?: string
}) {
  const navigate = useNavigate()
  const [examExpired, setExamExpired] = useState(false)
  const [startTime] = useState(() => Date.now())
  const [endTime, setEndTime] = useState<number | null>(null)

  const { currentCard, face, isFlipping, sessionDone, progress, ratingCounts, flip, rate } =
    useStudySession(cards, mode)

  useEffect(() => {
    if (sessionDone) setEndTime(t => t ?? Date.now())
  }, [sessionDone])

  const handleLeave = () => {
    if (deckId) navigate(`/decks/${deckId}`)
    else navigate('/dashboard')
  }

  const handleRestart = () => {
    // Reload the page to restart session with fresh card list
    window.location.reload()
  }

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 text-center py-16 gap-4">
        <CheckCircle2 className="h-10 w-10 text-green-500" aria-hidden="true" />
        <h2 className="text-xl font-semibold">No cards to study!</h2>
        <p className="text-sm text-muted-foreground">All caught up. Come back tomorrow.</p>
        <Button onClick={() => navigate('/dashboard')}>Return to Dashboard</Button>
      </div>
    )
  }

  if (sessionDone) {
    const elapsedMs = (endTime ?? startTime) - startTime
    const elapsedSec = Math.floor(elapsedMs / 1000)
    const elapsedMin = Math.floor(elapsedSec / 60)
    const elapsedRemSec = elapsedSec % 60
    const totalRated = ratingCounts.again + ratingCounts.hard + ratingCounts.good + ratingCounts.easy

    return (
      <div className="flex flex-col items-center justify-center flex-1 text-center py-16 gap-6 max-w-md mx-auto">
        <Trophy className="h-12 w-12 text-yellow-500" aria-hidden="true" />
        <h2 className="text-xl font-semibold">Session complete!</h2>
        {mode === 'exam' ? (
          <p className="text-sm text-muted-foreground">
            You reviewed {totalRated} cards in {elapsedMin}m {elapsedRemSec}s.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">You reviewed {totalRated} cards.</p>
        )}
        <div className="flex gap-4 justify-center">
          <span className="text-sm text-red-500">Again: {ratingCounts.again}</span>
          <span className="text-sm text-orange-500">Hard: {ratingCounts.hard}</span>
          <span className="text-sm text-green-500">Good: {ratingCounts.good}</span>
          <span className="text-sm text-blue-500">Easy: {ratingCounts.easy}</span>
        </div>
        <Button size="lg" className="w-full mt-4" onClick={() => navigate('/dashboard')}>
          Return to Dashboard
        </Button>
        <Button variant="outline" size="sm" className="w-full" onClick={handleRestart}>
          Restart Session
        </Button>
      </div>
    )
  }

  if (!currentCard) return null

  const isFlipped = face === 'back'

  return (
    <div className="flex flex-col flex-1 min-h-0 py-8 px-4 max-w-2xl mx-auto w-full">
      {/* Top bar: Leave Session + optional timer */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLeave}
          aria-label="Leave study session"
        >
          <ArrowLeft className="h-4 w-4 mr-1" aria-hidden="true" />
          Leave Session
        </Button>
        {mode === 'exam' && examDurationSeconds !== null && (
          <ExamTimer
            durationSeconds={examDurationSeconds}
            onExpire={() => setExamExpired(true)}
          />
        )}
      </div>

      {/* Timer expired banner (D-05) */}
      {examExpired && (
        <div
          className="bg-orange-50 border border-orange-200 rounded-md p-3 mb-4 flex items-center gap-2 text-sm text-orange-800"
          aria-live="assertive"
        >
          <Timer className="h-4 w-4" aria-hidden="true" />
          Time's up! Rate this card to finish.
        </div>
      )}

      {/* Progress: Card N of M */}
      <SessionProgress current={progress.current} total={progress.total} />

      {/* Card flip + rating buttons */}
      <CardFlip
        card={currentCard}
        isFlipped={isFlipped}
        isFlipping={isFlipping}
        onClick={() => { if (!isFlipped) void flip() }}
      >
        <RatingButtons
          onRate={(rating) => void rate(rating)}
          disabled={isFlipping}
        />
      </CardFlip>
    </div>
  )
}

// Config snapshot committed when user explicitly starts a session (CR-02)
type CommittedConfig = {
  mode: StudyMode
  tags: Set<string>
  size: 'all' | 10 | 20 | 'custom'
  count: number
} | null

// Top-level page component
export function StudySessionPage() {
  const { id: deckId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // Determine if this is global SR mode (/study) or deck-specific (/decks/:id/learn)
  const isGlobalSR = !deckId

  // Mode selector state (only for deck-specific sessions)
  const [selectedMode, setSelectedMode] = useState<StudyMode | null>(isGlobalSR ? 'sr' : null)
  const [examDurationSeconds, setExamDurationSeconds] = useState<number | null>(null)

  // Card loading state
  const [cards, setCards] = useState<DueCard[] | null>(null)
  const [loadingCards, setLoadingCards] = useState(false)
  const [deckTitle, setDeckTitle] = useState<string>('')
  const [deckTotalCards, setDeckTotalCards] = useState<number>(0)
  const [deckDueCount, setDeckDueCount] = useState<number>(0)

  // Session config state (STUDY-01, STUDY-02)
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [sessionSize, setSessionSize] = useState<'all' | 10 | 20 | 'custom'>('all')
  const [customCount, setCustomCount] = useState<number>(1)

  // Committed config snapshot — only set when user explicitly starts a session (CR-02/WR-03)
  // The loadCards effect depends on this snapshot, not live config state, to prevent
  // mid-session re-triggering when the user changes tags or size.
  // For global SR (/study), auto-commit immediately with default config.
  const [committedConfig, setCommittedConfig] = useState<CommittedConfig>(
    isGlobalSR ? { mode: 'sr', tags: new Set(), size: 'all', count: 1 } : null,
  )

  useEffect(() => {
    document.title = 'Study — Kartex'
  }, [])

  // Prefetch deck info for mode selector display
  useEffect(() => {
    if (!deckId) return
    void (async () => {
      try {
        const [deckRes, allCardsRes, dueRes] = await Promise.all([
          api.get(`/api/decks/${deckId}`),
          api.get(`/api/study/deck/${deckId}`),
          api.get('/api/study/due'),
        ])
        if (deckRes.ok) {
          const deck = await deckRes.json() as { title: string }
          setDeckTitle(deck.title)
        }
        if (allCardsRes.ok) {
          const all = await allCardsRes.json() as DueCard[]
          setDeckTotalCards(all.length)
          setAvailableTags([...new Set(all.flatMap((c) => c.tags))].sort())
        }
        if (dueRes.ok) {
          const due = await dueRes.json() as { deckId: string }[]
          setDeckDueCount(due.filter((c) => c.deckId === deckId).length)
        }
      } catch {
        // Non-critical for mode selector — swallow
      }
    })()
  }, [deckId])

  // Load cards only when the user explicitly commits a config (CR-02/WR-03)
  // Deps are [committedConfig, deckId] — live config state changes do not re-trigger this.
  useEffect(() => {
    if (!committedConfig) return
    setLoadingCards(true)
    void (async () => {
      try {
        const { mode, tags, size, count } = committedConfig
        // WR-01: SR + deckId uses the deck-scoped endpoint; SR without deckId uses global due
        const endpoint =
          mode === 'sr' && !deckId
            ? '/api/study/due'
            : `/api/study/deck/${deckId}`

        const res = await api.get(endpoint)
        if (res.ok) {
          const data = await res.json() as DueCard[]
          // Server already scopes to the deck for deck-specific endpoints (WR-01)
          const filtered = data

          // STUDY-01: Tag filter (OR logic; untagged excluded when any tag active)
          const tagFiltered =
            tags.size === 0
              ? filtered
              : filtered.filter((c) => c.tags.some((t) => tags.has(t)))

          // STUDY-02: Session size slice (SR mode only per D-08)
          const sized =
            mode === 'sr' && size !== 'all'
              ? tagFiltered.slice(
                  0,
                  size === 'custom' ? Math.max(1, count) : size,
                )
              : tagFiltered

          // STUDY-03: Shuffle — non-mutating Fisher-Yates (CR-01)
          const shuffled = shuffle(sized)

          setCards(shuffled)
        } else {
          toast.error('Could not load this session. Please go back and try again.')
        }
      } catch {
        toast.error('Could not load this session. Please go back and try again.')
      } finally {
        setLoadingCards(false)
      }
    })()
  }, [committedConfig, deckId])

  // Mode selector (deck-specific sessions only)
  if (!selectedMode) {
    return (
      <div className="max-w-lg mx-auto py-12 px-4">
        <Button
          variant="ghost"
          size="sm"
          className="mb-6"
          onClick={() => navigate(deckId ? `/decks/${deckId}` : '/dashboard')}
        >
          <ArrowLeft className="h-4 w-4 mr-1" aria-hidden="true" />
          Back to deck
        </Button>
        <h1 className="text-xl font-semibold mb-2">Study: {deckTitle}</h1>
        <p className="text-sm text-muted-foreground mb-4">Choose how you want to study</p>

        {/* Session config (STUDY-01, STUDY-02) — only when deck has tagged cards */}
        {availableTags.length > 0 && (
          <div className="mb-6 space-y-3">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Filter by tag
              </p>
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag) => (
                  <Button
                    key={tag}
                    size="sm"
                    variant={selectedTags.has(tag) ? 'default' : 'outline'}
                    onClick={() => {
                      setSelectedTags((prev) => {
                        const next = new Set(prev)
                        if (next.has(tag)) next.delete(tag)
                        else next.add(tag)
                        return next
                      })
                    }}
                    type="button"
                  >
                    {tag}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Session size{' '}
                <span className="font-normal normal-case tracking-normal">(SR mode only)</span>
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {SIZE_OPTIONS.map((opt) => (
                  <Button
                    key={String(opt.value)}
                    size="sm"
                    variant={sessionSize === opt.value ? 'default' : 'outline'}
                    onClick={() => setSessionSize(opt.value)}
                    type="button"
                  >
                    {opt.label}
                  </Button>
                ))}
                {sessionSize === 'custom' && (
                  <Input
                    type="number"
                    min={1}
                    value={customCount}
                    onChange={(e) =>
                      setCustomCount(Math.max(1, parseInt(e.target.value, 10) || 1))
                    }
                    className="w-20 h-8"
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Spaced Repetition card */}
        <div
          className="border border-border rounded-lg p-6 cursor-pointer hover:ring-2 hover:ring-ring transition-all mb-4"
          onClick={() => {
            setSelectedMode('sr')
            setCommittedConfig({ mode: 'sr', tags: selectedTags, size: sessionSize, count: customCount })
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setSelectedMode('sr')
              setCommittedConfig({ mode: 'sr', tags: selectedTags, size: sessionSize, count: customCount })
            }
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Brain className="h-5 w-5" aria-hidden="true" />
            <span className="font-semibold text-sm">Spaced Repetition</span>
          </div>
          <p className="text-xs text-muted-foreground">Cards due today, SM-2 algorithm</p>
          <p className="text-xs font-semibold text-foreground mt-1">{deckDueCount} cards due</p>
        </div>

        {/* Deck Mode card */}
        <div
          className="border border-border rounded-lg p-6 cursor-pointer hover:ring-2 hover:ring-ring transition-all mb-4"
          onClick={() => {
            setSelectedMode('deck')
            setCommittedConfig({ mode: 'deck', tags: selectedTags, size: sessionSize, count: customCount })
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setSelectedMode('deck')
              setCommittedConfig({ mode: 'deck', tags: selectedTags, size: sessionSize, count: customCount })
            }
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="h-5 w-5" aria-hidden="true" />
            <span className="font-semibold text-sm">Deck Mode</span>
          </div>
          <p className="text-xs text-muted-foreground">All cards in order, progress saved</p>
          <p className="text-xs font-semibold text-foreground mt-1">{deckTotalCards} cards total</p>
        </div>

        {/* Exam Mode card */}
        <div className="border border-border rounded-lg p-6 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <Timer className="h-5 w-5" aria-hidden="true" />
            <span className="font-semibold text-sm">Exam Mode</span>
          </div>
          <p className="text-xs text-muted-foreground">Time-limited, progress not saved</p>
          <Select
            onValueChange={(val) => setExamDurationSeconds(parseInt(val, 10))}
          >
            <SelectTrigger className="mt-3">
              <SelectValue placeholder="Select time limit" />
            </SelectTrigger>
            <SelectContent>
              {EXAM_DURATIONS.map((d) => (
                <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            className="w-full mt-4"
            disabled={examDurationSeconds === null}
            onClick={() => {
              if (examDurationSeconds !== null) {
                setSelectedMode('exam')
                setCommittedConfig({ mode: 'exam', tags: selectedTags, size: sessionSize, count: customCount })
              }
            }}
          >
            Start Exam
          </Button>
        </div>
      </div>
    )
  }

  if (loadingCards || cards === null) {
    return (
      <div className="flex items-center justify-center flex-1">
        <p className="text-sm text-muted-foreground">Loading cards…</p>
      </div>
    )
  }

  return (
    <SessionRunner
      cards={cards}
      mode={selectedMode}
      examDurationSeconds={examDurationSeconds}
      deckId={deckId}
    />
  )
}
