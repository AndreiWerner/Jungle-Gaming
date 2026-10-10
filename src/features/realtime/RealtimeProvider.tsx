import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { io } from 'socket.io-client'
import { useSession } from '@/app/session'
import { EventLedger, isSocketEvent } from '@/lib/eventLedger'
import { getBackendId } from '@/lib/backendId'
import { getSocketUrl } from '@/lib/socketUrl'
import { applyNftUpdated, applyOrderUpdated, reconcileAll } from './applyEvents'

export type RealtimeStatus = 'connecting' | 'connected' | 'reconnecting' | 'unavailable'
const Ctx = createContext<RealtimeStatus>('unavailable')
export const useRealtimeStatus = () => useContext(Ctx)

/**
 * Uma conexão por usuário: ao trocar de usuário (ou sair) a conexão anterior é encerrada e seus
 * listeners removidos, então nada do usuário anterior continua assinado.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const { session } = useSession()
  const userId = session?.user.id
  const [status, setStatus] = useState<RealtimeStatus>(() => (getSocketUrl() ? 'connecting' : 'unavailable'))

  useEffect(() => {
    const url = getSocketUrl()
    if (!url) return
    const ledger = new EventLedger()
    const socket = io(url, { auth: { userId: userId ?? null, backendId: getBackendId() }, reconnectionDelay: 300, reconnectionDelayMax: 2000, timeout: 4000 })
    let wasConnected = false
    let closed = false

    socket.on('connect', () => {
      setStatus('connected')
      if (wasConnected) reconcileAll(qc) // reconexão: recupera por REST o que possa ter sido perdido
      wasConnected = true
    })
    socket.on('disconnect', (reason) => {
      if (reason === 'io client disconnect') return
      setStatus('reconnecting')
      // Quando o SERVIDOR encerra a conexão de propósito, o socket.io-client não reconecta sozinho
      if (reason === 'io server disconnect') setTimeout(() => { if (!closed) socket.connect() }, 500)
    })
    socket.on('connect_error', () => {
      setStatus(wasConnected ? 'reconnecting' : 'unavailable')
      // Recusada por um middleware do servidor: o socket fica inativo e não tenta de novo sozinho
      if (!socket.active) setTimeout(() => { if (!closed) socket.connect() }, 1000)
    })

    socket.on('nft.updated', (e: unknown) => {
      if (isSocketEvent(e) && e.type === 'nft.updated' && ledger.accept(e) === 'ok') applyNftUpdated(qc, e)
    })
    socket.on('order.updated', (e: unknown) => {
      if (!userId) return
      if (isSocketEvent(e) && e.type === 'order.updated' && ledger.accept(e) === 'ok') applyOrderUpdated(qc, userId, e)
    })

    return () => { closed = true; socket.off(); socket.disconnect() }
  }, [qc, userId])

  return <Ctx.Provider value={status}>{children}</Ctx.Provider>
}
