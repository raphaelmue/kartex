import { Loader2 } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import { renderTypstToSvg } from '@/lib/typst'

interface KartexRendererProps {
  content: string
}

// RenderErrorBlock — used for Typst compilation errors (D-10).
// Red-bordered block showing the error message and raw source.
interface RenderErrorBlockProps {
  errorMessage: string
  rawSource: string
  heading: string
}

function RenderErrorBlock({ errorMessage, rawSource, heading }: RenderErrorBlockProps) {
  return (
    <div className="border border-destructive rounded p-2 my-1 bg-destructive/5">
      <p className="text-destructive text-xs font-medium">{heading}: {errorMessage}</p>
      <pre className="text-xs mt-1 font-mono text-muted-foreground">{rawSource}</pre>
    </div>
  )
}

// TypstBlock — renders a #typst source block as SVG via the WASM singleton.
//
// Lifecycle:
//   1. Mount: loading=true, call renderTypstToSvg(source)
//   2. Success: set svg string, loading=false
//   3. Error: set error message, loading=false
//
// Loading spinner (D-05), SVG injection, and error fallback (D-10) per UI-SPEC.
interface TypstBlockProps {
  source: string
}

function TypstBlock({ source }: TypstBlockProps) {
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    renderTypstToSvg(source)
      .then((result) => {
        if (!cancelled) {
          setSvg(result)
          setLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err))
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [source])

  if (loading) {
    return (
      <span className="text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin inline mr-1" />
        Rendering...
      </span>
    )
  }

  if (error !== null) {
    return (
      <RenderErrorBlock
        heading="Typst render error"
        errorMessage={error}
        rawSource={source}
      />
    )
  }

  return <div dangerouslySetInnerHTML={{ __html: svg ?? '' }} />
}

// Extract the Typst source from a #typst block string.
// The raw content starts with "#typst\n" — strip that prefix to get the source.
function extractTypstSource(raw: string): string {
  return raw.startsWith('#typst\n') ? raw.slice('#typst\n'.length) : raw
}

// Check if a child string value is a #typst block.
function isTypstBlock(children: React.ReactNode): boolean {
  const childStr = React.Children.toArray(children)
    .map((c) => (typeof c === 'string' ? c : ''))
    .join('')
  return childStr.startsWith('#typst\n')
}

function getChildString(children: React.ReactNode): string {
  return React.Children.toArray(children)
    .map((c) => (typeof c === 'string' ? c : ''))
    .join('')
}

// kartexComponents — custom react-markdown component handlers.
//
// Handles both p and h6 for #typst blocks:
//   - Markdown may parse "#typst" as a level-6 heading OR as a plain paragraph
//     depending on whitespace/context. Both cases are handled (Pitfall 8 + T-03-03).
//
// DOES NOT override math or code nodes — those remain handled by rehype-katex
// and rehype-highlight automatically.
const kartexComponents = {
  p({ children }: { children?: React.ReactNode }) {
    if (isTypstBlock(children)) {
      const source = extractTypstSource(getChildString(children))
      return <TypstBlock source={source} />
    }
    return <p>{children}</p>
  },
  h6({ children }: { children?: React.ReactNode }) {
    if (isTypstBlock(children)) {
      const source = extractTypstSource(getChildString(children))
      return <TypstBlock source={source} />
    }
    return <h6>{children}</h6>
  },
}

/**
 * KartexRenderer — renders Kartex card content as HTML.
 *
 * Phase 3: Extended with KaTeX math (CARD-06, CARD-07), highlight.js code
 * syntax highlighting (CARD-12), and Typst WASM blocks (CARD-08).
 *
 * Plugin order is significant:
 *   - remark: [remarkGfm, remarkMath] — GFM + math AST nodes
 *   - rehype: [rehypeKatex, rehypeHighlight] — KaTeX renders before highlight.js
 *
 * CSS for KaTeX and highlight.js is imported globally in main.tsx.
 *
 * Phase 3 extension point (03-03): media:// images, audio, YouTube embeds added via
 * additional kartexComponents entries for img and a elements.
 */
export function KartexRenderer({ content }: KartexRendererProps) {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          // rehypeKatex BEFORE rehypeHighlight — per RESEARCH.md Pitfall 2
          [rehypeKatex, { throwOnError: false, errorColor: 'hsl(0 84% 60%)' }],
          [rehypeHighlight, { detect: true }],
        ]}
        components={kartexComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
