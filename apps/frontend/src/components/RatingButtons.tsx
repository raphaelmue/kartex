import { useTranslation } from 'react-i18next'

interface RatingButtonsProps {
  onRate: (rating: 1 | 2 | 3 | 4) => void
  disabled?: boolean
}

const RATINGS = [
  { rating: 1 as const, labelKey: 'rating.again' as const, shortcut: '1', bg: 'bg-red-500 hover:bg-red-600' },
  { rating: 2 as const, labelKey: 'rating.hard' as const,  shortcut: '2', bg: 'bg-orange-500 hover:bg-orange-600' },
  { rating: 3 as const, labelKey: 'rating.good' as const,  shortcut: '3', bg: 'bg-green-500 hover:bg-green-600' },
  { rating: 4 as const, labelKey: 'rating.easy' as const,  shortcut: '4', bg: 'bg-blue-500 hover:bg-blue-600' },
] as const

export function RatingButtons({ onRate, disabled }: RatingButtonsProps) {
  const { t } = useTranslation()

  return (
    <div className="flex gap-2 w-full">
      {RATINGS.map(({ rating, labelKey, shortcut, bg }) => {
        const label = t(labelKey)
        return (
          <button
            key={rating}
            onClick={() => onRate(rating)}
            disabled={disabled}
            aria-label={t('rating.ariaLabel', { label, shortcut })}
            className={`flex-1 min-h-[44px] py-2 px-3 rounded-md text-white font-semibold text-sm transition-colors disabled:opacity-50 disabled:pointer-events-none flex flex-col items-center justify-center ${bg}`}
          >
            <span className="text-sm font-semibold">{label}</span>
            <span className="text-xs opacity-70">({shortcut})</span>
          </button>
        )
      })}
    </div>
  )
}
