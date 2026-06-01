import { BookOpen } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Card, Deck, Share } from '@kartex/shared'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { groupCardsByFirstTag } from '@/utils/groupCardsByFirstTag'
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
  const { t } = useTranslation()
  if (visibility === 'PUBLIC') {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800">
        {t('visibility.public')}
      </span>
    )
  }
  if (visibility === 'SHARED') {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">
        {t('visibility.shared')}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
      {t('visibility.private')}
    </span>
  )
}

function PermissionBadge({ permission }: { permission: 'READ' | 'EDIT' | 'MANAGE' }) {
  const { t } = useTranslation()
  if (permission === 'MANAGE') {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800">
        {t('permission.manage')}
      </span>
    )
  }
  if (permission === 'EDIT') {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">
        {t('permission.edit')}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-secondary text-secondary-foreground">
      {t('permission.read')}
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

type CardActionCellProps = { card: Card; confirmDeleteCardId: string | null; onEdit: (c: Card) => void; onDelete: (id: string) => void; onCancelDelete: () => void }
function CardActionCell({ card, confirmDeleteCardId, onEdit, onDelete, onCancelDelete }: CardActionCellProps) {
  const { t } = useTranslation()
  if (confirmDeleteCardId === card.id) return (
    <div className="flex items-center gap-2" role="alert">
      <span className="text-sm text-muted-foreground">{t('common.confirm')}</span>
      <Button size="sm" variant="destructive" onClick={() => onDelete(card.id)}>{t('common.yesDelete')}</Button>
      <Button size="sm" variant="outline" onClick={onCancelDelete}>{t('common.cancel')}</Button>
    </div>
  )
  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" onClick={() => onEdit(card)}>{t('common.edit')}</Button>
      <Button size="sm" variant="destructive" onClick={() => onDelete(card.id)}>{t('common.delete')}</Button>
    </div>
  )
}

export function DeckDetailPage() {
  const { t, i18n } = useTranslation()
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
    // Edge Case 1: deck.title is user content — not wrapped in t() (D-07)
    if (deck) document.title = `${deck.title} — Kartex`
    else document.title = t('deckDetail.title')
  }, [deck, t, i18n.language])

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
      else toast.error(t('deckDetail.failedToLoadCards'))
    } catch {
      toast.error(t('common.serverUnreachable'))
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
        toast.success(t('decks.deckDeleted'))
        navigate('/decks')
      } else {
        toast.error(t('common.somethingWrong'))
      }
    } catch {
      toast.error(t('common.somethingWrong'))
    }
  }

  const handleDeleteCard = async (cardId: string) => {
    if (!deckId) return
    try {
      const res = await api.delete(`/api/decks/${deckId}/cards/${cardId}`)
      if (res.ok) {
        toast.success(t('deckDetail.cardDeleted'))
        setCards((prev) => prev.filter((c) => c.id !== cardId))
        setConfirmDeleteCardId(null)
      } else {
        toast.error(t('common.somethingWrong'))
      }
    } catch {
      toast.error(t('common.somethingWrong'))
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
        setShareError((data as { error?: string }).error ?? t('deckDetail.failedToAddUser'))
      }
    } catch {
      setShareError(t('common.serverUnreachable'))
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
        toast.error(t('common.somethingWrong'))
      }
    } catch {
      toast.error(t('common.somethingWrong'))
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
        toast.error(t('common.somethingWrong'))
      }
    } catch {
      toast.error(t('common.somethingWrong'))
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

  const canEdit =
    deck.ownerId === user?.id ||
    deck.userPermission === 'EDIT' ||
    deck.userPermission === 'MANAGE'

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div className="space-y-1">
          {/* deck.title is user content — not passed through t() (D-07) */}
          <h2 className="text-2xl font-bold">{deck.title}</h2>
          {deck.description && (
            <p className="text-sm text-muted-foreground">{deck.description}</p>
          )}
          <VisibilityBadge visibility={deck.visibility} />
          {deck.ownerId !== user?.id && deck.owner && (
            <p className="text-sm text-muted-foreground">
              {t('deckDetail.ownedBy', { username: deck.owner.username })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => navigate(`/decks/${deckId}/learn`)}>
            {t('deckDetail.studyDeck')}
          </Button>
          {deck.ownerId === user?.id && (
            <>
              <Button size="sm" variant="outline" onClick={() => setDeckModalOpen(true)}>
                {t('deckDetail.editDeck')}
              </Button>
              {confirmDeleteDeck ? (
                <div className="flex items-center gap-2" role="alert">
                  <span className="text-sm text-muted-foreground">{t('common.confirm')}</span>
                  <Button size="sm" variant="destructive" onClick={() => void handleDeleteDeck()}>{t('common.yesDelete')}</Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirmDeleteDeck(false)}>{t('common.cancel')}</Button>
                </div>
              ) : (
                <Button size="sm" variant="destructive" onClick={() => setConfirmDeleteDeck(true)}>{t('deckDetail.deleteDeck')}</Button>
              )}
            </>
          )}
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <BookOpen className="h-10 w-10" aria-hidden="true" />
          <p className="text-sm font-bold">{t('deckDetail.noCardsYet')}</p>
          {canEdit ? (
            <>
              <p className="text-sm">{t('deckDetail.addFirstCard')}</p>
              <Button onClick={openAddCard}>{t('deckDetail.addCard')}</Button>
            </>
          ) : (
            <p className="text-sm">{t('deckDetail.deckHasNoCards')}</p>
          )}
        </div>
      ) : (
        groupCardsByFirstTag(cards).map(({ tag, cards: groupCards }) => (
          <div key={tag} className="mb-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              {/* tag value is user content — not passed through t() (D-07) */}
              {tag}
              <span className="font-normal normal-case tracking-normal ml-1">
                {t('deckDetail.nCardsInGroup', { count: groupCards.length })}
              </span>
            </h3>
            <Table aria-label={t('deckDetail.cardsTableAriaLabel', { tag })}>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">{t('table.numberColumn')}</TableHead>
                  <TableHead>{t('table.frontColumn')}</TableHead>
                  <TableHead>{t('table.tagsColumn')}</TableHead>
                  <TableHead>{t('table.actionsColumn')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupCards.map((card, i) => (
                  <TableRow key={card.id}>
                    <TableCell className="w-12">{i + 1}</TableCell>
                    {/* card.frontContent is user content — not translated (D-07) */}
                    <TableCell className="max-w-xs truncate">{card.frontContent}</TableCell>
                    <TableCell>
                      <TagChips tags={card.tags} />
                    </TableCell>
                    <TableCell>
                      {canEdit && (
                        <CardActionCell
                          card={card}
                          confirmDeleteCardId={confirmDeleteCardId}
                          onEdit={openEditCard}
                          onDelete={(id) => void handleDeleteCard(id)}
                          onCancelDelete={() => setConfirmDeleteCardId(null)}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ))
      )}

      {canEdit && cards.length > 0 && (
        <div className="mt-4">
          <Button onClick={openAddCard}>{t('deckDetail.addCard')}</Button>
        </div>
      )}

      {(deck.ownerId === user?.id || deck.userPermission === 'MANAGE') && (
        <div className="mt-8 pt-6 border-t border-border">
          <h3 className="text-lg font-semibold mb-4">{t('deckDetail.shareThisDeck')}</h3>

          <div className="flex items-center gap-2 mb-6">
            <Input
              placeholder={t('deckDetail.usernamePlaceholder')}
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
                <SelectItem value="READ">{t('permission.read')}</SelectItem>
                <SelectItem value="EDIT">{t('permission.edit')}</SelectItem>
                <SelectItem value="MANAGE">{t('permission.manage')}</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => void handleAddShare()} disabled={shareLoading}>
              {t('deckDetail.addUser')}
            </Button>
          </div>

          {shareError && (
            <p className="text-sm text-destructive -mt-4 mb-4">{shareError}</p>
          )}

          {shares.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('deckDetail.notShared')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('deckDetail.userColumn')}</TableHead>
                  <TableHead>{t('deckDetail.permissionColumn')}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {shares.map((share) => (
                  <TableRow key={share.sharedWithUserId}>
                    {/* username is user content — not translated (D-07) */}
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
                            <SelectItem value="READ">{t('permission.read')}</SelectItem>
                            <SelectItem value="EDIT">{t('permission.edit')}</SelectItem>
                            <SelectItem value="MANAGE">{t('permission.manage')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => void handleRevokeShare(share.sharedWithUserId)}
                        >
                          {t('deckDetail.revokeAccess')}
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
