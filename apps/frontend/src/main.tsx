import './i18n'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/context/ThemeContext'
import App from './App'
import './index.css'
import 'katex/dist/katex.min.css'
import 'highlight.js/styles/github.css'

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Root element #root not found in index.html')
ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <App />
        <Toaster duration={4000} position="bottom-right" />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>,
)
