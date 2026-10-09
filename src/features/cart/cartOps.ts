import type { Cart, NFT } from '@/types'

export const EMPTY_CART: Cart = { items: [], couponCode: null }

export const itemCount = (cart: Cart) => cart.items.reduce((n, i) => n + i.quantity, 0)
export const quantityOf = (cart: Cart, nftId: string) => cart.items.find((i) => i.nftId === nftId)?.quantity ?? 0

/** Soma a quantidade; o preço registrado passa a ser o que o usuário viu ao adicionar. */
export function addItem(cart: Cart, nft: NFT, quantity: number): Cart {
  const exists = cart.items.some((i) => i.nftId === nft.id)
  const items = exists
    ? cart.items.map((i) => (i.nftId === nft.id ? { ...i, quantity: i.quantity + quantity, unitPrice: nft.price } : i))
    : [...cart.items, { nftId: nft.id, quantity, unitPrice: nft.price }]
  return { ...cart, items }
}
export const setQuantity = (cart: Cart, nftId: string, quantity: number): Cart =>
  ({ ...cart, items: cart.items.map((i) => (i.nftId === nftId ? { ...i, quantity } : i)) })
export const removeItem = (cart: Cart, nftId: string): Cart => ({ ...cart, items: cart.items.filter((i) => i.nftId !== nftId) })
export const acceptPrice = (cart: Cart, nftId: string, price: string): Cart =>
  ({ ...cart, items: cart.items.map((i) => (i.nftId === nftId ? { ...i, unitPrice: price } : i)) })
export const withCoupon = (cart: Cart, code: string | null): Cart => ({ ...cart, couponCode: code })
export const sameCart = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
