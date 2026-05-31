import { Card } from '@kartex/shared'

export function groupCardsByFirstTag(cards: Card[]): { tag: string; cards: Card[] }[] {
  const groups = new Map<string, Card[]>()

  for (const card of cards) {
    const tag = card.tags[0] ?? 'Untagged'
    if (!groups.has(tag)) groups.set(tag, [])
    groups.get(tag)!.push(card)
  }

  // Sort alphabetically by tag name, Untagged always last
  const sorted = [...groups.entries()]
    .filter(([tag]) => tag !== 'Untagged')
    .sort(([a], [b]) => a.localeCompare(b))

  if (groups.has('Untagged')) {
    sorted.push(['Untagged', groups.get('Untagged')!])
  }

  return sorted.map(([tag, cards]) => ({ tag, cards }))
}
