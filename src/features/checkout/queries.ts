import { useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from '@/app/session'
import { ordersApi } from '@/services/orders'
import { useRealtimeStatus } from '@/features/realtime/RealtimeProvider'

export const orderKey = (userId: string | undefined, id: string) => ['orders', userId ?? 'anon', 'detail', id] as const
export const ordersKey = (userId?: string) => ['orders', userId ?? 'anon', 'list'] as const

/** Acompanha o pedido: eventos order.updated em tempo real + polling como fallback. */
export function useOrder(id: string) {
  const { session } = useSession()
  const qc = useQueryClient()
  const realtime = useRealtimeStatus()
  const query = useQuery({
    queryKey: orderKey(session?.user.id, id),
    queryFn: ({ signal }) => ordersApi.get(id, signal),
    enabled: !!session,
    // com o socket conectado o polling é só uma rede de segurança (5 s); sem ele, vira o mecanismo principal (1,5 s)
    refetchInterval: (q) => (q.state.data?.status === 'pending' ? (realtime === 'connected' ? 5000 : 1500) : false),
  })
  // Ao confirmar, o servidor baixa estoque e remove do carrinho só o que foi comprado: reflete na interface
  const status = query.data?.status
  const done = useRef(false)
  useEffect(() => {
    if (status === 'confirmed' && !done.current) {
      done.current = true
      for (const k of ['cart', 'quote', 'nfts']) void qc.invalidateQueries({ queryKey: [k] })
    }
  }, [status, qc])
  return query
}

export function useOrders() {
  const { session } = useSession()
  return useQuery({ queryKey: ordersKey(session?.user.id), queryFn: ({ signal }) => ordersApi.list(signal), enabled: !!session })
}
