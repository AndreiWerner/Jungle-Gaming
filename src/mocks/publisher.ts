import { io, type Socket } from 'socket.io-client'
import type { SocketEvent } from '@/types'
import { getBackendId } from '@/lib/backendId'
import { getSocketUrl } from '@/lib/socketUrl'

/**
 * O "backend" simulado (MSW) publica eventos no servidor Socket.IO como role "backend";
 * o servidor os entrega aos clientes reais. Sem servidor disponível, publicar é um no-op
 * e o app continua funcionando por REST/polling.
 */
let socket: Socket | null = null

export function initPublisher() {
  const url = getSocketUrl()
  if (!url || socket) return
  socket = io(url, { auth: { role: 'backend', backendId: getBackendId() }, reconnectionDelay: 300, reconnectionDelayMax: 2000 })
}

export function publish(event: SocketEvent, userId?: string) {
  if (socket?.connected) socket.emit('publish', { event, userId })
}
