import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import {
  CreateCardSchema,
  Card,
} from '@kartex/shared'
import { api } from '@/lib/api'
import { KartexRenderer } from '@/components/KartexRenderer'
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

interface CardEditorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deckId: string
  card?: Card
  onSuccess: () => void
}

export function CardEditorModal({
  open,
  onOpenChange,
  deckId,
  card,
  onSuccess,
}: CardEditorModalProps) {
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

  useEffect(() => {
    if (open) {
      form.reset({
        frontContent: card?.frontContent ?? '',
        backContent: card?.backContent ?? '',
        tags: card?.tags ?? [],
      })
      setTagInput(card?.tags.join(', ') ?? '')
    }
  }, [open, card])

  const onSubmit = async (data: CardFormInput) => {
    const tags = tagInput.split(',').map((t) => t.trim()).filter(Boolean)
    const payload = { ...data, tags }
    try {
      const res = isEdit && card
        ? await api.patch(`/api/decks/${deckId}/cards/${card.id}`, payload)
        : await api.post(`/api/decks/${deckId}/cards`, payload)
      if (res.ok) {
        toast.success(isEdit ? 'Card updated' : 'Card added')
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error('Something went wrong. Please try again.')
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Card' : 'Add Card'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="frontContent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Front</FormLabel>
                  <Tabs defaultValue="edit">
                    <TabsList>
                      <TabsTrigger value="edit">Edit</TabsTrigger>
                      <TabsTrigger value="preview">Preview</TabsTrigger>
                    </TabsList>
                    <TabsContent value="edit">
                      <FormControl>
                        <textarea
                          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder="Front side content (Markdown)"
                          rows={8}
                          {...field}
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
              )}
            />
            <FormField
              control={form.control}
              name="backContent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Back</FormLabel>
                  <Tabs defaultValue="edit">
                    <TabsList>
                      <TabsTrigger value="edit">Edit</TabsTrigger>
                      <TabsTrigger value="preview">Preview</TabsTrigger>
                    </TabsList>
                    <TabsContent value="edit">
                      <FormControl>
                        <textarea
                          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder="Back side content (Markdown)"
                          rows={8}
                          {...field}
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
              )}
            />
            <div className="space-y-2">
              <Label htmlFor="tag-input">Tags (comma-separated, optional)</Label>
              <Input
                id="tag-input"
                placeholder="react, typescript, algorithms"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Card'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
