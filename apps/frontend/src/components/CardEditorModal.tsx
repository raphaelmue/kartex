import { useEffect, useRef, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import {
  CreateCardSchema,
  Card,
} from '@kartex/shared'
import { api } from '@/lib/api'
import { KartexRenderer } from '@/components/KartexRenderer'
import { MediaUploadToolbar } from '@/components/MediaUploadToolbar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Use input type so zodResolver generic matches (tags has .default([]))
type CardFormInput = z.input<typeof CreateCardSchema>

type EditableCard = Pick<Card, 'id' | 'deckId' | 'frontContent' | 'backContent' | 'tags'>

interface CardEditorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deckId: string
  card?: EditableCard
  onSuccess: () => void
  onCardUpdated?: (updated: EditableCard) => void
  /**
   * When true, skips Radix Dialog's default open-auto-focus behavior. Needed when this
   * modal is opened as the direct result of a DropdownMenuItem selection (e.g. the study
   * session's quick-edit menu): two Radix FocusScopes (the closing DropdownMenu's and this
   * Dialog's) both trying to move focus in the same tick causes a focus/blur loop that
   * crashes JSDOM test workers (radix-ui/primitives#1836 — not observed in real browsers).
   * Defaults to false so other call sites (e.g. DeckDetailPage add/edit via a plain button)
   * keep the standard accessible auto-focus-into-dialog behavior.
   */
  skipOpenAutoFocus?: boolean
}

export function CardEditorModal({
  open,
  onOpenChange,
  deckId,
  card,
  onSuccess,
  onCardUpdated,
  skipOpenAutoFocus = false,
}: CardEditorModalProps) {
  const { t } = useTranslation()
  const isEdit = Boolean(card)
  const [tagInput, setTagInput] = useState(card?.tags.join(', ') ?? '')

  const form = useForm<CardFormInput>({
    resolver: zodResolver(CreateCardSchema),
    defaultValues: {
      frontContent: card?.frontContent ?? '',
      backContent: card?.backContent ?? '',
      tags: card?.tags ?? [],
    },
  })
  const { isSubmitting } = form.formState

  // Refs for cursor-position media insertion (D-03)
  const frontRef = useRef<HTMLTextAreaElement | null>(null)
  const backRef = useRef<HTMLTextAreaElement | null>(null)
  // Deferred-focus target for skipOpenAutoFocus (CR-01) — see onOpenAutoFocus below
  const contentRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (open) {
      form.reset({
        frontContent: card?.frontContent ?? '',
        backContent: card?.backContent ?? '',
        tags: card?.tags ?? [],
      })
      setTagInput(card?.tags.join(', ') ?? '')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- form is stable (react-hook-form internal ref)
  }, [open, card])

  const onSubmit = async (data: CardFormInput) => {
    const tags = tagInput.split(',').map((tag) => tag.trim()).filter(Boolean)
    const payload = { ...data, tags }
    try {
      const res = isEdit && card
        ? await api.patch(`/api/decks/${deckId}/cards/${card.id}`, payload)
        : await api.post(`/api/decks/${deckId}/cards`, payload)
      if (res.ok) {
        if (isEdit) {
          const updated = await res.json() as EditableCard
          onCardUpdated?.(updated)
        }
        toast.success(isEdit ? t('cardEditor.cardUpdated') : t('cardEditor.cardAdded'))
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(t('common.somethingWrong'))
      }
    } catch {
      toast.error(t('common.somethingWrong'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl"
        ref={contentRef}
        onOpenAutoFocus={
          skipOpenAutoFocus
            ? (event) => {
                // Defer focus by one frame so the closing DropdownMenu's FocusScope has
                // settled before this Dialog's FocusScope claims focus (avoids the JSDOM
                // race in radix-ui/primitives#1836) — but still move focus into the dialog
                // (matching Radix's default behavior) so keyboard/screen-reader users don't
                // lose focus to document.body (CR-01).
                event.preventDefault()
                requestAnimationFrame(() => {
                  contentRef.current?.focus()
                })
              }
            : undefined
        }
      >
        <DialogHeader>
          <DialogTitle>{isEdit ? t('cardEditor.editCard') : t('cardEditor.addCard')}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="frontContent"
              render={({ field }) => {
                const { ref: fieldRef, ...restField } = field
                return (
                <FormItem>
                  <FormLabel>{t('cardEditor.frontLabel')}</FormLabel>
                  <MediaUploadToolbar
                    fieldRef={frontRef}
                    onInsert={(val) => field.onChange(val)}
                  />
                  <Tabs defaultValue="edit">
                    <TabsList>
                      <TabsTrigger value="edit">{t('cardEditor.editTab')}</TabsTrigger>
                      <TabsTrigger value="preview">{t('cardEditor.previewTab')}</TabsTrigger>
                    </TabsList>
                    <TabsContent value="edit">
                      <FormControl>
                        <textarea
                          ref={(el) => { fieldRef(el); frontRef.current = el }}
                          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder={t('cardEditor.frontPlaceholder')}
                          rows={8}
                          {...restField}
                        />
                      </FormControl>
                    </TabsContent>
                    <TabsContent value="preview">
                      <div className="min-h-[192px] rounded-md border border-input bg-background px-3 py-2">
                        <KartexRenderer content={field.value} />
                      </div>
                    </TabsContent>
                  </Tabs>
                  <FormMessage />
                </FormItem>
              )}}
            />
            <FormField
              control={form.control}
              name="backContent"
              render={({ field }) => {
                const { ref: fieldRef, ...restField } = field
                return (
                <FormItem>
                  <FormLabel>{t('cardEditor.backLabel')}</FormLabel>
                  <MediaUploadToolbar
                    fieldRef={backRef}
                    onInsert={(val) => field.onChange(val)}
                  />
                  <Tabs defaultValue="edit">
                    <TabsList>
                      <TabsTrigger value="edit">{t('cardEditor.editTab')}</TabsTrigger>
                      <TabsTrigger value="preview">{t('cardEditor.previewTab')}</TabsTrigger>
                    </TabsList>
                    <TabsContent value="edit">
                      <FormControl>
                        <textarea
                          ref={(el) => { fieldRef(el); backRef.current = el }}
                          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder={t('cardEditor.backPlaceholder')}
                          rows={8}
                          {...restField}
                        />
                      </FormControl>
                    </TabsContent>
                    <TabsContent value="preview">
                      <div className="min-h-[192px] rounded-md border border-input bg-background px-3 py-2">
                        <KartexRenderer content={field.value} />
                      </div>
                    </TabsContent>
                  </Tabs>
                  <FormMessage />
                </FormItem>
              )}}
            />
            <div className="space-y-2">
              <Label htmlFor="tag-input">{t('cardEditor.tagsLabel')}</Label>
              <Input
                id="tag-input"
                placeholder={t('cardEditor.tagsPlaceholder')}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
                {isSubmitting ? t('common.saving') : t('cardEditor.saveCard')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
