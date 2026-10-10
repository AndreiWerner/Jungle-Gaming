// Servidor Socket.IO de DESENVOLVIMENTO/DEMONSTRAÇÃO.
//
// Papel: relay de eventos. O "backend" simulado (handlers do MSW, que rodam no navegador) publica eventos
// aqui com role "backend"; este servidor os entrega aos clientes reais via WebSocket:
//   - nft.updated   -> clientes do mesmo backend simulado
//   - order.updated -> somente à sala do dono do pedido
//
// ISOLAMENTO: cada navegador tem o seu próprio banco simulado (MSW + localStorage), identificado por `backendId`.
// Eventos publicados por um backend só alcançam clientes com o MESMO backendId.
//
// LIMITAÇÃO: este servidor NÃO autentica tokens (eles existem apenas no navegador, no mock) e NÃO é
// infraestrutura de produção. Em produção, WebSocket exige um processo Node persistente (ver ARCHITECTURE.md).
import { createServer } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Server } from 'socket.io'

const EVENT_TYPES = new Set(['nft.updated', 'order.updated'])
const isEvent = (e) =>
  e && typeof e === 'object' && EVENT_TYPES.has(e.type) && typeof e.eventId === 'string' && e.eventId &&
  typeof e.resource === 'string' && Number.isInteger(e.version) && e.version >= 1 && typeof e.at === 'string'

const tenantOf = (auth) => (typeof auth?.backendId === 'string' && auth.backendId) || 'default'
const tenantRoom = (t) => `tenant:${t}`
const userRoom = (t, u) => `user:${t}:${u}`

/** Retorna { io, close } ou null se a porta já estiver em uso (outro servidor já atende). */
export function createSocketServer({ port = 3001, corsOrigin = '*' } = {}) {
  return new Promise((resolve) => {
    const http = createServer()
    const io = new Server(http, { cors: { origin: corsOrigin } })
    const blockUntil = new Map() // tenant -> instante até o qual novas conexões de clientes são recusadas

    // Ferramenta de teste: recusa conexões de clientes de um tenant por um tempo (simula queda de rede)
    io.use((socket, next) => {
      const backend = socket.handshake.auth?.role === 'backend'
      if (!backend && Date.now() < (blockUntil.get(tenantOf(socket.handshake.auth)) ?? 0)) return next(new Error('blocked'))
      next()
    })

    io.on('connection', (socket) => {
      const { role, userId } = socket.handshake.auth ?? {}
      const tenant = tenantOf(socket.handshake.auth)
      socket.data.tenant = tenant
      if (role === 'backend') socket.data.backend = true
      else {
        socket.join(tenantRoom(tenant))
        if (typeof userId === 'string' && userId) socket.join(userRoom(tenant, userId))
      }

      socket.on('publish', (payload, ack) => {
        const reply = typeof ack === 'function' ? ack : () => {}
        if (!socket.data.backend) return reply({ ok: false, error: 'forbidden' })
        const { event, userId: target } = payload ?? {}
        if (!isEvent(event)) return reply({ ok: false, error: 'invalid-event' })
        if (event.type === 'nft.updated') io.to(tenantRoom(tenant)).emit('nft.updated', event)
        else if (typeof target === 'string' && target) io.to(userRoom(tenant, target)).emit('order.updated', event)
        else return reply({ ok: false, error: 'missing-user' })
        reply({ ok: true })
      })

      // Comandos de desenvolvimento (somente para o papel "backend"; afetam só o próprio tenant)
      socket.on('dev:kick', async (_p, ack) => {
        if (!socket.data.backend) return
        for (const s of await io.in(tenantRoom(tenant)).fetchSockets()) s.disconnect(true)
        if (typeof ack === 'function') ack({ ok: true })
      })
      socket.on('dev:block', ({ ms } = {}, ack) => {
        if (!socket.data.backend) return
        blockUntil.set(tenant, Date.now() + Math.max(0, Number(ms) || 0))
        if (typeof ack === 'function') ack({ ok: true })
      })
      socket.on('dev:stats', (_p, ack) => {
        if (!socket.data.backend || typeof ack !== 'function') return
        const rooms = {}
        const prefix = `user:${tenant}:`
        for (const [name, members] of io.sockets.adapter.rooms) if (name.startsWith(prefix)) rooms[`user:${name.slice(prefix.length)}`] = members.size
        ack({ rooms })
      })
    })

    http.once('error', () => resolve(null))
    http.listen(port, () => resolve({ io, close: () => new Promise((r) => { io.close(() => r()) }) }))
  })
}

// Execução direta: `npm run dev:socket`
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.SOCKET_PORT ?? 3001)
  createSocketServer({ port, corsOrigin: process.env.SOCKET_CORS_ORIGIN ?? '*' }).then((s) => {
    if (!s) { console.error(`[socket] porta ${port} em uso`); process.exit(1) }
    console.log(`[socket] Socket.IO (dev) em http://localhost:${port}`)
  })
}
