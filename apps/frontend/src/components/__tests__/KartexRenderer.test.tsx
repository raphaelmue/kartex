import { render, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { KartexRenderer } from '@/components/KartexRenderer'

// Mock Typst module — WASM cannot initialize in jsdom environment.
// vi.mock is hoisted to top of file; use vi.hoisted() so the mock variable
// is also available at hoist time.
const mockRenderTypstToSvg = vi.hoisted(() =>
  vi.fn().mockResolvedValue('<svg>mock</svg>'),
)
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

// --- CARD-09: media:// image rendering ---
describe('CARD-09: media:// image rendering', () => {
  it('rewrites media:// image src to /api/media/ URL', () => {
    const { container } = render(
      <KartexRenderer content="![cat](media://carnot.png)" />,
    )
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img?.src).toContain('/api/media/carnot.png')
    expect(img?.src).not.toContain('media://')
  })

  it('passes through non-media:// image src unchanged', () => {
    const { container } = render(
      <KartexRenderer content="![alt](https://example.com/img.png)" />,
    )
    const img = container.querySelector('img')
    expect(img?.src).toBe('https://example.com/img.png')
  })
})

// --- CARD-10: Audio player rendering ---
describe('CARD-10: audio player rendering', () => {
  it('renders audio element with controls for media:// audio link', () => {
    const { container } = render(
      <KartexRenderer content="[audio](media://lecture.mp3)" />,
    )
    const audio = container.querySelector('audio')
    expect(audio).not.toBeNull()
    expect(audio?.hasAttribute('controls')).toBe(true)
    expect(audio?.src).toContain('/api/media/lecture.mp3')
  })
})

// --- CARD-11: YouTube embed rendering ---
describe('CARD-11: YouTube embed rendering', () => {
  it('renders iframe for youtube.com/watch URL', () => {
    const { container } = render(
      <KartexRenderer content="[video](https://youtube.com/watch?v=dQw4w9WgXcQ)" />,
    )
    const iframe = container.querySelector('iframe')
    expect(iframe).not.toBeNull()
    expect(iframe?.src).toContain('youtube.com/embed/dQw4w9WgXcQ')
  })

  it('renders anchor (not iframe) for non-YouTube links', () => {
    const { container } = render(
      <KartexRenderer content="[link](https://example.com)" />,
    )
    const iframe = container.querySelector('iframe')
    const anchor = container.querySelector('a')
    expect(iframe).toBeNull()
    expect(anchor?.href).toBe('https://example.com/')
  })
})
