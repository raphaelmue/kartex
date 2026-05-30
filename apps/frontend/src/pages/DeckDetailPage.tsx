import { BookOpen } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Card, Deck, Share } from '@kartex/shared'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

function PermissionBadge({ permission }: { permission: 'READ' | 'EDIT' | 'MANAGE' }) {
  if (permission === 'MANAGE') {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800">
        Manage
      </span>
    )
  }
  if (permission === 'EDIT') {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">
        Edit
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-secondary text-secondary-foreground">
      Read
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

type DeckWithPermission = Deck & { userPermission?: string; owner?: { username: string } }

export function DeckDetailPage() {
  const { id: deckId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [deck, setDeck] = useState<DeckWithPermission | null>(null)
  const [cards, setCards] = useState<Card[]>([])
  const [deckModalOpen, setDeckModalOpen] = useState(false)
  const [cardModalOpen, setCardModalOpen] = useState(false)
  const [editCard, setEditCard] = useState<Card | undefined>(undefined)
  const [confirmDeleteCardId, setConfirmDeleteCardId] = useState<string | null>(null)
  const [confirmDeleteDeck, setConfirmDeleteDeck] = useState(false)
  const [shares, setShares] = useState<Share[]>([])
  const [shareUsername, setShareUsername] = useState('')
  const [sharePermission, setSharePermission] = useState<'READ' | 'EDIT' | 'MANAGE'>('READ')
  const [shareError, setShareError] = useState<string | null>(null)
  const [shareLoading, setShareLoading] = useState(false)

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
      else toast.error('Failed to load cards. Please try again.')
    } catch {
      toast.error('Could not reach the server. Check your connection.')
    }
  }

  const fetchShares = async () => {
    if (!deckId) return
    try {
      const res = await api.get(`/api/decks/${deckId}/shares`)
      if (res.ok) setShares(await res.json())
    } catch {
      // Non-blocking — sharing section will just show empty
    }
  }

  useEffect(() => {
    void fetchDeck()
    void fetchCards()
  // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch fns are component-scoped; deckId is the only meaningful dep
  }, [deckId])

  useEffect(() => {
    if (!deck || !user) return
    const isOwnerOrManage =
      deck.ownerId === user.id || deck.userPermission === 'MANAGE'
    if (isOwnerOrManage) {
      void fetchShares()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck?.id, user?.id])

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

  const handleAddShare = async () => {
    if (!deckId || !shareUsername.trim()) return
    setShareError(null)
    setShareLoading(true)
    try {
      const res = await api.post(`/api/decks/${deckId}/shares`, {
        username: shareUsername.trim(),
        permission: sharePermission,
      })
      if (res.ok) {
        setShareUsername('')
        await fetchShares()
      } else {
        const data = await res.json()
        setShareError((data as { error?: string }).error ?? 'Failed to add user.')
      }
    } catch {
      setShareError('Could not reach the server.')
    } finally {
      setShareLoading(false)
    }
  }

  const handleRevokeShare = async (sharedWithUserId: string) => {
    if (!deckId) return
    try {
      const res = await api.delete(`/api/decks/${deckId}/shares/${sharedWithUserId}`)
      if (res.ok) {
        setShares((prev) => prev.filter((s) => s.sharedWithUserId !== sharedWithUserId))
      } else {
        toast.error('Something went wrong. Please try again.')
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    }
  }

  const handleUpdateSharePermission = async (
    sharedWithUserId: string,
    permission: 'READ' | 'EDIT' | 'MANAGE',
  ) => {
    if (!deckId) return
    try {
      const res = await api.patch(`/api/decks/${deckId}/shares/${sharedWithUserId}`, {
        permission,
      })
      if (res.ok) {
        setShares((prev) =>
          prev.map((s) =>
            s.sharedWithUserId === sharedWithUserId ? { ...s, permission } : s,
          ),
        )
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
          {deck.ownerId !== user?.id && deck.owner && (
            <p className="text-sm text-muted-foreground">Owned by {deck.owner.username}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => navigate(`/decks/${deckId}/learn`)}>
            Study Deck
          </Button>
          {deck.ownerId === user?.id && (
            <>
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
            </>
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

      {(deck.ownerId === user?.id || deck.userPermission === 'MANAGE') && (
        <div className="mt-8 pt-6 border-t border-border">
          <h3 className="text-lg font-semibold mb-4">Share this deck</h3>

          <div className="flex items-center gap-2 mb-6">
            <Input
              placeholder="Username"
              value={shareUsername}
              onChange={(e) => setShareUsername(e.target.value)}
              className="flex-1 max-w-xs"
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleAddShare()
              }}
            />
            <Select
              value={sharePermission}
              onValueChange={(v) => setSharePermission(v as 'READ' | 'EDIT' | 'MANAGE')}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="READ">Read</SelectItem>
                <SelectItem value="EDIT">Edit</SelectItem>
                <SelectItem value="MANAGE">Manage</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => void handleAddShare()} disabled={shareLoading}>
              Add User
            </Button>
          </div>

          {shareError && (
            <p className="text-sm text-destructive -mt-4 mb-4">{shareError}</p>
          )}

          {shares.length === 0 ? (
            <p className="text-sm text-muted-foreground">Not shared with anyone yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Permission</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {shares.map((share) => (
                  <TableRow key={share.sharedWithUserId}>
                    <TableCell className="text-sm">{share.sharedWithUser.username}</TableCell>
                    <TableCell>
                      <PermissionBadge permission={share.permission} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Select
                          value={share.permission}
                          onValueChange={(v) =>
                            void handleUpdateSharePermission(
                              share.sharedWithUserId,
                              v as 'READ' | 'EDIT' | 'MANAGE',
                            )
                          }
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="READ">Read</SelectItem>
                            <SelectItem value="EDIT">Edit</SelectItem>
                            <SelectItem value="MANAGE">Manage</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => void handleRevokeShare(share.sharedWithUserId)}
                        >
                          Revoke Access
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
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
