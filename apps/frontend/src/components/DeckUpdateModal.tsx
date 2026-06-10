import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Loader2 } from 'lucide-react'

type UpdateStep = 'uploading' | 'previewing' | 'applying' | 'done' | 'error'

interface DeckUpdateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deckId: string
  file: File | null
  onSuccess: () => void
}

export function DeckUpdateModal({
  open,
  onOpenChange,
  deckId,
  file,
  onSuccess,
}: DeckUpdateModalProps) {
  const { t } = useTranslation()
  const [step, setStep] = useState<UpdateStep>('uploading')
  const [preview, setPreview] = useState<{
    added: number
    updated: number
    unchanged: number
    removed: number
  } | null>(null)
  const [keepRemoved, setKeepRemoved] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setStep('uploading')
      setPreview(null)
      setErrorMsg(null)
      setKeepRemoved(true)
    }
  }, [open])

  useEffect(() => {
    if (open && file) {
      void runPreview()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, file])

  async function runPreview() {
    if (!file) return
    setStep('uploading')
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await api.postForm(`/api/decks/${deckId}/update/preview`, formData)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const message = (data as { error?: string }).error ?? t('deckUpdate.parseError')
        setErrorMsg(message)
        setStep('error')
        return
      }
      const data = await res.json()
      setPreview(data)
      setStep('previewing')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('deckUpdate.parseError')
      setErrorMsg(message)
      setStep('error')
    }
  }

  async function runApply() {
    if (!file) return
    setStep('applying')
    const formData = new FormData()
    formData.append('file', file)
    formData.append('keepRemoved', String(keepRemoved))
    try {
      const res = await api.postForm(`/api/decks/${deckId}/update/apply`, formData)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const message = (data as { error?: string }).error ?? t('deckUpdate.parseError')
        setErrorMsg(message)
        setStep('error')
        return
      }
      setStep('done')
      toast.success(t('deckUpdate.successToast'))
      onSuccess()
      onOpenChange(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('deckUpdate.parseError')
      setErrorMsg(message)
      setStep('error')
    }
  }

  const chips = preview
    ? [
        { key: 'added', label: t('deckUpdate.added', { count: preview.added }), value: preview.added },
        { key: 'updated', label: t('deckUpdate.updated', { count: preview.updated }), value: preview.updated },
        { key: 'unchanged', label: t('deckUpdate.unchanged', { count: preview.unchanged }), value: preview.unchanged },
        { key: 'removed', label: t('deckUpdate.removed', { count: preview.removed }), value: preview.removed },
      ]
    : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('deckUpdate.modalTitle')}</DialogTitle>
        </DialogHeader>

        {(step === 'uploading') && (
          <div className="flex flex-col items-center gap-3 py-6" aria-busy="true">
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">{t('deckUpdate.uploading')}</p>
          </div>
        )}

        {step === 'previewing' && preview && (
          <>
            <DialogDescription>{t('deckUpdate.previewHeading')}</DialogDescription>
            <div className="grid grid-cols-2 gap-3">
              {chips.map((chip) => (
                <div
                  key={chip.key}
                  className="border border-border rounded-lg p-4 min-h-[44px]"
                  role="region"
                  aria-label={chip.label}
                >
                  <p className="text-xs font-normal text-muted-foreground uppercase tracking-wide">
                    {chip.label}
                  </p>
                  <p className="text-xl font-semibold text-foreground">{chip.value}</p>
                </div>
              ))}
            </div>
            <div className="flex items-start gap-3 mt-4 min-h-[44px]">
              <Switch
                id="keep-removed-switch"
                checked={keepRemoved}
                onCheckedChange={setKeepRemoved}
              />
              <div>
                <label
                  htmlFor="keep-removed-switch"
                  className="text-sm font-semibold text-foreground"
                >
                  {t('deckUpdate.keepRemovedLabel')}
                </label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('deckUpdate.keepRemovedHint')}
                </p>
              </div>
            </div>
          </>
        )}

        {step === 'applying' && (
          <div className="flex flex-col items-center gap-3 py-6" aria-busy="true">
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">{t('deckUpdate.applying')}</p>
          </div>
        )}

        {step === 'error' && (
          <div role="alert">
            <p className="text-sm font-semibold text-foreground">{t('deckUpdate.errorTitle')}</p>
            <p className="text-sm text-muted-foreground">{errorMsg}</p>
          </div>
        )}

        <DialogFooter>
          {(step === 'previewing' || step === 'applying') && (
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={step === 'applying'}
            >
              {t('common.cancel')}
            </Button>
          )}
          {(step === 'previewing' || step === 'applying') && (
            <Button
              onClick={() => void runApply()}
              disabled={step === 'applying'}
              aria-busy={step === 'applying'}
            >
              {t('deckUpdate.apply')}
            </Button>
          )}
          {step === 'error' && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
