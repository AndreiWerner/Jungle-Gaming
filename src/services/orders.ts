import { http } from '@/lib/http'
import type { Order } from '@/types'

export interface CreateOrderInput { quoteId: string; walletId: string; collector: { name: string; email: string } }

export const ordersApi = {
  /** `idempotencyKey` identifica a tentativa de compra: repetir a chave nunca cria um segundo pedido. */
  create: (input: CreateOrderInput, idempotencyKey: string) =>
    http.post<Order>('/orders', input, { headers: { 'Idempotency-Key': idempotencyKey } }).then((r) => r.data),
  get: (id: string, signal?: AbortSignal) => http.get<Order>(`/orders/${id}`, { signal }).then((r) => r.data),
  list: (signal?: AbortSignal) => http.get<Order[]>('/orders', { signal }).then((r) => r.data),
}
