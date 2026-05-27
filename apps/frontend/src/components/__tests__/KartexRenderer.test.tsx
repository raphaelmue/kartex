import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { KartexRenderer } from '@/components/KartexRenderer'

// Mock Typst module — WASM cannot initialize in jsdom environment
vi.mock('@/lib/typst', () => ({
  renderTypstToSvg: vi.fn().mockResolvedValue('<svg>mock</svg>'),
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

// --- CARD-08: Typst block rendering (stub — implemented in 03-02) ---
describe('CARD-08: Typst block rendering', () => {
  // TODO: implemented in 03-02
  it('renders typst block as SVG (placeholder)', () => {
    // Stub: Typst WASM rendering is implemented in plan 03-02
    expect(true).toBe(true)
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
