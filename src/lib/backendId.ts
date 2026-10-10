const KEY = 'nftm:backend-id'

/**
 * Identifica o "backend" simulado deste navegador (o banco do MSW vive no localStorage dele).
 * O servidor Socket.IO usa o id para isolar eventos: cada banco só alcança os clientes do próprio banco.
 */
export function getBackendId(): string {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as string
  } catch { /* gera um novo */ }
  const id = crypto.randomUUID()
  try { localStorage.setItem(KEY, JSON.stringify(id)) } catch { /* modo privado */ }
  return id
}
