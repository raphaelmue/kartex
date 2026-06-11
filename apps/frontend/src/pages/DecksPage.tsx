import { BookOpen, MoreVertical } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
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
import { Switch } from '@/components/ui/switch'
import { DeckFormModal } from '@/components/DeckFormModal'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

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

export function DecksPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [decks, setDecks] = useState<DeckListItem[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editDeck, setEditDeck] = useState<DeckListItem | undefined>(undefined)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  useEffect(() => {
    document.title = t('decks.title')
  }, [t, i18n.language])

  const fetchDecks = async () => {
    try {
      const res = await api.get('/api/decks')
      if (res.ok) setDecks(await res.json())
      else toast.error(t('decks.failedToLoad'))
    } catch {
      toast.error(t('common.serverUnreachable'))
    }
  }

  useEffect(() => {
    void fetchDecks()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDelete = async (id: string) => {
    try {
      const res = await api.delete(`/api/decks/${id}`)
      if (res.ok) {
        toast.success(t('decks.deckDeleted'))
        setDecks((prev) => prev.filter((d) => d.id !== id))
        setDeleteTargetId(null)
      } else {
        toast.error(t('common.somethingWrong'))
      }
    } catch {
      toast.error(t('common.somethingWrong'))
    }
  }

  const handleToggleActive = async (deckId: string, checked: boolean) => {
    setDecks((prev) =>
      prev.map((d) => (d.id === deckId ? { ...d, isActive: checked } : d))
    )
    try {
      const res = await api.patch(`/api/decks/${deckId}`, { isActive: checked })
      if (!res.ok) throw new Error('PATCH failed')
      toast.success(checked ? t('decks.activatedToast') : t('decks.deactivatedToast'))
    } catch {
      setDecks((prev) =>
        prev.map((d) => (d.id === deckId ? { ...d, isActive: !checked } : d))
      )
      toast.error(t('decks.failedToToggle'))
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
        <h2 className="text-2xl font-bold">{t('decks.pageHeading')}</h2>
        <Button onClick={openCreate}>{t('decks.newDeck')}</Button>
      </div>

      {decks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <BookOpen className="h-10 w-10" aria-hidden="true" />
          <p className="text-sm font-bold">{t('decks.noDecksYet')}</p>
          <p className="text-sm">{t('decks.createFirst')}</p>
          <Button onClick={openCreate}>{t('decks.newDeck')}</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {decks.map((deck) => (
            <div key={deck.id} className={deck.isActive ? '' : 'opacity-60'}>
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  {/* deck.title is user content — not passed through t() (D-07) */}
                  <CardTitle className="text-lg font-bold line-clamp-2">{deck.title}</CardTitle>
                  <VisibilityBadge visibility={deck.visibility} />
                </div>
                {deck.description && (
                  <CardDescription className="line-clamp-2">{deck.description}</CardDescription>
                )}
                {deck.sharedByUsername && (
                  <p className="text-xs text-muted-foreground">
                    {t('decks.sharedBy', { username: deck.sharedByUsername })}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {t('common.nCards', { count: deck._count?.cards ?? 0 })}
                </p>
              </CardContent>
              {deck.sharedByUsername ? (
                <CardFooter className="flex items-center gap-2">
                  <Button size="sm" onClick={() => navigate(`/decks/${deck.id}/learn`)}>
                    {t('decks.studyButton')}
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/decks/${deck.id}`}>{t('decks.openButton')}</Link>
                  </Button>
                </CardFooter>
              ) : (
                <CardFooter className="flex items-center gap-2">
                  <div className="flex items-center gap-2 mr-auto">
                    <Switch
                      checked={deck.isActive}
                      onCheckedChange={(checked) => void handleToggleActive(deck.id, checked)}
                      aria-label={t('decks.toggleActive')}
                      id={`active-${deck.id}`}
                    />
                    <label htmlFor={`active-${deck.id}`} className="text-sm text-muted-foreground cursor-pointer">
                      {t('decks.activeLabel')}
                    </label>
                  </div>
                  <Button size="sm" onClick={() => navigate(`/decks/${deck.id}/learn`)}>
                    {t('decks.studyButton')}
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/decks/${deck.id}`}>{t('decks.openButton')}</Link>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost" aria-label={t('decks.moreActions')}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(deck)}>
                        {t('decks.editButton')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteTargetId(deck.id)}
                      >
                        {t('decks.deleteButton')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardFooter>
              )}
            </Card>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={deleteTargetId !== null} onOpenChange={(open) => { if (!open) setDeleteTargetId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('decks.deleteConfirmTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('decks.deleteConfirmBody')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteTargetId) void handleDelete(deleteTargetId) }}
            >
              {t('decks.deleteButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DeckFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        deck={editDeck}
        onSuccess={fetchDecks}
      />
    </div>
  )
}
