// typst.ts — Lazy Typst WASM singleton (D-04, D-06)
//
// The Typst compiler is initialized only when the first #typst block is
// encountered. Module-level initPromise ensures initialization happens exactly
// once per browser session (D-06). Users without Typst cards pay zero WASM
// startup cost (D-04).
//
// WASM files are imported as Vite asset URLs (vite-plugin-wasm required in
// vite.config.ts). The ?url suffix returns the resolved URL string for the
// .wasm file, which is what getModule expects.

import { $typst } from '@myriaddreamin/typst.ts/dist/esm/contrib/snippet.mjs'
import compilerWasm from '@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm?url'
import rendererWasm from '@myriaddreamin/typst-ts-renderer/pkg/typst_ts_renderer_bg.wasm?url'

let initPromise: Promise<void> | null = null

async function ensureTypstReady(): Promise<void> {
  if (initPromise !== null) return initPromise
  initPromise = (async () => {
    $typst.setCompilerInitOptions({ getModule: () => compilerWasm })
    $typst.setRendererInitOptions({ getModule: () => rendererWasm })
    // $typst lazily initializes on first .svg() call — no explicit init() needed
  })()
  return initPromise
}

export async function renderTypstToSvg(source: string): Promise<string> {
  await ensureTypstReady()
  return $typst.svg({ mainContent: source })
}
