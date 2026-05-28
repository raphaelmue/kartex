interface SessionProgressProps {
  current: number
  total: number
}

export function SessionProgress({ current, total }: SessionProgressProps) {
  return (
    <p
      className="text-sm text-muted-foreground text-center mb-4"
      aria-label={`Card ${current} of ${total}`}
    >
      Card {current} of {total}
    </p>
  )
}
