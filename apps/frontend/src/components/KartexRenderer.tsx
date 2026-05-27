import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'

interface KartexRendererProps {
  content: string
}

/**
 * KartexRenderer — renders Kartex card content as HTML.
 *
 * Phase 3: Extended with KaTeX math (CARD-06, CARD-07) and highlight.js code
 * syntax highlighting (CARD-12). Plugin order is significant:
 *   - remark: [remarkGfm, remarkMath] — GFM + math AST nodes
 *   - rehype: [rehypeKatex, rehypeHighlight] — KaTeX renders before highlight.js
 *
 * CSS for KaTeX and highlight.js is imported globally in main.tsx.
 *
 * Phase 3 extension points (added in 03-02 / 03-03):
 *   - `components` prop for Typst WASM blocks (#typst), media:// images, audio, YouTube embeds
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
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
