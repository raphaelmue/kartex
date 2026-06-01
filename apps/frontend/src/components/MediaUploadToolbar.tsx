import React, { useRef, useState } from 'react'
import { Image, Loader2, Music } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

interface MediaUploadToolbarProps {
  onInsert: (text: string) => void
  fieldRef: React.RefObject<HTMLTextAreaElement>
}

export function MediaUploadToolbar({ onInsert, fieldRef }: MediaUploadToolbarProps) {
  const { t } = useTranslation()
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingAudio, setUploadingAudio] = useState(false)

  const imageInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)

  async function handleUpload(file: File, type: 'image' | 'audio') {
    const formData = new FormData()
    formData.append('file', file)

    // Do NOT set Content-Type — browser sets multipart/form-data with boundary
    // automatically. Setting it manually omits the boundary and breaks the upload.
    // api.post() JSON-stringifies the body, so we use raw fetch here (Pitfall 6).
    const res = await fetch('/api/media/upload', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })

    if (res.ok) {
      const data = (await res.json()) as { filename: string }
      const insertText =
        type === 'image'
          ? `![image](media://${data.filename})`
          : `[audio](media://${data.filename})`

      // Insert at cursor position in the textarea (D-03)
      const ta = fieldRef.current
      if (ta) {
        const start = ta.selectionStart ?? ta.value.length
        const end = ta.selectionEnd ?? ta.value.length
        const newValue = ta.value.slice(0, start) + insertText + ta.value.slice(end)
        onInsert(newValue)
      } else {
        onInsert(insertText)
      }

      toast.success(type === 'image' ? t('media.imageUploaded') : t('media.audioUploaded'))
    } else {
      toast.error(t('media.uploadFailed'))
    }
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingImage(true)
    handleUpload(file, 'image').finally(() => {
      setUploadingImage(false)
      // Reset input so the same file can be re-uploaded if needed
      if (imageInputRef.current) imageInputRef.current.value = ''
    })
  }

  function handleAudioChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAudio(true)
    handleUpload(file, 'audio').finally(() => {
      setUploadingAudio(false)
      if (audioInputRef.current) audioInputRef.current.value = ''
    })
  }

  return (
    <div className="flex gap-1 mb-1">
      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleImageChange}
        aria-hidden="true"
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/mpeg,audio/ogg,audio/wav"
        className="hidden"
        onChange={handleAudioChange}
        aria-hidden="true"
      />

      {/* Image upload button */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        aria-label={t('a11y.uploadImage')}
        disabled={uploadingImage}
        aria-busy={uploadingImage}
        onClick={() => imageInputRef.current?.click()}
      >
        {uploadingImage ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Image className="h-4 w-4" />
        )}
      </Button>

      {/* Audio upload button */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        aria-label={t('a11y.uploadAudio')}
        disabled={uploadingAudio}
        aria-busy={uploadingAudio}
        onClick={() => audioInputRef.current?.click()}
      >
        {uploadingAudio ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Music className="h-4 w-4" />
        )}
      </Button>
    </div>
  )
}
