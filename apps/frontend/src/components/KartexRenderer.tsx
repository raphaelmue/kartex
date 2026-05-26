import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface KartexRendererProps {
  content: string
}

/**
 * KartexRenderer — renders Kartex card content as HTML.
 *
 * Phase 2: Markdown only (react-markdown + remark-gfm).
 * Phase 3 extension point: add `components` prop to ReactMarkdown for KaTeX math
 * nodes and Typst WASM blocks — the external interface (content: string) must not change.
 */
export function KartexRenderer({ content }: KartexRendererProps) {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
