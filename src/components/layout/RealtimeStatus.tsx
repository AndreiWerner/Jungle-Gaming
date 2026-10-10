import { useRealtimeStatus, type RealtimeStatus as Status } from '@/features/realtime/RealtimeProvider'

const TEXT: Record<Status, string> = {
  connected: 'Tempo real: conectado',
  connecting: 'Tempo real: conectando…',
  reconnecting: 'Tempo real: reconectando…',
  unavailable: 'Tempo real indisponível: atualizando periodicamente',
}

export function RealtimeStatus() {
  const status = useRealtimeStatus()
  return <footer className="mx-auto max-w-7xl px-4 py-6 text-xs text-muted"><p>{TEXT[status]}</p></footer>
}
