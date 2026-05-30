import { BookMarked, Compass, GitFork } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ExploreDeck } from '@kartex/shared'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function ExplorePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [decks, setDecks] = useState<ExploreDeck[]>([])
  const [loading, setLoading] = useState(true)
  const [forkingId, setForkingId] = useState<string | null>(null)
  const [addingToLibraryId, setAddingToLibraryId] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'Explore — Kartex'
  }, [])

  const fetchDecks = async () => {
    try {
      const res = await api.get('/api/explore')
      if (res.ok) setDecks(await res.json())
      else toast.error('Failed to load explore decks. Please try again.')
    } catch {
      toast.error('Could not reach the server. Check your connection.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchDecks()
  }, [])

  const handleAddToLibrary = async (deck: ExploreDeck) => {
    setAddingToLibraryId(deck.id)
    try {
      const res = await api.post(`/api/decks/${deck.id}/library`)
      if (res.ok) {
        toast.success(`'${deck.title}' added to your library.`, {
          action: { label: 'View decks', onClick: () => navigate('/decks') },
        })
      } else if (res.status === 409) {
        toast.info('Already in your library.')
      } else {
        toast.error('Failed to add to library. Please try again.')
      }
    } catch {
      toast.error('Failed to add to library. Please try again.')
    } finally {
      setAddingToLibraryId(null)
    }
  }

  const handleFork = async (deck: ExploreDeck) => {
    setForkingId(deck.id)
    try {
      const res = await api.post(`/api/decks/${deck.id}/fork`)
      if (res.ok) {
        const forked = await res.json()
        toast.success(`Deck forked — 'Copy of ${deck.title}' added to your decks.`, {
          action: {
            label: 'View deck',
            onClick: () => navigate(`/decks/${forked.id}`),
          },
        })
      } else {
        toast.error('Failed to fork deck. Please try again.')
      }
    } catch {
      toast.error('Failed to fork deck. Please try again.')
    } finally {
      setForkingId(null)
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Explore</h2>

      {decks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <Compass className="h-10 w-10" aria-hidden="true" />
          <p className="text-sm font-bold">No public decks yet</p>
          <p className="text-sm">Decks made public will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {decks.map((deck) => (
            <Card key={deck.id}>
              <CardHeader>
                <CardTitle className="text-lg font-bold line-clamp-2">{deck.title}</CardTitle>
                {deck.description && (
                  <CardDescription className="line-clamp-2">{deck.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">by {deck.owner.username}</p>
                <p className="text-sm text-muted-foreground">
                  {deck._count?.cards ?? 0}{' '}
                  {deck._count?.cards === 1 ? 'card' : 'cards'}
                </p>
              </CardContent>
              <CardFooter className="gap-2">
                {deck.ownerId !== user?.id && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={addingToLibraryId === deck.id}
                      onClick={() => void handleAddToLibrary(deck)}
                    >
                      <BookMarked className="h-4 w-4 mr-1" aria-hidden="true" />
                      {addingToLibraryId === deck.id ? 'Adding…' : 'Add to Library'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={forkingId === deck.id}
                      onClick={() => void handleFork(deck)}
                    >
                      <GitFork className="h-4 w-4 mr-1" aria-hidden="true" />
                      {forkingId === deck.id ? 'Forking…' : 'Fork Deck'}
                    </Button>
                  </>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
