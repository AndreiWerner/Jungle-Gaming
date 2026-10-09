import type { Cart } from '@/types'
import { KEYS, storage } from '@/lib/storage'
import { EMPTY_CART } from './cartOps'
import { cartApi } from '@/services/cart'

/** Lê o carrinho de visitante validando o formato (o localStorage pode ter sido adulterado). */
export function readGuestCart(): Cart {
  const raw = storage.get<Cart>(KEYS.guestCart)
  if (!raw || !Array.isArray(raw.items)) return EMPTY_CART
  const items = raw.items.filter((i) => typeof i?.nftId === 'string' && Number.isInteger(i.quantity) && i.quantity > 0 && typeof i.unitPrice === 'string')
  return { items, couponCode: typeof raw.couponCode === 'string' ? raw.couponCode : null }
}
export const writeGuestCart = (cart: Cart) => storage.set(KEYS.guestCart, cart)
export const clearGuestCart = () => storage.remove(KEYS.guestCart)

/**
 * Mescla o carrinho de visitante no carrinho do usuário autenticado e só então o descarta.
 * Se a chamada falhar, o carrinho de visitante é preservado e a próxima tentativa repete a mescla.
 */
export async function mergeGuestCartIfAny() {
  const guest = readGuestCart()
  if (guest.items.length === 0) return
  // a mesma chave é reutilizada até a mescla concluir; assim, uma nova tentativa nunca soma em duplicidade
  const key = storage.get<string>(KEYS.mergeKey) ?? crypto.randomUUID()
  storage.set(KEYS.mergeKey, key)
  await cartApi.merge(guest, key)
  clearGuestCart()
  storage.remove(KEYS.mergeKey)
}
