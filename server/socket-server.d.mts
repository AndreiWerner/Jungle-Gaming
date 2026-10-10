import type { Server } from 'socket.io'
export function createSocketServer(opts?: { port?: number; corsOrigin?: string }): Promise<{ io: Server; close: () => Promise<void> } | null>
