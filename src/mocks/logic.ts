import type { Cart, CartLine, Order, Quote, SocketEvent } from '@/types'
import { add, cmp, mul, pct, sub, sum } from '@/lib/money'
import { db, newId, save } from './db'
import { publish } from './publisher'
import { currentScenario } from './scenarios'

export const NETWORK_FEE = '0.0015'

export function buildQuote(cart: Cart, flags: Record<string, string> = {}): Quote {
  const lines: CartLine[] = cart.items.map((item) => {
    const nft = db.nfts.find((n) => n.id === item.nftId) ?? null
    const current = nft ? (flags['price-changed'] ? add(nft.price, '0.01') : nft.price) : item.unitPrice
    const available = flags['sold-out'] ? 0 : nft?.available ?? 0
    return {
      ...item, nft, currentPrice: current,
      priceChanged: !!nft && cmp(current, item.unitPrice) !== 0,
      unavailable: !nft || available <= 0,
      exceedsStock: !!nft && available > 0 && item.quantity > available,
    }
  })
  const subtotal = sum(lines.map((l) => mul(l.currentPrice, l.quantity)))
  const coupon = cart.couponCode ? db.coupons.find((c) => c.code === cart.couponCode) ?? null : null
  const validCoupon = coupon && new Date(coupon.expiresAt) > new Date() ? coupon : null
  const discount = validCoupon ? pct(subtotal, validCoupon.percent) : '0'
  const networkFee = lines.length ? NETWORK_FEE : '0'
  const total = add(sub(subtotal, discount), networkFee)
  const hasIssues = lines.some((l) => l.priceChanged || l.unavailable || l.exceedsStock)
  const quoteId = [lines.map((l) => `${l.nftId}:${l.quantity}:${l.currentPrice}`).join('|'), validCoupon?.code ?? '', total].join('#')
  return { lines, subtotal, discount, networkFee, total, coupon: validCoupon, hasIssues, quoteId }
}

export interface Published { event: SocketEvent; userId?: string }
export const nextEventId = () => { db.eventSeq += 1; return `evt_${Date.now().toString(36)}_${db.eventSeq}` }

/** Resolve pedidos pendentes cujo prazo venceu. Idempotente. Devolve os eventos a publicar. */
export function settleOrders(flags: Record<string, string> = {}): Published[] {
  const out: Published[] = []
  const now = Date.now()
  for (const order of db.orders) {
    if (order.status !== 'pending' || (db.settleAt[order.id] ?? 0) > now) continue
    const rejected = flags['payment-rejected'] === 'true' || order.collector.name.toLowerCase().includes('recusar')
    const owner = ownerOf(order.id)
    order.version += 1
    if (rejected) {
      order.status = 'rejected'
      order.rejectionReason = 'Pagamento recusado pela carteira.'
    } else {
      order.status = 'confirmed'
      for (const item of order.items) {
        const nft = db.nfts.find((n) => n.id === item.nftId)
        if (!nft) continue
        nft.available = Math.max(0, nft.available - item.quantity)
        nft.version += 1
        out.push({ event: { type: 'nft.updated', eventId: nextEventId(), resource: `nft:${nft.id}`, version: nft.version, at: new Date().toISOString(), nftId: nft.id, changes: { available: nft.available } } })
      }
      if (owner && db.carts[owner]) {
        const bought = new Map(order.items.map((i) => [i.nftId, i.quantity]))
        db.carts[owner].items = db.carts[owner].items.flatMap((ci) => {
          const q = bought.get(ci.nftId)
          if (!q) return [ci]
          return ci.quantity > q ? [{ ...ci, quantity: ci.quantity - q }] : []
        })
      }
    }
    delete db.settleAt[order.id]
    out.push({ userId: owner, event: { type: 'order.updated', eventId: nextEventId(), resource: `order:${order.id}`, version: order.version, at: new Date().toISOString(), orderId: order.id, status: order.status, rejectionReason: order.rejectionReason } })
  }
  if (out.length) save()
  return out
}

/** Resolve e publica os eventos resultantes no servidor Socket.IO. */
export function settleAndPublish(flags: Record<string, string> = {}) {
  for (const { event, userId } of settleOrders(flags)) publish(event, userId)
}

/**
 * Reagenda a resolução dos pedidos ainda pendentes. O timer criado no POST vive na página que o fez e morre
 * numa recarga/navegação; um backend real continuaria processando, então o mock retoma de onde parou.
 */
export function schedulePendingSettlements() {
  for (const order of db.orders) {
    if (order.status !== 'pending') continue
    const wait = Math.max(0, (db.settleAt[order.id] ?? 0) - Date.now()) + 100
    setTimeout(() => settleAndPublish(currentScenario()), wait)
  }
}

const owners: Record<string, string> = {}
export const setOwner = (orderId: string, userId: string) => { owners[orderId] = userId; db.idempotency[`owner:${orderId}`] = userId }
export const ownerOf = (orderId: string): string | undefined => owners[orderId] ?? db.idempotency[`owner:${orderId}`]

export function createOrder(order: Omit<Order, 'id' | 'txRef' | 'createdAt' | 'version' | 'status'>, userId: string): Order {
  const created: Order = {
    ...order, id: newId('ord'), txRef: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
    createdAt: new Date().toISOString(), version: 1, status: 'pending',
  }
  db.orders.push(created)
  db.settleAt[created.id] = Date.now() + 2500
  setOwner(created.id, userId)
  save()
  return created
}
