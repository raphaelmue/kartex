import { render, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { KartexRenderer } from '@/components/KartexRenderer'

// Mock Typst module — WASM cannot initialize in jsdom environment.
// Default: resolves with a mock SVG string. Individual tests can override via
// mockResolvedValueOnce / mockRejectedValueOnce.
const mockRenderTypstToSvg = vi.fn().mockResolvedValue('<svg>mock</svg>')
vi.mock('@/lib/typst', () => ({
  renderTypstToSvg: mockRenderTypstToSvg,
}))

// --- CARD-06: Inline math rendering ---
describe('CARD-06: inline math rendering', () => {
  it('renders inline math', () => {
    const { container } = render(<KartexRenderer content="$x^2$" />)
    expect(container.querySelector('.katex')).not.toBeNull()
  })
})

// --- CARD-07: Block math rendering ---
describe('CARD-07: block math rendering', () => {
  it('renders block math', () => {
    // remark-math requires $$ on their own lines for display/block mode
    const { container } = render(
      <KartexRenderer content={"$$\n\\int f(x)dx\n$$"} />,
    )
    expect(container.querySelector('.katex-display')).not.toBeNull()
  })
})

// --- CARD-12: Code block syntax highlighting ---
describe('CARD-12: code syntax highlighting', () => {
  it('highlights code blocks', () => {
    const { container } = render(
      <KartexRenderer content={'```js\nconst x = 1\n```'} />,
    )
    const codeEl = container.querySelector('code')
    const hasHighlightClass =
      codeEl?.className.includes('hljs') ||
      codeEl?.className.includes('language-js')
    expect(hasHighlightClass).toBe(true)
  })
})

// --- CARD-08: Typst block rendering ---
describe('CARD-08: Typst block rendering', () => {
  it('renders #typst block as SVG after async render', async () => {
    mockRenderTypstToSvg.mockResolvedValueOnce('<svg>mock</svg>')
    const { container } = render(
      <KartexRenderer content={"#typst\n$a + b = c$"} />,
    )
    // Initially shows spinner/loading state
    await waitFor(() => {
      // After async render, the mock SVG should appear in the DOM
      expect(container.innerHTML).toContain('mock')
    })
  })

  it('renders RenderErrorBlock when Typst compilation fails', async () => {
    mockRenderTypstToSvg.mockRejectedValueOnce(new Error('compile error'))
    const { container } = render(
      <KartexRenderer content={"#typst\n$a + b = c$"} />,
    )
    await waitFor(() => {
      expect(container.innerHTML).toContain('Typst render error')
    })
  })
})

// --- CARD-09: media:// image rendering (stub — implemented in 03-03) ---
describe('CARD-09: media:// image rendering', () => {
  // TODO: implemented in 03-03
  it('rewrites media:// image src (placeholder)', () => {
    // Stub: media:// URL rewriting is implemented in plan 03-03
    expect(true).toBe(true)
  })
})

// --- CARD-10: Audio player rendering (stub — implemented in 03-03) ---
describe('CARD-10: audio player rendering', () => {
  // TODO: implemented in 03-03
  it('renders audio player for media:// audio link (placeholder)', () => {
    // Stub: audio player rendering is implemented in plan 03-03
    expect(true).toBe(true)
  })
})

// --- CARD-11: YouTube embed rendering (stub — implemented in 03-03) ---
describe('CARD-11: YouTube embed rendering', () => {
  // TODO: implemented in 03-03
  it('renders YouTube embed iframe (placeholder)', () => {
    // Stub: YouTube embed rendering is implemented in plan 03-03
    expect(true).toBe(true)
  })
})
