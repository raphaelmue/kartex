import { useEffect, useRef, useState } from 'react'
import { Timer } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface SessionTimerProps {
  startedAt: number
}

// Count-up elapsed timer for normal/SR/deck study modes (D-01, D-02).
// Mirrors ExamTimer's mm:ss formatting + a11y contract but drops the
// color-shift thresholds (no "running out" semantic for a count-up clock)
// and adds a Page Visibility API pause so idle/backgrounded time is never
// counted (D-05).
export function SessionTimer({ startedAt }: SessionTimerProps) {
  const { t } = useTranslation()
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pausedMsRef = useRef(0)
  const hiddenSinceRef = useRef<number | null>(null)

  useEffect(() => {
    timerRef.current = setInterval(() => {
      // Skip the tick entirely while hidden — the displayed value must not advance (D-05)
      if (document.hidden) return
      setElapsed(Math.floor((Date.now() - startedAt - pausedMsRef.current) / 1000))
    }, 1000)

    // Pitfall 4: always clean up on unmount to prevent setState on unmounted component
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- startedAt is fixed for session lifetime
  }, [startedAt])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        hiddenSinceRef.current = Date.now()
      } else if (hiddenSinceRef.current !== null) {
        pausedMsRef.current += Date.now() - hiddenSinceRef.current
        hiddenSinceRef.current = null
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  const mins = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const secs = String(elapsed % 60).padStart(2, '0')

  return (
    <div
      className="flex items-center gap-1 text-sm font-mono tabular-nums text-foreground"
      role="timer"
      aria-live="off"
      aria-label={t('study.sessionElapsedAriaLabel', { time: `${mins}:${secs}` })}
    >
      <Timer className="h-4 w-4" aria-hidden="true" />
      <span>{mins}:{secs}</span>
    </div>
  )
}
