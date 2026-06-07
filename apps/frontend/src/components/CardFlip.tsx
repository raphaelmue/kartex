import { useTranslation } from 'react-i18next'
import type { DueCard } from '@kartex/shared'
import { KartexRenderer } from '@/components/KartexRenderer'

interface CardFlipProps {
  card: DueCard
  isFlipped: boolean
  isFlipping: boolean
  onClick: () => void
  children?: React.ReactNode  // slot for RatingButtons inside back face
}

export function CardFlip({ card, isFlipped, isFlipping, onClick, children }: CardFlipProps) {
  const { t } = useTranslation()

  // Card body height: content-driven with minimum heights per UI-SPEC
  const cardBodyStyle: React.CSSProperties = {
    transformStyle: 'preserve-3d',
    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
    transition: 'transform 300ms ease',
    position: 'relative',
  }

  const faceStyle: React.CSSProperties = {
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden' as const,
  }

  const backFaceStyle: React.CSSProperties = {
    ...faceStyle,
    transform: 'rotateY(180deg)',
    position: 'absolute',
    inset: 0,
  }

  return (
    // Outer scene: perspective context. NO overflow:hidden (Pitfall 3).
    <div style={{ perspective: '1000px' }} className="w-full max-w-2xl mx-auto">
      {/* Card body: 3D transform context — NOT a flex container (Pitfall 3) */}
      <div
        style={cardBodyStyle}
        className="relative cursor-pointer select-none"
        onClick={onClick}
        role="button"
        tabIndex={0}
        aria-label={t('a11y.flashcard')}
        onKeyDown={(e) => { if (e.code === 'Space') { e.preventDefault(); onClick() } }}
      >
        {/* Front face */}
        <div
          style={faceStyle}
          className="w-full min-h-[280px] sm:min-h-[380px] max-h-[calc(100svh-380px)] bg-card border border-border rounded-lg shadow-md p-6 sm:p-8 flex flex-col overflow-hidden"
        >
          <p className="text-xs text-muted-foreground font-normal uppercase tracking-wide mb-4 shrink-0">{t('cardEditor.frontLabel')}</p>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <KartexRenderer content={card.frontContent} />
          </div>
          <hr className="border-border mt-6 sm:mt-8 shrink-0" />
          <p className="text-xs text-muted-foreground text-center mt-4 select-none shrink-0">
            {t('a11y.revealHint')}
          </p>
        </div>

        {/* Back face — always in DOM, hidden via backface-visibility */}
        <div
          style={backFaceStyle}
          className="w-full min-h-[280px] sm:min-h-[380px] bg-card border border-border rounded-lg shadow-md p-6 sm:p-8 flex flex-col overflow-hidden"
          aria-live="polite"
        >
          <p className="text-xs text-muted-foreground font-normal uppercase tracking-wide mb-2 shrink-0">{t('cardEditor.frontLabel')}</p>
          <div className="opacity-60 mb-2 shrink-0 max-h-[72px] overflow-hidden">
            <KartexRenderer content={card.frontContent} />
          </div>
          <hr className="border-border my-3 shrink-0" />
          <p className="text-xs text-muted-foreground font-normal uppercase tracking-wide mb-2 shrink-0">{t('cardEditor.backLabel')}</p>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <KartexRenderer content={card.backContent} />
          </div>
        </div>
      </div>

      {/* Rating buttons — rendered OUTSIDE the 3D flip context, below the card scene */}
      {/* Shown only when flipped and not mid-animation (isFlipped && !isFlipping) */}
      {isFlipped && !isFlipping && (
        <div className="mt-6">
          {children}
        </div>
      )}
    </div>
  )
}
