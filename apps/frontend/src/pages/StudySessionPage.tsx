import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Brain, BookOpen, Timer, Trophy, CheckCircle2 } from 'lucide-react'
import type { DueCard, DeckListItem } from '@kartex/shared'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { CardFlip } from '@/components/CardFlip'
import { RatingButtons } from '@/components/RatingButtons'
import { ExamTimer } from '@/components/ExamTimer'
import { SessionProgress } from '@/components/SessionProgress'
import { useStudySession, type StudyMode } from '@/hooks/useStudySession'
import { useAuth } from '@/context/AuthContext'

// Non-mutating Fisher-Yates shuffle (CR-01)
function shuffle<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

// EXAM_DURATIONS and SIZE_OPTIONS are computed inside the component using t() — see StudySessionPage

// Inner component that runs the actual session loop (cards already loaded)
function SessionRunner({
  cards,
  mode,
  examDurationSeconds,
  deckId,
  studyMode,
}: {
  cards: DueCard[]
  mode: StudyMode
  examDurationSeconds: number | null
  deckId?: string
  studyMode: string
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [examExpired, setExamExpired] = useState(false)
  const [startTime] = useState(() => Date.now())
  const [endTime, setEndTime] = useState<number | null>(null)

  const { currentCard, face, isFlipping, sessionDone, progress, ratingCounts, flip, rate } =
    useStudySession(cards, mode)

  useEffect(() => {
    if (sessionDone) setEndTime(prev => prev ?? Date.now())
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
        <h2 className="text-xl font-semibold">{t('study.noCardsToStudy')}</h2>
        <p className="text-sm text-muted-foreground">{t('study.allCaughtUp')}</p>
        <Button onClick={() => navigate('/dashboard')}>{t('study.returnToDashboard')}</Button>
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
        <h2 className="text-xl font-semibold">{t('study.sessionComplete')}</h2>
        {mode === 'exam' ? (
          <p className="text-sm text-muted-foreground">
            {t('study.reviewedCardsWithTime', { count: totalRated, min: elapsedMin, sec: elapsedRemSec })}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t('study.reviewedCards', { count: totalRated })}
          </p>
        )}
        <div className="flex gap-4 justify-center">
          <span className="text-sm text-red-500">{t('rating.again')}: {ratingCounts.again}</span>
          <span className="text-sm text-orange-500">{t('rating.hard')}: {ratingCounts.hard}</span>
          <span className="text-sm text-green-500">{t('rating.good')}: {ratingCounts.good}</span>
          <span className="text-sm text-blue-500">{t('rating.easy')}: {ratingCounts.easy}</span>
        </div>
        <Button size="lg" className="w-full mt-4" onClick={() => navigate('/dashboard')}>
          {t('study.returnToDashboard')}
        </Button>
        <Button variant="outline" size="sm" className="w-full" onClick={handleRestart}>
          {t('study.restartSession')}
        </Button>
      </div>
    )
  }

  if (!currentCard) return null

  const isFlipped = face === 'back'

  return (
    <div className="flex flex-col h-full px-4 max-w-2xl mx-auto w-full">
      {/* Top bar: Leave Session + optional timer */}
      <div className="flex items-center justify-between pt-4 sm:pt-6 pb-3 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLeave}
          aria-label={t('a11y.leaveSession')}
        >
          <ArrowLeft className="h-4 w-4 mr-1" aria-hidden="true" />
          {t('study.leaveSession')}
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
          className="bg-orange-50 border border-orange-200 rounded-md p-3 mb-3 flex items-center gap-2 text-sm text-orange-800 shrink-0"
          aria-live="assertive"
        >
          <Timer className="h-4 w-4" aria-hidden="true" />
          {t('study.timesUp')}
        </div>
      )}

      {/* Progress: Card N of M + optional mode indicator badge (SM2-04) */}
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <SessionProgress current={progress.current} total={progress.total} />
        {studyMode !== 'normal' && (
          <Badge variant="secondary" className="text-xs shrink-0">
            {t(`settings.modeNames.${studyMode}`)}
          </Badge>
        )}
      </div>

      {/* Card flip + rating buttons: fills remaining height */}
      <div className="flex-1 min-h-0">
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
    </div>
  )
}

// Config snapshot committed when user explicitly starts a session (CR-02)
type CommittedConfig = {
  mode: StudyMode
  tags: Set<string>
  size: 'all' | 10 | 20 | 'custom'
  count: number
  deckIds?: string[]   // undefined = all active decks (legacy/deck-specific paths)
} | null

// Deck entry for the global SR start screen picker
type DeckPickerDeck = {
  id: string
  title: string
  dueCount: number
}

// Row in the deck picker list (extracted to keep StudySessionPage under 500 lines)
function DeckPickerItem({
  deck,
  checked,
  isLast,
  onToggle,
  dueLabel,
}: {
  deck: DeckPickerDeck
  checked: boolean
  isLast: boolean
  onToggle: () => void
  dueLabel: string
}) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-muted/50${isLast ? '' : ' border-b border-border'}`}
      onClick={onToggle}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={onToggle}
        id={`deck-picker-${deck.id}`}
        aria-label={deck.title}
      />
      <div className="flex-1 min-w-0">
        {/* deck.title is user content — not translated (D-07) */}
        <p className="text-sm font-semibold truncate">{deck.title}</p>
        <p className="text-xs text-muted-foreground">{dueLabel}</p>
      </div>
    </div>
  )
}

// Global SR start screen (DECK-03, DECK-04) — extracted to keep StudySessionPage under 500 lines
function GlobalSRStartScreen({
  activeDecks,
  selectedDeckIds,
  sessionSize,
  customCount,
  sizeOptions,
  onToggleDeck,
  onSetSessionSize,
  onSetCustomCount,
  onStartSession,
  onNavigateBack,
}: {
  activeDecks: DeckPickerDeck[]
  selectedDeckIds: Set<string>
  sessionSize: 'all' | 10 | 20 | 'custom'
  customCount: number
  sizeOptions: { label: string; value: 'all' | 10 | 20 | 'custom' }[]
  onToggleDeck: (id: string) => void
  onSetSessionSize: (v: 'all' | 10 | 20 | 'custom') => void
  onSetCustomCount: (n: number) => void
  onStartSession: () => void
  onNavigateBack: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="max-w-lg mx-auto py-12 px-4">
      <Button variant="ghost" size="sm" className="mb-6" onClick={onNavigateBack}>
        <ArrowLeft className="h-4 w-4 mr-1" aria-hidden="true" />
        {t('study.backToDashboard')}
      </Button>
      <h1 className="text-xl font-semibold mb-2">{t('study.globalTitle')}</h1>
      <p className="text-sm text-muted-foreground mb-6">{t('study.globalSubtitle')}</p>

      {/* Deck picker section */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          {t('study.chooseDecks')}
        </p>
        {activeDecks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground border border-border rounded-lg">
            <BookOpen className="h-8 w-8" aria-hidden="true" />
            <p className="text-sm font-semibold">{t('study.noActiveDecks')}</p>
            <p className="text-xs text-center">{t('study.noActiveDecksHint')}</p>
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            {activeDecks.map((deck, i) => (
              <DeckPickerItem
                key={deck.id}
                deck={deck}
                checked={selectedDeckIds.has(deck.id)}
                isLast={i === activeDecks.length - 1}
                onToggle={() => onToggleDeck(deck.id)}
                dueLabel={t('study.nCardsDue', { count: deck.dueCount })}
              />
            ))}
          </div>
        )}
      </div>

      {/* Session size picker section */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          {t('study.sessionSize')}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {sizeOptions.map((opt) => (
            <Button
              key={String(opt.value)}
              size="sm"
              variant={sessionSize === opt.value ? 'default' : 'outline'}
              onClick={() => onSetSessionSize(opt.value)}
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
              onChange={(e) => onSetCustomCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-20 h-8"
            />
          )}
        </div>
      </div>

      <Button size="lg" className="w-full mt-4" disabled={selectedDeckIds.size === 0} onClick={onStartSession}>
        {t('study.startSession')}
      </Button>
    </div>
  )
}

// Top-level page component
export function StudySessionPage() {
  const { t, i18n } = useTranslation()
  const { id: deckId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

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
  // Always null on mount — global SR shows start screen before committing (Pitfall 2).
  const [committedConfig, setCommittedConfig] = useState<CommittedConfig>(null)

  // Global SR start screen state
  const [activeDecks, setActiveDecks] = useState<DeckPickerDeck[]>([])
  const [selectedDeckIds, setSelectedDeckIds] = useState<Set<string>>(new Set())

  // EXAM_DURATIONS: user must pick (D-06 — no default). Computed here to use t().
  const EXAM_DURATIONS = [
    { label: t('study.nMinutes', { count: 5 }), value: '300' },
    { label: t('study.nMinutes', { count: 10 }), value: '600' },
    { label: t('study.nMinutes', { count: 15 }), value: '900' },
    { label: t('study.nMinutes', { count: 30 }), value: '1800' },
    { label: t('study.nMinutes', { count: 60 }), value: '3600' },
  ]

  // SIZE_OPTIONS: segmented button row for session size picker (STUDY-02). Computed here to use t().
  const SIZE_OPTIONS: { label: string; value: 'all' | 10 | 20 | 'custom' }[] = [
    { label: t('study.sizeAllDue'), value: 'all' },
    { label: '10', value: 10 },
    { label: '20', value: 20 },
    { label: t('study.sizeCustom'), value: 'custom' },
  ]

  useEffect(() => {
    document.title = t('study.title')
  }, [t, i18n.language])

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
      } catch (err) {
        // Non-critical for mode selector, but log for debugging (WR-04)
        if (import.meta.env.DEV) {
          console.error('[StudySessionPage] prefetch failed:', err)
        }
      }
    })()
  }, [deckId])

  // Prefetch active decks for the global SR start screen (DECK-03)
  useEffect(() => {
    if (!isGlobalSR) return
    void (async () => {
      try {
        const [decksRes, dueRes] = await Promise.all([
          api.get('/api/decks'),
          api.get('/api/study/due'),
        ])
        if (decksRes.ok && dueRes.ok) {
          const allDecks = await decksRes.json() as DeckListItem[]
          const due = await dueRes.json() as { deckId: string }[]
          const active = allDecks.filter((d) => d.isActive)
          const picker: DeckPickerDeck[] = active.map((d) => ({
            id: d.id,
            title: d.title,
            dueCount: due.filter((c) => c.deckId === d.id).length,
          }))
          setActiveDecks(picker)
          setSelectedDeckIds(new Set(picker.map((d) => d.id)))
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error('[StudySessionPage] global prefetch failed:', err)
        }
      }
    })()
  }, [isGlobalSR])

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
              : filtered.filter((c) => c.tags.some((tag) => tags.has(tag)))

          // DECK-03: Session deckIds filter (client-side, additive to server isActive filter)
          const deckFiltered =
            committedConfig.deckIds
              ? tagFiltered.filter((c) => committedConfig.deckIds!.includes(c.deckId))
              : tagFiltered

          // STUDY-02: Session size slice (SR mode only per D-08)
          const sized =
            mode === 'sr' && size !== 'all'
              ? deckFiltered.slice(
                  0,
                  size === 'custom' ? Math.max(1, count) : size,
                )
              : deckFiltered

          // STUDY-03: Shuffle — non-mutating Fisher-Yates (CR-01)
          const shuffled = shuffle(sized)

          setCards(shuffled)
        } else {
          toast.error(t('study.couldNotLoad'))
        }
      } catch {
        toast.error(t('study.couldNotLoad'))
      } finally {
        setLoadingCards(false)
      }
    })()
  }, [committedConfig, deckId])

  // Toggle a deck in/out of the session selection (DECK-03 — session-only, no API call)
  const toggleDeckSelection = (deckId: string) => {
    setSelectedDeckIds((prev) => {
      const next = new Set(prev)
      if (next.has(deckId)) next.delete(deckId)
      else next.add(deckId)
      return next
    })
  }

  // Commit the global SR start screen config and begin loading cards (DECK-03/DECK-04)
  const handleStartSession = () => {
    setCommittedConfig({
      mode: 'sr',
      tags: new Set(),
      size: sessionSize,
      count: customCount,
      deckIds: [...selectedDeckIds],
    })
  }

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
          {t('study.backToDeck')}
        </Button>
        {/* deckTitle is user content — interpolated as value (D-07) */}
        <h1 className="text-xl font-semibold mb-2">{t('study.studyDeckLabel', { deckTitle })}</h1>
        <p className="text-sm text-muted-foreground mb-4">{t('study.chooseMode')}</p>

        {/* Session config (STUDY-01, STUDY-02) — only when deck has tagged cards */}
        {availableTags.length > 0 && (
          <div className="mb-6 space-y-3">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                {t('study.filterByTag')}
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
                    {/* tag value is user content — not translated (D-07) */}
                    {tag}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                {t('study.sessionSize')}{' '}
                <span className="font-normal normal-case tracking-normal">{t('study.srModeOnly')}</span>
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
            setCommittedConfig({ mode: 'sr', tags: new Set(selectedTags), size: sessionSize, count: customCount })
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setSelectedMode('sr')
              setCommittedConfig({ mode: 'sr', tags: new Set(selectedTags), size: sessionSize, count: customCount })
            }
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Brain className="h-5 w-5" aria-hidden="true" />
            <span className="font-semibold text-sm">{t('study.srTitle')}</span>
          </div>
          <p className="text-xs text-muted-foreground">{t('study.srDescription')}</p>
          <p className="text-xs font-semibold text-foreground mt-1">
            {t('study.nCardsDue', { count: deckDueCount })}
          </p>
        </div>

        {/* Deck Mode card */}
        <div
          className="border border-border rounded-lg p-6 cursor-pointer hover:ring-2 hover:ring-ring transition-all mb-4"
          onClick={() => {
            setSelectedMode('deck')
            setCommittedConfig({ mode: 'deck', tags: new Set(selectedTags), size: sessionSize, count: customCount })
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setSelectedMode('deck')
              setCommittedConfig({ mode: 'deck', tags: new Set(selectedTags), size: sessionSize, count: customCount })
            }
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="h-5 w-5" aria-hidden="true" />
            <span className="font-semibold text-sm">{t('study.deckModeTitle')}</span>
          </div>
          <p className="text-xs text-muted-foreground">{t('study.deckModeDescription')}</p>
          <p className="text-xs font-semibold text-foreground mt-1">
            {t('study.nCardsTotal', { count: deckTotalCards })}
          </p>
        </div>

        {/* Exam Mode card */}
        <div className="border border-border rounded-lg p-6 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <Timer className="h-5 w-5" aria-hidden="true" />
            <span className="font-semibold text-sm">{t('study.examTitle')}</span>
          </div>
          <p className="text-xs text-muted-foreground">{t('study.examDescription')}</p>
          <Select
            onValueChange={(val) => setExamDurationSeconds(parseInt(val, 10))}
          >
            <SelectTrigger className="mt-3">
              <SelectValue placeholder={t('study.selectTimeLimit')} />
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
                setCommittedConfig({ mode: 'exam', tags: new Set(selectedTags), size: sessionSize, count: customCount })
              }
            }}
          >
            {t('study.startExam')}
          </Button>
        </div>
      </div>
    )
  }

  // Global SR start screen (DECK-03, DECK-04) — shown when no committed config yet
  if (isGlobalSR && !committedConfig) {
    return (
      <GlobalSRStartScreen
        activeDecks={activeDecks}
        selectedDeckIds={selectedDeckIds}
        sessionSize={sessionSize}
        customCount={customCount}
        sizeOptions={SIZE_OPTIONS}
        onToggleDeck={toggleDeckSelection}
        onSetSessionSize={setSessionSize}
        onSetCustomCount={setCustomCount}
        onStartSession={handleStartSession}
        onNavigateBack={() => navigate('/dashboard')}
      />
    )
  }

  if (loadingCards || cards === null) {
    return (
      <div className="flex items-center justify-center flex-1">
        <p className="text-sm text-muted-foreground">{t('study.loadingCards')}</p>
      </div>
    )
  }

  return (
    <SessionRunner
      cards={cards}
      mode={selectedMode}
      examDurationSeconds={examDurationSeconds}
      deckId={deckId}
      studyMode={user?.studyMode ?? 'normal'}
    />
  )
}
