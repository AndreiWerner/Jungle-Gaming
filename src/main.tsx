import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './app/App'

async function bootstrap() {
  if (import.meta.env.VITE_ENABLE_MSW !== 'false') {
    const { startMocks } = await import('./mocks/browser')
    await startMocks()
  }
  createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
}
void bootstrap()
