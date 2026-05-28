import { useCallback, useEffect, useState } from 'react'
import type { ImportConfig, KartexParseResult, ParseWarning } from '@kartex/shared'
import { parseKartex } from '@kartex/shared'
import { api } from '@/lib/api'

export type ImportStep = 'upload' | 'parsing' | 'preview' | 'importing' | 'success'

interface UseImportReturn {
  step: ImportStep
  maxFileSizeBytes: number | null
  configError: boolean
  selectedFile: File | null
  parseResult: KartexParseResult | null
  importResult: { deckId: string; cardCount: number; warnings: ParseWarning[] } | null
  fileError: string | null
  importError: string | null
  importErrors: { name: string; reason: string }[] | null
  selectFile: (file: File) => void
  submitImport: (deckName: string) => Promise<void>
  reset: () => void
}

export function useImport(): UseImportReturn {
  const [step, setStep] = useState<ImportStep>('upload')
  const [maxFileSizeBytes, setMaxFileSizeBytes] = useState<number | null>(null)
  const [configError, setConfigError] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [parseResult, setParseResult] = useState<KartexParseResult | null>(null)
  const [importResult, setImportResult] = useState<{
    deckId: string
    cardCount: number
    warnings: ParseWarning[]
  } | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [importErrors, setImportErrors] = useState<{ name: string; reason: string }[] | null>(null)

  // Fetch upload config on mount (D-10, D-11)
  const fetchConfig = useCallback(async () => {
    try {
      const res = await api.get('/api/import/config')
      if (res.ok) {
        const data = (await res.json()) as ImportConfig
        setMaxFileSizeBytes(data.maxFileSizeBytes)
      } else {
        setConfigError(true)
      }
    } catch {
      setConfigError(true)
    }
  }, [])

  useEffect(() => {
    void fetchConfig()
  }, [fetchConfig])

  const selectFile = useCallback(
    (file: File) => {
      setFileError(null)
      setImportError(null)
      setImportErrors(null)

      // Validate extension
      const name = file.name
      if (!name.endsWith('.kartex') && !name.endsWith('.kartex.zip')) {
        setFileError('Only .kartex and .kartex.zip files are supported.')
        return
      }

      // Client-side size check (D-11) — skip if config fetch failed (graceful degradation)
      if (maxFileSizeBytes !== null && file.size > maxFileSizeBytes) {
        const fileMB = (file.size / 1024 / 1024).toFixed(1)
        const limitMB = Math.round(maxFileSizeBytes / 1024 / 1024)
        setFileError(
          `File is too large (${fileMB} MB). Maximum allowed size is ${limitMB} MB.`,
        )
        return
      }

      setSelectedFile(file)
      setStep('parsing')

      // For .kartex files: parse on client side for preview (IMPT-01)
      // For .kartex.zip: cannot parse on client (zip extraction is server-side); store file and show preview after server responds
      if (name.endsWith('.kartex') && !name.endsWith('.kartex.zip')) {
        void (async () => {
          try {
            const text = await file.text()
            const result = parseKartex(text)
            if ('fatal' in result) {
              setFileError(result.message)
              setStep('upload')
            } else {
              setParseResult(result)
              setStep('preview')
            }
          } catch {
            setFileError('Could not read the file. Please try again.')
            setStep('upload')
          }
        })()
      } else {
        // .kartex.zip — no client-side preview of card contents; show a minimal preview state
        // The backend will parse and validate on submit
        setParseResult(null)
        setStep('preview')
      }
    },
    [maxFileSizeBytes],
  )

  const submitImport = useCallback(
    async (deckName: string) => {
      if (!selectedFile) return
      setStep('importing')
      setImportError(null)
      setImportErrors(null)

      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('deckName', deckName.trim())

      try {
        const res = await api.postForm('/api/import', formData)

        if (res.status === 201) {
          const data = (await res.json()) as {
            deckId: string
            cardCount: number
            warnings: ParseWarning[]
          }
          setImportResult(data)
          setStep('success')
        } else if (res.status === 422) {
          const errBody = (await res.json()) as {
            error: string
            files?: { name: string; reason: string }[]
          }
          if (errBody.files && errBody.files.length > 0) {
            setImportErrors(errBody.files)
          } else {
            setImportError(errBody.error ?? 'Import failed. Please check your file.')
          }
          setStep('preview')
        } else if (res.status === 413) {
          setImportError(
            'File is too large. Please reduce the file size and try again.',
          )
          setStep('upload')
        } else {
          const errBody = (await res.json().catch(() => ({ error: '' }))) as {
            error: string
          }
          setImportError(errBody.error || 'Upload failed. Check your connection and try again.')
          setStep('preview')
        }
      } catch {
        setImportError('Upload failed. Check your connection and try again.')
        setStep('preview')
      }
    },
    [selectedFile],
  )

  const reset = useCallback(() => {
    setStep('upload')
    setSelectedFile(null)
    setParseResult(null)
    setImportResult(null)
    setFileError(null)
    setImportError(null)
    setImportErrors(null)
  }, [])

  return {
    step,
    maxFileSizeBytes,
    configError,
    selectedFile,
    parseResult,
    importResult,
    fileError,
    importError,
    importErrors,
    selectFile,
    submitImport,
    reset,
  }
}
