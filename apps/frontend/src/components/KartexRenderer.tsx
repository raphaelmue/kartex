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

/**
 * Preprocess card content before passing to ReactMarkdown.
 *
 * Converts #typst blocks to fenced ```typst code blocks so that:
 * 1. remark-math cannot interfere with Typst math syntax ($ ... $)
 * 2. Detection works regardless of whether there is a blank line before
 *    the formula (two-paragraph vs one-paragraph parsing ambiguity)
 * 3. The code component handler intercepts them via className="language-typst"
 *
 * Input:
 *   #typst
 *   $ a + b = c $
 *
 * Output:
 *   ```typst
 *   $ a + b = c $
 *   ```
 *
 * A #typst block ends at the first blank line or end of content.
 */
function preprocessTypstBlocks(content: string): string {
  const lines = content.split('\n')
  const result: string[] = []
  let i = 0
  while (i < lines.length) {
    if (lines[i].trim() === '#typst') {
      // Collect source lines until blank line or end of content
      const sourceLines: string[] = []
      i++
      while (i < lines.length && lines[i] !== '') {
        sourceLines.push(lines[i])
        i++
      }
      result.push('```typst', ...sourceLines, '```')
    } else {
      result.push(lines[i])
      i++
    }
  }
  return result.join('\n')
}

/** Recursively extract plain text from React children (handles hljs span wrappers). */
function extractTextFromChildren(children: React.ReactNode): string {
  if (typeof children === 'string') return children
  if (typeof children === 'number' || typeof children === 'boolean') return String(children)
  return React.Children.toArray(children)
    .map((child) => {
      if (typeof child === 'string') return child
      if (React.isValidElement(child)) {
        return extractTextFromChildren(
          (child.props as { children?: React.ReactNode }).children,
        )
      }
      return ''
    })
    .join('')
}

// Extract a YouTube video ID from common YouTube URL formats.
// Supports: youtube.com/watch?v=, youtu.be/, youtube.com/embed/
// Returns null if the URL is not a recognized YouTube URL.
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})/,
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
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
// img handler: rewrites media:// URLs to /api/media/ for inline images (CARD-09).
//
// a handler: renders:
//   - media:// links as <audio controls> players (CARD-10)
//   - YouTube URLs as <iframe> embeds (CARD-11)
//   - All other links as standard <a> tags
//
// DOES NOT override math or code nodes — those remain handled by rehype-katex
// and rehype-highlight automatically.
const kartexComponents = {
  // Fenced ```typst blocks produced by preprocessTypstBlocks() land here.
  // extractTextFromChildren recovers the raw source even after rehype-highlight
  // wraps it in <span> elements.
  code({ className, children }: { className?: string; children?: React.ReactNode }) {
    if (className === 'language-typst') {
      const source = extractTextFromChildren(children).replace(/\n$/, '')
      return <TypstBlock source={source} />
    }
    return <code className={className}>{children}</code>
  },
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
  img({ src, alt }: { src?: string; alt?: string }) {
    // Rewrite media:// protocol to /api/media/ path (CARD-09)
    const resolvedSrc = src?.startsWith('media://')
      ? `/api/media/${src.slice('media://'.length)}`
      : src
    return <img src={resolvedSrc} alt={alt ?? ''} className="max-w-full rounded-md" />
  },
  a({ href, children }: { href?: string; children?: React.ReactNode }) {
    // Audio player for media:// links (CARD-10)
    if (href?.startsWith('media://')) {
      const src = `/api/media/${href.slice('media://'.length)}`
      return <audio controls src={src} className="w-full mt-2" />
    }
    // YouTube iframe embed (CARD-11)
    const youtubeId = extractYouTubeId(href ?? '')
    if (youtubeId !== null) {
      return (
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}`}
          className="w-full aspect-video rounded-md"
          allowFullScreen
          title="YouTube video"
        />
      )
    }
    // Standard external link
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    )
  },
}

// Custom URL transform that extends react-markdown's default safe protocol list
// to also allow media:// — the protocol used for Kartex media file references.
// react-markdown's defaultUrlTransform strips unknown protocols (returns ''),
// which would prevent our img/a component handlers from seeing the media:// URL.
function kartexUrlTransform(url: string): string {
  if (url.startsWith('media://')) return url
  // Replicate react-markdown's defaultUrlTransform for all other URLs
  const colon = url.indexOf(':')
  const questionMark = url.indexOf('?')
  const numberSign = url.indexOf('#')
  const slash = url.indexOf('/')
  const safeProtocol = /^(https?|ircs?|mailto|xmpp)$/i
  if (
    colon === -1 ||
    (slash !== -1 && colon > slash) ||
    (questionMark !== -1 && colon > questionMark) ||
    (numberSign !== -1 && colon > numberSign) ||
    safeProtocol.test(url.slice(0, colon))
  ) {
    return url
  }
  return ''
}

/**
 * KartexRenderer — renders Kartex card content as HTML.
 *
 * Phase 3: Extended with KaTeX math (CARD-06, CARD-07), highlight.js code
 * syntax highlighting (CARD-12), Typst WASM blocks (CARD-08), media:// images
 * (CARD-09), audio players (CARD-10), and YouTube embeds (CARD-11).
 *
 * Plugin order is significant:
 *   - remark: [remarkGfm, remarkMath] — GFM + math AST nodes
 *   - rehype: [rehypeKatex, rehypeHighlight] — KaTeX renders before highlight.js
 *
 * urlTransform: kartexUrlTransform allows media:// through react-markdown's
 * URL sanitization so our img/a component handlers receive the raw media:// URL.
 *
 * CSS for KaTeX and highlight.js is imported globally in main.tsx.
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
        urlTransform={kartexUrlTransform}
        components={kartexComponents}
      >
        {preprocessTypstBlocks(content)}
      </ReactMarkdown>
    </div>
  )
}
