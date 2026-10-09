import type { Cart, CartLine, Order, Quote, SocketEvent } from '@/types'
import { add, cmp, mul, pct, sub, sum } from '@/lib/money'
import { db, newId, save } from './db'

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

/** Resolve pedidos pendentes cujo prazo venceu. Idempotente. */
export function settleOrders(flags: Record<string, string> = {}): SocketEvent[] {
  const events: SocketEvent[] = []
  const now = Date.now()
  for (const order of db.orders) {
    if (order.status !== 'pending' || (db.settleAt[order.id] ?? 0) > now) continue
    const rejected = flags['payment-rejected'] === 'true' || order.collector.name.toLowerCase().includes('recusar')
    order.version += 1
    if (rejected) {
      order.status = 'rejected'
      order.rejectionReason = 'Pagamento recusado pela carteira.'
    } else {
      order.status = 'confirmed'
      const userId = db.sessions.find((s) => s.userId && order.id.length > 0 && db.orders.includes(order))?.userId
      for (const item of order.items) {
        const nft = db.nfts.find((n) => n.id === item.nftId)
        if (nft) { nft.available = Math.max(0, nft.available - item.quantity); nft.version += 1 }
      }
      const owner = ownerOf(order.id)
      if (owner && db.carts[owner]) {
        const bought = new Map(order.items.map((i) => [i.nftId, i.quantity]))
        db.carts[owner].items = db.carts[owner].items.flatMap((ci) => {
          const q = bought.get(ci.nftId)
          if (!q) return [ci]
          return ci.quantity > q ? [{ ...ci, quantity: ci.quantity - q }] : []
        })
      }
      void userId
    }
    delete db.settleAt[order.id]
    db.eventSeq += 1
    events.push({
      type: 'order.updated', eventId: `evt_${db.eventSeq}`, resource: `order:${order.id}`, version: order.version,
      at: new Date().toISOString(), orderId: order.id, status: order.status, rejectionReason: order.rejectionReason,
    })
  }
  if (events.length) save()
  return events
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
