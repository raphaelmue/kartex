import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CardFlip } from '@/components/CardFlip'
import { RatingButtons } from '@/components/RatingButtons'
import type { DueCard } from '@kartex/shared'

// Mock KartexRenderer to avoid WASM/KaTeX complexity in unit tests
vi.mock('@/components/KartexRenderer', () => ({
  KartexRenderer: ({ content }: { content: string }) => <div data-testid="renderer">{content}</div>,
}))

const mockCard: DueCard = {
  id: 'card-1',
  deckId: 'deck-1',
  deckTitle: 'Test Deck',
  frontContent: 'What is 2+2?',
  backContent: '4',
  tags: [],
  easeFactor: 2.5,
  interval: 1,
  repetitions: 0,
}

describe('CardFlip', () => {
  it('does not render rating buttons children when not flipped', () => {
    render(
      <CardFlip card={mockCard} isFlipped={false} isFlipping={false} onClick={vi.fn()}>
        <RatingButtons onRate={vi.fn()} />
      </CardFlip>
    )
    // Rating buttons should not be in the DOM when isFlipped=false
    expect(screen.queryByRole('button', { name: /again/i })).toBeNull()
  })

  it('renders rating buttons children when flipped and not mid-animation', () => {
    render(
      <CardFlip card={mockCard} isFlipped={true} isFlipping={false} onClick={vi.fn()}>
        <RatingButtons onRate={vi.fn()} />
      </CardFlip>
    )
    expect(screen.getByRole('button', { name: /again/i })).toBeTruthy()
  })

  it('does not render rating buttons during flip animation (isFlipping=true)', () => {
    render(
      <CardFlip card={mockCard} isFlipped={true} isFlipping={true} onClick={vi.fn()}>
        <RatingButtons onRate={vi.fn()} />
      </CardFlip>
    )
    expect(screen.queryByRole('button', { name: /again/i })).toBeNull()
  })

  it('calls onClick when card wrapper is clicked', () => {
    const onClick = vi.fn()
    render(
      <CardFlip card={mockCard} isFlipped={false} isFlipping={false} onClick={onClick}>
        <RatingButtons onRate={vi.fn()} />
      </CardFlip>
    )
    // Click the card body (role=button)
    const cardBody = screen.getByRole('button', { name: /flashcard/i })
    fireEvent.click(cardBody)
    expect(onClick).toHaveBeenCalledOnce()
  })
})

describe('RatingButtons', () => {
  it('renders four buttons with correct labels', () => {
    render(<RatingButtons onRate={vi.fn()} />)
    expect(screen.getByRole('button', { name: /again/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /hard/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /good/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /easy/i })).toBeTruthy()
  })

  it('calls onRate(1) when Again is clicked', () => {
    const onRate = vi.fn()
    render(<RatingButtons onRate={onRate} />)
    fireEvent.click(screen.getByRole('button', { name: /again/i }))
    expect(onRate).toHaveBeenCalledWith(1)
  })

  it('calls onRate(4) when Easy is clicked', () => {
    const onRate = vi.fn()
    render(<RatingButtons onRate={onRate} />)
    fireEvent.click(screen.getByRole('button', { name: /easy/i }))
    expect(onRate).toHaveBeenCalledWith(4)
  })

  it('buttons are disabled when disabled prop is true', () => {
    render(<RatingButtons onRate={vi.fn()} disabled={true} />)
    const buttons = screen.getAllByRole('button')
    buttons.forEach((btn) => expect(btn).toBeDisabled())
  })
})
