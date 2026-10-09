import { http, HttpResponse } from 'msw'
import type { Cart, Network, Page, Session, SortKey, User, Wallet, WalletProvider } from '@/types'
import { cmp } from '@/lib/money'
import { db, newId, resetDb, save, type SessionRecord } from './db'
import { DEMO_PASSWORD_HASH } from './seed'
import { err, gate, parseScenario } from './scenarios'
import { buildQuote, createOrder, ownerOf, settleOrders } from './logic'
import { delay } from 'msw'

const SESSION_MS = 30 * 60 * 1000
const PAGE_SIZE = 8

export async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`nft-demo:${text}`))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

const publicUser = ({ id, name, email, createdAt }: User & { passwordHash?: string }): User => ({ id, name, email, createdAt })

function authenticate(request: Request): { userId: string } | Response {
  const sc = parseScenario(request)
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return err(401, 'UNAUTHORIZED', 'Faça login para continuar.')
  if (sc['session-expired']) return err(401, 'SESSION_EXPIRED', 'Sua sessão expirou.')
  const s = db.sessions.find((x) => x.token === token)
  if (!s) return err(401, 'UNAUTHORIZED', 'Sessão inválida.')
  if (new Date(s.expiresAt) < new Date()) return err(401, 'SESSION_EXPIRED', 'Sua sessão expirou.')
  return { userId: s.userId }
}
const isResponse = (v: unknown): v is Response => v instanceof Response

function openSession(userId: string): Session {
  const rec: SessionRecord = { token: newId('tok'), userId, expiresAt: new Date(Date.now() + SESSION_MS).toISOString() }
  db.sessions.push(rec)
  save()
  const user = db.users.find((u) => u.id === userId)!
  return { token: rec.token, user: publicUser(user), expiresAt: rec.expiresAt }
}

export const handlers = [
  // ---------- auth ----------
  http.post('/api/auth/register', async ({ request }) => {
    const g = await gate(request, 'auth.register'); if (g) return g
    const body = (await request.json()) as { name?: string; email?: string; password?: string }
    if (!body.name || !body.email || !body.password || body.password.length < 8) return err(400, 'BAD_REQUEST', 'Dados inválidos. A senha precisa de 8+ caracteres.')
    if (db.users.some((u) => u.email.toLowerCase() === body.email!.toLowerCase())) return err(409, 'CONFLICT', 'E-mail já cadastrado.')
    const user = { id: newId('u'), name: body.name, email: body.email, createdAt: new Date().toISOString(), passwordHash: await sha256(body.password) }
    db.users.push(user)
    db.favorites[user.id] = []
    db.wallets[user.id] = []
    save()
    return HttpResponse.json(openSession(user.id), { status: 201 })
  }),
  http.post('/api/auth/login', async ({ request }) => {
    const g = await gate(request, 'auth.login'); if (g) return g
    const body = (await request.json()) as { email?: string; password?: string }
    const user = db.users.find((u) => u.email.toLowerCase() === (body.email ?? '').toLowerCase())
    if (!user || !body.password || user.passwordHash !== (await sha256(body.password))) return err(401, 'UNAUTHORIZED', 'E-mail ou senha inválidos.')
    return HttpResponse.json(openSession(user.id))
  }),
  http.post('/api/auth/logout', async ({ request }) => {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    db.sessions = db.sessions.filter((s) => s.token !== token)
    save()
    return new HttpResponse(null, { status: 204 })
  }),
  http.get('/api/auth/session', async ({ request }) => {
    const g = await gate(request, 'auth.session'); if (g) return g
    const a = authenticate(request); if (isResponse(a)) return a
    const token = request.headers.get('authorization')!.replace('Bearer ', '')
    const rec = db.sessions.find((s) => s.token === token)!
    return HttpResponse.json({ token, user: publicUser(db.users.find((u) => u.id === a.userId)!), expiresAt: rec.expiresAt } satisfies Session)
  }),

  // ---------- NFTs ----------
  http.get('/api/nfts/featured', async ({ request }) => {
    const g = await gate(request, 'nfts.featured'); if (g) return g
    return HttpResponse.json(db.nfts.filter((n) => n.featured))
  }),
  http.get('/api/nfts/facets', async ({ request }) => {
    const g = await gate(request, 'nfts.facets'); if (g) return g
    return HttpResponse.json({ categories: [...new Set(db.nfts.map((n) => n.category))], collections: [...new Set(db.nfts.map((n) => n.collection))] })
  }),
  http.get('/api/nfts', async ({ request }) => {
    const g = await gate(request, 'nfts.list'); if (g) return g
    const sc = parseScenario(request)
    const q = new URL(request.url).searchParams
    const search = (q.get('search') ?? '').toLowerCase().trim()
    const category = q.get('category')
    const collection = q.get('collection')
    const sort = (q.get('sort') ?? 'recent') as SortKey
    const page = Math.max(1, Number(q.get('page') ?? 1) || 1)
    let items = sc.empty ? [] : db.nfts.filter((n) =>
      (!search || n.name.toLowerCase().includes(search) || n.collection.toLowerCase().includes(search)) &&
      (!category || n.category === category) && (!collection || n.collection === collection))
    items = [...items].sort((a, b) =>
      sort === 'price-asc' ? cmp(a.price, b.price) : sort === 'price-desc' ? cmp(b.price, a.price)
      : sort === 'name' ? a.name.localeCompare(b.name) : b.createdAt.localeCompare(a.createdAt))
    const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
    const body: Page<(typeof items)[number]> = { items: items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), page, pageSize: PAGE_SIZE, total: items.length, totalPages }
    return HttpResponse.json(body)
  }),
  http.get('/api/nfts/:id', async ({ request, params }) => {
    const g = await gate(request, 'nfts.detail'); if (g) return g
    const nft = db.nfts.find((n) => n.id === params.id)
    return nft ? HttpResponse.json(nft) : err(404, 'NOT_FOUND', 'NFT não encontrado.')
  }),

  // ---------- favoritos ----------
  http.get('/api/favorites', async ({ request }) => {
    const g = await gate(request, 'favorites.list'); if (g) return g
    const a = authenticate(request); if (isResponse(a)) return a
    return HttpResponse.json(db.favorites[a.userId] ?? [])
  }),
  http.put('/api/favorites/:nftId', async ({ request, params }) => {
    const g = await gate(request, 'favorites.add'); if (g) return g
    const a = authenticate(request); if (isResponse(a)) return a
    if (!db.nfts.some((n) => n.id === params.nftId)) return err(404, 'NOT_FOUND', 'NFT não encontrado.')
    const set = new Set(db.favorites[a.userId] ?? []); set.add(String(params.nftId))
    db.favorites[a.userId] = [...set]; save()
    return HttpResponse.json(db.favorites[a.userId])
  }),
  http.delete('/api/favorites/:nftId', async ({ request, params }) => {
    const g = await gate(request, 'favorites.remove'); if (g) return g
    const a = authenticate(request); if (isResponse(a)) return a
    db.favorites[a.userId] = (db.favorites[a.userId] ?? []).filter((id) => id !== params.nftId); save()
    return HttpResponse.json(db.favorites[a.userId])
  }),

  // ---------- carrinho / cupom / cotação ----------
  http.get('/api/cart', async ({ request }) => {
    const g = await gate(request, 'cart.get'); if (g) return g
    const a = authenticate(request); if (isResponse(a)) return a
    return HttpResponse.json(db.carts[a.userId] ?? { items: [], couponCode: null })
  }),
  http.put('/api/cart', async ({ request }) => {
    const g = await gate(request, 'cart.put'); if (g) return g
    const a = authenticate(request); if (isResponse(a)) return a
    const cart = (await request.json()) as Cart
    db.carts[a.userId] = cart; save()
    return HttpResponse.json(cart)
  }),
  http.post('/api/cart/merge', async ({ request }) => {
    const a = authenticate(request); if (isResponse(a)) return a
    const guest = (await request.json()) as Cart
    const cart = db.carts[a.userId] ?? { items: [], couponCode: null }
    // Idempotency-Key opcional: repetir a mesma mescla devolve o carrinho atual sem somar de novo
    const mergeKey = request.headers.get('idempotency-key')
    const mergeId = mergeKey ? `${a.userId}:merge:${mergeKey}` : null
    if (mergeId && db.idempotency[mergeId]) return HttpResponse.json(cart)
    for (const gi of guest.items) {
      const ex = cart.items.find((i) => i.nftId === gi.nftId)
      if (ex) ex.quantity += gi.quantity; else cart.items.push(gi)
    }
    cart.couponCode = cart.couponCode ?? guest.couponCode
    db.carts[a.userId] = cart
    if (mergeId) db.idempotency[mergeId] = 'done'
    save()
    return HttpResponse.json(cart)
  }),
  http.post('/api/coupons/validate', async ({ request }) => {
    const g = await gate(request, 'coupons.validate'); if (g) return g
    const { code } = (await request.json()) as { code?: string }
    const c = db.coupons.find((x) => x.code === (code ?? '').trim().toUpperCase())
    if (!c) return err(400, 'COUPON_INVALID', 'Cupom inválido.')
    if (new Date(c.expiresAt) < new Date()) return err(400, 'COUPON_EXPIRED', 'Cupom expirado.')
    return HttpResponse.json(c)
  }),
  http.post('/api/quote', async ({ request }) => {
    const g = await gate(request, 'quote'); if (g) return g
    const cart = (await request.json()) as Cart
    return HttpResponse.json(buildQuote(cart, parseScenario(request)))
  }),

  // ---------- pedidos ----------
  http.post('/api/orders', async ({ request }) => {
    const g = await gate(request, 'orders.create'); if (g) return g
    const a = authenticate(request); if (isResponse(a)) return a
    const sc = parseScenario(request)
    const key = request.headers.get('idempotency-key')
    if (!key) return err(400, 'BAD_REQUEST', 'Idempotency-Key obrigatório.')
    const idemKey = `${a.userId}:${key}`
    const existing = db.idempotency[idemKey]
    if (existing) return HttpResponse.json(db.orders.find((o) => o.id === existing), { status: 200 })
    const body = (await request.json()) as { quoteId: string; walletId: string; collector: { name: string; email: string } }
    const wallet = (db.wallets[a.userId] ?? []).find((w) => w.id === body.walletId)
    if (!wallet?.connected) return err(400, 'BAD_REQUEST', 'Conecte uma carteira para continuar.')
    const cart = db.carts[a.userId] ?? { items: [], couponCode: null }
    if (!cart.items.length) return err(400, 'BAD_REQUEST', 'Carrinho vazio.')
    const quote = buildQuote(cart, sc)
    if (quote.hasIssues) return err(409, quote.lines.some((l) => l.unavailable) ? 'SOLD_OUT' : 'PRICE_CHANGED', 'O carrinho mudou. Revise antes de confirmar.', { quote })
    if (quote.quoteId !== body.quoteId) return err(409, 'PRICE_CHANGED', 'Valores atualizados. Revise antes de confirmar.', { quote })
    const order = createOrder({
      items: quote.lines.map((l) => ({ nftId: l.nftId, name: l.nft!.name, collection: l.nft!.collection, edition: l.nft!.edition, image: l.nft!.images[0], quantity: l.quantity, unitPrice: l.currentPrice })),
      subtotal: quote.subtotal, discount: quote.discount, networkFee: quote.networkFee, total: quote.total,
      couponCode: quote.coupon?.code ?? null, walletId: wallet.id, network: wallet.network, collector: body.collector,
    }, a.userId)
    db.idempotency[idemKey] = order.id; save()
    if (sc['order-timeout']) await delay(12000)
    return HttpResponse.json(order, { status: 201 })
  }),
  http.get('/api/orders', async ({ request }) => {
    const g = await gate(request, 'orders.list'); if (g) return g
    const a = authenticate(request); if (isResponse(a)) return a
    settleOrders(parseScenario(request))
    return HttpResponse.json(db.orders.filter((o) => ownerOf(o.id) === a.userId).sort((x, y) => y.createdAt.localeCompare(x.createdAt)))
  }),
  http.get('/api/orders/:id', async ({ request, params }) => {
    const g = await gate(request, 'orders.detail'); if (g) return g
    const a = authenticate(request); if (isResponse(a)) return a
    settleOrders(parseScenario(request))
    const order = db.orders.find((o) => o.id === params.id)
    if (!order) return err(404, 'NOT_FOUND', 'Pedido não encontrado.')
    if (ownerOf(order.id) !== a.userId) return err(403, 'FORBIDDEN', 'Este pedido pertence a outro usuário.')
    return HttpResponse.json(order)
  }),

  // ---------- perfil ----------
  http.get('/api/profile', async ({ request }) => {
    const g = await gate(request, 'profile.get'); if (g) return g
    const a = authenticate(request); if (isResponse(a)) return a
    return HttpResponse.json(publicUser(db.users.find((u) => u.id === a.userId)!))
  }),
  http.patch('/api/profile', async ({ request }) => {
    const g = await gate(request, 'profile.patch'); if (g) return g
    const a = authenticate(request); if (isResponse(a)) return a
    const body = (await request.json()) as { name?: string }
    if (!body.name?.trim()) return err(400, 'BAD_REQUEST', 'Nome obrigatório.')
    const u = db.users.find((x) => x.id === a.userId)!; u.name = body.name.trim(); save()
    return HttpResponse.json(publicUser(u))
  }),

  // ---------- carteiras ----------
  http.get('/api/wallets', async ({ request }) => {
    const g = await gate(request, 'wallets.list'); if (g) return g
    const a = authenticate(request); if (isResponse(a)) return a
    return HttpResponse.json(db.wallets[a.userId] ?? [])
  }),
  http.post('/api/wallets', async ({ request }) => {
    const g = await gate(request, 'wallets.create'); if (g) return g
    const a = authenticate(request); if (isResponse(a)) return a
    const b = (await request.json()) as { provider: WalletProvider; network: Network }
    const w: Wallet = { id: newId('w'), provider: b.provider, network: b.network, address: `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`, connected: false }
    ;(db.wallets[a.userId] ??= []).push(w); save()
    return HttpResponse.json(w, { status: 201 })
  }),
  http.post('/api/wallets/:id/connect', async ({ request, params }) => {
    const g = await gate(request, 'wallets.connect'); if (g) return g
    const a = authenticate(request); if (isResponse(a)) return a
    if (parseScenario(request)['wallet-refuse']) return err(403, 'FORBIDDEN', 'Conexão recusada pelo usuário na carteira.')
    const w = (db.wallets[a.userId] ?? []).find((x) => x.id === params.id)
    if (!w) return err(404, 'NOT_FOUND', 'Carteira não encontrada.')
    w.connected = true; save()
    return HttpResponse.json(w)
  }),
  http.post('/api/wallets/:id/disconnect', async ({ request, params }) => {
    const a = authenticate(request); if (isResponse(a)) return a
    const w = (db.wallets[a.userId] ?? []).find((x) => x.id === params.id)
    if (!w) return err(404, 'NOT_FOUND', 'Carteira não encontrada.')
    w.connected = false; save()
    return HttpResponse.json(w)
  }),
  http.delete('/api/wallets/:id', async ({ request, params }) => {
    const a = authenticate(request); if (isResponse(a)) return a
    db.wallets[a.userId] = (db.wallets[a.userId] ?? []).filter((x) => x.id !== params.id); save()
    return new HttpResponse(null, { status: 204 })
  }),

  // ---------- utilitário de teste ----------
  http.post('/api/__reset', () => { resetDb(); return new HttpResponse(null, { status: 204 }) }),
]

export { DEMO_PASSWORD_HASH }
