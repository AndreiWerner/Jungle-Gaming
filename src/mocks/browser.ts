import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'
import { resetDb } from './db'

export const worker = setupWorker(...handlers)

export async function startMocks() {
  // Permite resetar via URL (?reset-mocks) ou window.__resetMocks() — usado pelo Playwright.
  ;(window as unknown as { __resetMocks: () => void }).__resetMocks = () => { resetDb(); localStorage.clear() }
  await worker.start({ onUnhandledFrame: 'bypass', serviceWorker: { url: '/mockServiceWorker.js' } })
}
