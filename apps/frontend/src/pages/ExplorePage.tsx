import { BookMarked, Compass, GitFork } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [decks, setDecks] = useState<ExploreDeck[]>([])
  const [loading, setLoading] = useState(true)
  const [forkingId, setForkingId] = useState<string | null>(null)
  const [addingToLibraryId, setAddingToLibraryId] = useState<string | null>(null)

  useEffect(() => {
    document.title = t('explore.title')
  }, [t, i18n.language])

  const fetchDecks = async () => {
    try {
      const res = await api.get('/api/explore')
      if (res.ok) setDecks(await res.json())
      else toast.error(t('explore.failedToLoad'))
    } catch {
      toast.error(t('common.serverUnreachable'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchDecks()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAddToLibrary = async (deck: ExploreDeck) => {
    setAddingToLibraryId(deck.id)
    try {
      const res = await api.post(`/api/decks/${deck.id}/library`)
      if (res.ok) {
        toast.success(t('explore.addedToLibrary', { title: deck.title }), {
          action: { label: t('explore.viewDecks'), onClick: () => navigate('/decks') },
        })
      } else if (res.status === 409) {
        toast.info(t('explore.alreadyInLibrary'))
      } else {
        toast.error(t('explore.failedToAdd'))
      }
    } catch {
      toast.error(t('explore.failedToAdd'))
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
        toast.success(t('explore.forkedDeck', { title: deck.title }), {
          action: {
            label: t('explore.viewDeck'),
            onClick: () => navigate(`/decks/${forked.id}`),
          },
        })
      } else {
        toast.error(t('explore.failedToFork'))
      }
    } catch {
      toast.error(t('explore.failedToFork'))
    } finally {
      setForkingId(null)
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">{t('explore.pageHeading')}</h2>

      {decks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <Compass className="h-10 w-10" aria-hidden="true" />
          <p className="text-sm font-bold">{t('explore.noPublicDecks')}</p>
          <p className="text-sm">{t('explore.noPublicDecksHint')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {decks.map((deck) => (
            <Card key={deck.id}>
              <CardHeader>
                {/* deck.title is user content — interpolated as value only (D-07) */}
                <CardTitle className="text-lg font-bold line-clamp-2">{deck.title}</CardTitle>
                {deck.description && (
                  <CardDescription className="line-clamp-2">{deck.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {t('explore.byAuthor', { username: deck.owner.username })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('common.nCards', { count: deck._count?.cards ?? 0 })}
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
                      {addingToLibraryId === deck.id ? t('explore.adding') : t('explore.addToLibrary')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={forkingId === deck.id}
                      onClick={() => void handleFork(deck)}
                    >
                      <GitFork className="h-4 w-4 mr-1" aria-hidden="true" />
                      {forkingId === deck.id ? t('explore.forking') : t('explore.forkDeck')}
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
