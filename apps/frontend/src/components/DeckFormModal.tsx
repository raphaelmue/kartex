import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import {
  CreateDeckInput,
  CreateDeckSchema,
  UpdateDeckSchema,
  Deck,
} from '@kartex/shared'
import { api } from '@/lib/api'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface DeckFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deck?: Deck
  onSuccess: () => void
}

export function DeckFormModal({ open, onOpenChange, deck, onSuccess }: DeckFormModalProps) {
  const isEdit = Boolean(deck)

  const form = useForm<CreateDeckInput>({
    resolver: zodResolver(isEdit ? UpdateDeckSchema : CreateDeckSchema),
    defaultValues: {
      title: deck?.title ?? '',
      description: deck?.description ?? '',
      visibility: deck?.visibility ?? 'PRIVATE',
    },
  })
  const { isSubmitting } = form.formState

  // Reset form when the modal opens with different deck data
  useEffect(() => {
    if (open) {
      form.reset({
        title: deck?.title ?? '',
        description: deck?.description ?? '',
        visibility: deck?.visibility ?? 'PRIVATE',
      })
    }
  }, [open, deck])

  const onSubmit = async (data: CreateDeckInput) => {
    try {
      const res = isEdit
        ? await api.patch(`/api/decks/${deck!.id}`, data)
        : await api.post('/api/decks', data)
      if (res.ok) {
        toast.success(isEdit ? 'Deck updated' : 'Deck created')
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Deck' : 'New Deck'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Deck title" maxLength={200} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <textarea
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Optional description"
                      rows={3}
                      maxLength={2000}
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="visibility"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Visibility</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="PRIVATE">Private</SelectItem>
                      <SelectItem value="SHARED">Shared</SelectItem>
                      <SelectItem value="PUBLIC">Public</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
                {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Deck'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
