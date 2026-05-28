import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { DueCard } from '@kartex/shared'
import { api } from '@/lib/api'

export type StudyMode = 'sr' | 'deck' | 'exam'
export type CardFace = 'front' | 'back'

interface RatingCounts {
  again: number
  hard: number
  good: number
  easy: number
}

interface UseStudySessionReturn {
  currentCard: DueCard | null
  face: CardFace
  isFlipping: boolean
  sessionDone: boolean
  progress: { current: number; total: number }
  ratingCounts: RatingCounts
  flip: () => void
  rate: (rating: 1 | 2 | 3 | 4) => void
}

export function useStudySession(cards: DueCard[], mode: StudyMode): UseStudySessionReturn {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [face, setFace] = useState<CardFace>('front')
  const [isFlipping, setIsFlipping] = useState(false)
  const [sessionDone, setSessionDone] = useState(false)
  const [ratingCounts, setRatingCounts] = useState<RatingCounts>({
    again: 0, hard: 0, good: 0, easy: 0,
  })

  // Use ref for face in keyboard handler to avoid stale closure (RESEARCH Pitfall 8)
  const faceRef = useRef<CardFace>('front')
  const isFlippingRef = useRef(false)

  const flip = useCallback(() => {
    if (faceRef.current !== 'front' || isFlippingRef.current) return
    isFlippingRef.current = true
    setIsFlipping(true)
    // Content switch: both faces always in DOM (backface-visibility handles hiding)
    // We just need to drive the CSS class flip — no content swap needed
    setTimeout(() => {
      faceRef.current = 'back'
      setFace('back')
    }, 150)
    setTimeout(() => {
      isFlippingRef.current = false
      setIsFlipping(false)
    }, 300)
  }, [])

  const rate = useCallback(
    async (rating: 1 | 2 | 3 | 4) => {
      if (faceRef.current !== 'back' || isFlippingRef.current) return

      const card = cards[currentIndex]
      if (!card) return

      // Update rating counts for completion screen
      const ratingKey = rating === 1 ? 'again' : rating === 2 ? 'hard' : rating === 3 ? 'good' : 'easy'
      setRatingCounts((prev) => ({ ...prev, [ratingKey]: prev[ratingKey] + 1 }))

      // T-4-04: Exam mode skips POST /api/study/rate entirely — progress NOT saved (STDY-05)
      if (mode !== 'exam') {
        try {
          const res = await api.post('/api/study/rate', { cardId: card.id, rating })
          if (!res.ok) {
            toast.error('Failed to save your rating. Please try again.')
            // Do not advance — let user try again
            return
          }
        } catch {
          toast.error('Failed to save your rating. Please try again.')
          return
        }
      }

      // Advance to next card
      const nextIndex = currentIndex + 1
      if (nextIndex >= cards.length) {
        setSessionDone(true)
      } else {
        setCurrentIndex(nextIndex)
        faceRef.current = 'front'
        setFace('front')
      }
    },
    [cards, currentIndex, mode]
  )

  // Keyboard handler: Space → flip, 1-4 → rate (only when face=back — Pitfall 8)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Space flips (when front)
      if (e.code === 'Space' && faceRef.current === 'front' && !isFlippingRef.current) {
        e.preventDefault()
        void flip()
        return
      }
      // 1-4 rates (when back)
      if (faceRef.current === 'back' && !isFlippingRef.current) {
        if (e.key === '1') { e.preventDefault(); void rate(1) }
        if (e.key === '2') { e.preventDefault(); void rate(2) }
        if (e.key === '3') { e.preventDefault(); void rate(3) }
        if (e.key === '4') { e.preventDefault(); void rate(4) }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [flip, rate])

  const currentCard = cards[currentIndex] ?? null

  return {
    currentCard,
    face,
    isFlipping,
    sessionDone,
    progress: { current: currentIndex + 1, total: cards.length },
    ratingCounts,
    flip,
    rate,
  }
}
