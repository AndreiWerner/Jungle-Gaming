import { http } from '@/lib/http'
import type { Cart, Coupon, Quote } from '@/types'

export const cartApi = {
  get: (signal?: AbortSignal) => http.get<Cart>('/cart', { signal }).then((r) => r.data),
  put: (cart: Cart) => http.put<Cart>('/cart', cart).then((r) => r.data),
  /** `idempotencyKey` torna a mescla repetível sem duplicar itens (ex.: aba fechada no meio da operação). */
  merge: (guest: Cart, idempotencyKey: string) => http.post<Cart>('/cart/merge', guest, { headers: { 'Idempotency-Key': idempotencyKey } }).then((r) => r.data),
  /** Cotação pública: serve também ao carrinho de visitante. */
  quote: (cart: Cart, signal?: AbortSignal) => http.post<Quote>('/quote', cart, { signal }).then((r) => r.data),
  validateCoupon: (code: string) => http.post<Coupon>('/coupons/validate', { code }).then((r) => r.data),
}
