import { useEffect, useRef, useState } from 'react'
import { Timer } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface ExamTimerProps {
  durationSeconds: number
  onExpire: () => void
}

export function ExamTimer({ durationSeconds, onExpire }: ExamTimerProps) {
  const { t } = useTranslation()
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const onExpireRef = useRef(onExpire)
  useEffect(() => { onExpireRef.current = onExpire }, [onExpire])

  // Pure state updater — no side effects
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1))
    }, 1000)

    // Pitfall 4: always clean up on unmount to prevent setState on unmounted component
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- durationSeconds is fixed for session lifetime
  }, [durationSeconds])

  // Side effects isolated in their own effect
  useEffect(() => {
    if (secondsLeft === 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      onExpireRef.current()
    }
  }, [secondsLeft])

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const secs = String(secondsLeft % 60).padStart(2, '0')

  const colorClass =
    secondsLeft <= 10
      ? 'text-red-500 animate-pulse'
      : secondsLeft <= 60
        ? 'text-orange-500'
        : 'text-foreground'

  return (
    <div
      className={`flex items-center gap-1 text-sm font-mono tabular-nums ${colorClass}`}
      role="timer"
      aria-live="off"
      aria-label={t('exam.timeRemaining', { time: `${mins}:${secs}` })}
    >
      <Timer className="h-4 w-4" aria-hidden="true" />
      <span>{mins}:{secs}</span>
    </div>
  )
}
