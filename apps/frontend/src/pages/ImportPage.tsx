import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Upload,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ParsedCard } from '@kartex/shared'
import { KartexRenderer } from '@/components/KartexRenderer'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { useImport } from '@/hooks/useImport'

// ── LazyCard — inline component, only used in ImportPage ──────────────────────
function LazyCard({ card }: { card: ParsedCard }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!ref.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1, rootMargin: '200px' },
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className="min-h-[80px]">
      {visible ? (
        <div className="border border-border rounded-lg p-4 space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Front
          </div>
          <KartexRenderer content={card.front} />
          <hr className="border-border my-2" />
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Back
          </div>
          <KartexRenderer content={card.back} />
          {card.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {card.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div
          className="border border-border rounded-lg p-4 min-h-[80px] animate-pulse bg-muted/30"
          aria-hidden="true"
        />
      )}
    </div>
  )
}

// ── ImportPage ─────────────────────────────────────────────────────────────────
export function ImportPage() {
  const navigate = useNavigate()
  const {
    step,
    maxFileSizeBytes,
    selectedFile,
    parseResult,
    importResult,
    fileError,
    importError,
    importErrors,
    selectFile,
    submitImport,
    reset,
  } = useImport()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [pendingDeckName, setPendingDeckName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    document.title = 'Import — Kartex'
  }, [])

  // Pre-fill deck name when parseResult arrives
  useEffect(() => {
    if (parseResult) {
      setPendingDeckName(parseResult.deck.deck)
    } else if (selectedFile && step === 'preview') {
      // ZIP file: use filename as fallback deck name (strip .kartex.zip)
      const stripped = selectedFile.name
        .replace(/\.kartex\.zip$/, '')
        .replace(/\.kartex$/, '')
      setPendingDeckName(stripped)
    }
  }, [parseResult, selectedFile, step])

  function handleFileSelect(file: File) {
    selectFile(file)
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
    // Reset input so selecting the same file again triggers onChange
    e.target.value = ''
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(true)
  }

  function handleDragLeave() {
    setIsDragOver(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  async function handleConfirmImport() {
    setIsSubmitting(true)
    await submitImport(pendingDeckName)
    setIsSubmitting(false)
  }

  const limitMB = maxFileSizeBytes ? Math.round(maxFileSizeBytes / 1024 / 1024) : 10

  // ── SUCCESS state ─────────────────────────────────────────────────────────
  if (step === 'success' && importResult) {
    return (
      <div
        className="flex flex-col items-center justify-center text-center py-16 gap-4 max-w-md mx-auto"
        role="status"
        aria-live="polite"
      >
        <CheckCircle2 className="h-12 w-12 text-green-500" aria-hidden="true" />
        <h2 className="text-xl font-semibold">Deck imported!</h2>
        <p className="text-sm text-muted-foreground">
          &ldquo;{pendingDeckName}&rdquo; was created with {importResult.cardCount} cards.
        </p>
        <Button
          size="lg"
          className="w-full max-w-xs"
          onClick={() => navigate(`/decks/${importResult.deckId}`)}
        >
          View Deck
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full max-w-xs mt-2"
          onClick={reset}
        >
          Import another file
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-xl font-semibold">Import Deck</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-8">
        Upload a .kartex file or .kartex.zip bundle to import a deck.
      </p>

      {/* ── UPLOAD state ────────────────────────────────────────────────── */}
      {step === 'upload' && (
        <>
          {/* Backend validation errors shown above drop zone */}
          {importErrors && importErrors.length > 0 && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Import failed</AlertTitle>
              <AlertDescription>
                The following files in your zip failed validation:
                <ul className="mt-2 space-y-1">
                  {importErrors.map((e, i) => (
                    <li key={i} className="text-sm">
                      {e.name}: {e.reason}
                    </li>
                  ))}
                </ul>
                Remove or fix these files and re-upload the zip.
              </AlertDescription>
            </Alert>
          )}
          {importError && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Import failed</AlertTitle>
              <AlertDescription>{importError}</AlertDescription>
            </Alert>
          )}

          {/* Drop zone */}
          <div
            role="button"
            tabIndex={0}
            aria-label="Upload a .kartex file. Click to browse or drag and drop."
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click()
            }}
            className={`
              flex flex-col items-center justify-center min-h-[200px] p-8 rounded-lg
              border-2 border-dashed cursor-pointer
              transition-colors duration-150
              ${isDragOver
                ? 'border-primary bg-primary/5'
                : 'border-border bg-background hover:bg-muted/20'
              }
            `}
          >
            <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
            <p className="text-sm font-normal text-muted-foreground text-center">
              Drop your file here, or click to browse
            </p>
            <p className="text-xs text-muted-foreground text-center mt-1">
              .kartex or .kartex.zip &middot; max {limitMB} MB
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={(e) => {
                e.stopPropagation()
                fileInputRef.current?.click()
              }}
              style={{ minHeight: '44px' }}
            >
              Browse file
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".kartex,.kartex.zip,application/zip"
            className="sr-only"
            aria-hidden="true"
            onChange={handleFileInputChange}
          />

          {fileError && (
            <p className="text-sm text-destructive mt-2 text-center">{fileError}</p>
          )}
        </>
      )}

      {/* ── PARSING state ─────────────────────────────────────────────────── */}
      {step === 'parsing' && (
        <div
          className="flex flex-col items-center justify-center min-h-[200px] p-8 rounded-lg border-2 border-dashed border-border"
          aria-busy="true"
          aria-label="Processing file"
        >
          <Loader2
            className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-3"
            aria-hidden="true"
          />
          <p className="text-sm font-normal text-muted-foreground text-center">
            Parsing your file...
          </p>
          <Progress
            className="w-full max-w-xs mx-auto mt-4"
            aria-label="Upload progress"
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      )}

      {/* ── PREVIEW state ─────────────────────────────────────────────────── */}
      {(step === 'preview' || step === 'importing') && (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="mb-4 -ml-1"
            onClick={reset}
            disabled={step === 'importing'}
          >
            <ArrowLeft className="h-4 w-4 mr-1" aria-hidden="true" />
            Back
          </Button>

          {/* Parse warnings banner (D-06) — amber alert, only if warnings exist */}
          {parseResult && parseResult.warnings.length > 0 && (
            <Alert className="border-amber-200 bg-amber-50 text-amber-800 mb-6" role="alert">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800 font-semibold text-sm">
                {parseResult.warnings.length} card
                {parseResult.warnings.length > 1 ? 's' : ''} skipped
              </AlertTitle>
              <AlertDescription className="text-amber-800 text-sm mt-1">
                {parseResult.warnings.map((w, i) => (
                  <div key={i}>
                    Card {w.cardIndex}: {w.reason}
                  </div>
                ))}
              </AlertDescription>
            </Alert>
          )}

          {/* Backend import errors shown in preview state */}
          {importError && step === 'preview' && (
            <Alert variant="destructive" className="mb-6" role="alert">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Import failed</AlertTitle>
              <AlertDescription>{importError}</AlertDescription>
            </Alert>
          )}
          {importErrors && importErrors.length > 0 && step === 'preview' && (
            <Alert variant="destructive" className="mb-6" role="alert">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Import failed</AlertTitle>
              <AlertDescription>
                The following files in your zip failed validation:
                <ul className="mt-2 space-y-1">
                  {importErrors.map((e, i) => (
                    <li key={i} className="text-sm">
                      {e.name}: {e.reason}
                    </li>
                  ))}
                </ul>
                Remove or fix these files and re-upload the zip.
              </AlertDescription>
            </Alert>
          )}

          {/* Deck metadata block (D-05, D-07) */}
          <div className="border border-border rounded-lg p-4 mb-6 bg-card space-y-3">
            <div>
              <label
                htmlFor="deck-name-input"
                className="text-sm font-normal text-foreground mb-1 block"
              >
                Deck name
              </label>
              <Input
                id="deck-name-input"
                aria-label="Deck name"
                value={pendingDeckName}
                onChange={(e) => setPendingDeckName(e.target.value)}
                disabled={step === 'importing'}
              />
            </div>
            {parseResult && (parseResult.deck.author || (parseResult.deck.tags && parseResult.deck.tags.length > 0)) && (
              <div className="space-y-1">
                {parseResult.deck.author && (
                  <p className="text-sm text-muted-foreground">
                    Author: {parseResult.deck.author}
                  </p>
                )}
                {parseResult.deck.tags && parseResult.deck.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {parseResult.deck.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              {parseResult ? (
                <>
                  Showing {parseResult.cards.length} cards
                  {parseResult.warnings.length > 0 && (
                    <span className="text-amber-600 ml-1">
                      ({parseResult.warnings.length} skipped)
                    </span>
                  )}
                </>
              ) : (
                selectedFile && `File: ${selectedFile.name}`
              )}
            </p>
          </div>

          {/* Card preview list — lazy rendered (D-04, IMPT-05) */}
          {parseResult && parseResult.cards.length > 0 && (
            <div
              className="space-y-3 mb-8"
              aria-label={`Card preview list, ${parseResult.cards.length} cards`}
            >
              {parseResult.cards.map((card, i) => (
                <LazyCard key={i} card={card} />
              ))}
            </div>
          )}

          {/* ZIP file: no client-side card preview — show informational note */}
          {!parseResult && selectedFile && (
            <div className="mb-8 p-4 border border-border rounded-lg bg-muted/20">
              <p className="text-sm text-muted-foreground text-center">
                Card preview is not available for .kartex.zip bundles.
                Click &ldquo;Import Deck&rdquo; to import — the file will be validated and imported on the server.
              </p>
            </div>
          )}

          {/* Confirm / Cancel row */}
          <div className="flex gap-3 pt-6 border-t border-border mt-8">
            <Button
              variant="outline"
              onClick={reset}
              disabled={step === 'importing'}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleConfirmImport()}
              disabled={
                !pendingDeckName.trim() || step === 'importing' || isSubmitting
              }
              aria-disabled={!pendingDeckName.trim()}
              title={!pendingDeckName.trim() ? 'Deck name cannot be empty.' : undefined}
            >
              {step === 'importing' || isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" />
                  Importing...
                </>
              ) : (
                'Import Deck'
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
