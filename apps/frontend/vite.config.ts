import { createRequire } from 'module'
import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'
import topLevelAwait from 'vite-plugin-top-level-await'
import wasm from 'vite-plugin-wasm'

const require = createRequire(import.meta.url)
const pkg = require('./package.json') as { version: string }

export default defineConfig({
  plugins: [react(), wasm(), topLevelAwait()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@kartex/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
  server: {
    headers: {
      // Required for SharedArrayBuffer used by Typst WASM threaded compiler
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: path.resolve(__dirname, '../../apps/backend/public'),
    emptyOutDir: true,
  },
})
