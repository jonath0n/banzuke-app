import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/base.css'
import './styles/fonts-jp.css'
import './styles/a11y.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)

// The service worker (src/sw/sw.ts, emitted as sw.js at build time) keeps the
// shell and the data files for an offline open and a faster return. Production
// only: in development the dev server is the source of truth.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((error: unknown) => {
      console.warn('Service worker registration failed:', error)
    })
  })
}
