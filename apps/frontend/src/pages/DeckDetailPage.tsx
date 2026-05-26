import { BookOpen } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Card, Deck } from '@kartex/shared'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CardEditorModal } from '@/components/CardEditorModal'
import { DeckFormModal } from '@/components/DeckFormModal'

function VisibilityBadge({ visibility }: { visibility: 'PRIVATE' | 'SHARED' | 'PUBLIC' }) {
  if (visibility === 'PUBLIC') {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800">
        Public
      </span>
    )
  }
  if (visibility === 'SHARED') {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">
        Shared
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
      Private
    </span>
  )
}

function TagChips({ tags }: { tags: string[] }) {
  const visible = tags.slice(0, 3)
  const extra = tags.length - 3
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-secondary text-secondary-foreground gap-1"
        >
          {tag}
        </span>
      ))}
      {extra > 0 && (
        <span className="text-xs text-muted-foreground">+{extra} more</span>
      )}
    </div>
  )
}

export function DeckDetailPage() {
  const { id: deckId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [deck, setDeck] = useState<Deck | null>(null)
  const [cards, setCards] = useState<Card[]>([])
  const [deckModalOpen, setDeckModalOpen] = useState(false)
  const [cardModalOpen, setCardModalOpen] = useState(false)
  const [editCard, setEditCard] = useState<Card | undefined>(undefined)
  const [confirmDeleteCardId, setConfirmDeleteCardId] = useState<string | null>(null)
  const [confirmDeleteDeck, setConfirmDeleteDeck] = useState(false)

  useEffect(() => {
    if (deck) document.title = `${deck.title} — Kartex`
    else document.title = 'Deck — Kartex'
  }, [deck])

  const fetchDeck = async () => {
    if (!deckId) return
    try {
      const res = await api.get(`/api/decks/${deckId}`)
      if (res.ok) setDeck(await res.json())
      else navigate('/decks')
    } catch {
      navigate('/decks')
    }
  }

  const fetchCards = async () => {
    if (!deckId) return
    try {
      const res = await api.get(`/api/decks/${deckId}/cards`)
      if (res.ok) setCards(await res.json())
    } catch {
      // silently ignore
    }
  }

  useEffect(() => {
    void fetchDeck()
    void fetchCards()
  }, [deckId])

  const handleDeleteDeck = async () => {
    if (!deckId) return
    try {
      const res = await api.delete(`/api/decks/${deckId}`)
      if (res.ok) {
        toast.success('Deck deleted')
        navigate('/decks')
      } else {
        toast.error('Something went wrong. Please try again.')
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    }
  }

  const handleDeleteCard = async (cardId: string) => {
    if (!deckId) return
    try {
      const res = await api.delete(`/api/decks/${deckId}/cards/${cardId}`)
      if (res.ok) {
        toast.success('Card deleted')
        setCards((prev) => prev.filter((c) => c.id !== cardId))
        setConfirmDeleteCardId(null)
      } else {
        toast.error('Something went wrong. Please try again.')
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    }
  }

  const openAddCard = () => {
    setEditCard(undefined)
    setCardModalOpen(true)
  }

  const openEditCard = (card: Card) => {
    setEditCard(card)
    setCardModalOpen(true)
  }

  if (!deck) return null

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">{deck.title}</h2>
          {deck.description && (
            <p className="text-sm text-muted-foreground">{deck.description}</p>
          )}
          <VisibilityBadge visibility={deck.visibility} />
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setDeckModalOpen(true)}>
            Edit Deck
          </Button>
          {confirmDeleteDeck ? (
            <div className="flex items-center gap-2" role="alert">
              <span className="text-sm text-muted-foreground">Are you sure?</span>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => void handleDeleteDeck()}
              >
                Yes, delete
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirmDeleteDeck(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setConfirmDeleteDeck(true)}
            >
              Delete Deck
            </Button>
          )}
        </div>
      </div>

      <Table aria-label="Cards in deck">
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Front</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cards.length === 0 && (
            <TableRow>
              <TableCell colSpan={4}>
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                  <BookOpen className="h-10 w-10" aria-hidden="true" />
                  <p className="text-sm font-bold">No cards yet</p>
                  <p className="text-sm">Add your first card to this deck.</p>
                  <Button onClick={openAddCard}>Add Card</Button>
                </div>
              </TableCell>
            </TableRow>
          )}
          {cards.map((card, i) => (
            <TableRow key={card.id}>
              <TableCell className="w-12">{i + 1}</TableCell>
              <TableCell className="max-w-xs truncate">{card.frontContent}</TableCell>
              <TableCell>
                <TagChips tags={card.tags} />
              </TableCell>
              <TableCell>
                {confirmDeleteCardId === card.id ? (
                  <div className="flex items-center gap-2" role="alert">
                    <span className="text-sm text-muted-foreground">Are you sure?</span>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => void handleDeleteCard(card.id)}
                    >
                      Yes, delete
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setConfirmDeleteCardId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEditCard(card)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setConfirmDeleteCardId(card.id)}
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {cards.length > 0 && (
        <div className="mt-4">
          <Button onClick={openAddCard}>Add Card</Button>
        </div>
      )}

      <DeckFormModal
        open={deckModalOpen}
        onOpenChange={setDeckModalOpen}
        deck={deck}
        onSuccess={fetchDeck}
      />

      {deckId && (
        <CardEditorModal
          open={cardModalOpen}
          onOpenChange={setCardModalOpen}
          deckId={deckId}
          card={editCard}
          onSuccess={fetchCards}
        />
      )}
    </div>
  )
}
