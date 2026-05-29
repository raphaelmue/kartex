import { BookOpen } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { DeckListItem } from '@kartex/shared'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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

export function DecksPage() {
  const [decks, setDecks] = useState<DeckListItem[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editDeck, setEditDeck] = useState<DeckListItem | undefined>(undefined)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'Decks — Kartex'
  }, [])

  const fetchDecks = async () => {
    try {
      const res = await api.get('/api/decks')
      if (res.ok) setDecks(await res.json())
      else toast.error('Failed to load decks. Please try again.')
    } catch {
      toast.error('Could not reach the server. Check your connection.')
    }
  }

  useEffect(() => {
    void fetchDecks()
  }, [])

  const handleDelete = async (id: string) => {
    try {
      const res = await api.delete(`/api/decks/${id}`)
      if (res.ok) {
        toast.success('Deck deleted')
        setDecks((prev) => prev.filter((d) => d.id !== id))
        setConfirmDeleteId(null)
      } else {
        toast.error('Something went wrong. Please try again.')
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    }
  }

  const openCreate = () => {
    setEditDeck(undefined)
    setModalOpen(true)
  }

  const openEdit = (deck: DeckListItem) => {
    setEditDeck(deck)
    setModalOpen(true)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Decks</h2>
        <Button onClick={openCreate}>New Deck</Button>
      </div>

      {decks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <BookOpen className="h-10 w-10" aria-hidden="true" />
          <p className="text-sm font-bold">No decks yet</p>
          <p className="text-sm">Create your first deck to start organizing your flashcards.</p>
          <Button onClick={openCreate}>New Deck</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {decks.map((deck) => (
            <Card key={deck.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg font-bold line-clamp-2">{deck.title}</CardTitle>
                  <VisibilityBadge visibility={deck.visibility} />
                </div>
                {deck.description && (
                  <CardDescription className="line-clamp-2">{deck.description}</CardDescription>
                )}
                {deck.sharedByUsername && (
                  <p className="text-xs text-muted-foreground">Shared by {deck.sharedByUsername}</p>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {deck._count?.cards ?? 0}{' '}
                  {deck._count?.cards === 1 ? 'card' : 'cards'}
                </p>
              </CardContent>
              <CardFooter className="flex items-center gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link to={`/decks/${deck.id}`}>Open</Link>
                </Button>
                <Button size="sm" variant="outline" onClick={() => openEdit(deck)}>
                  Edit
                </Button>
                {confirmDeleteId === deck.id ? (
                  <div className="flex items-center gap-2" role="alert">
                    <span className="text-sm text-muted-foreground">Are you sure?</span>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => void handleDelete(deck.id)}
                    >
                      Yes, delete
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setConfirmDeleteId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setConfirmDeleteId(deck.id)}
                  >
                    Delete
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <DeckFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        deck={editDeck}
        onSuccess={fetchDecks}
      />
    </div>
  )
}
