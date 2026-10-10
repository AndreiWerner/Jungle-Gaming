/**
 * URL do servidor Socket.IO.
 *  1) `localStorage["nftm:socket-url"]` (override; usado nos testes e para depuração)
 *  2) `VITE_SOCKET_URL`
 *  3) em desenvolvimento: http://localhost:3001 (servidor embutido no `npm run dev`)
 *  4) em produção sem variável: null => tempo real desativado e o app funciona só com REST/polling
 */
export function getSocketUrl(): string | null {
  try {
    const raw = localStorage.getItem('nftm:socket-url')
    if (raw) return JSON.parse(raw) as string
  } catch { /* ignora valor inválido */ }
  const env = import.meta.env.VITE_SOCKET_URL as string | undefined
  if (env) return env
  return import.meta.env.DEV ? 'http://localhost:3001' : null
}
