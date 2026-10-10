import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

/** Sobe o servidor Socket.IO de desenvolvimento junto com `npm run dev` (somente em modo serve). */
function socketDevServer(): Plugin {
  return {
    name: 'nft-socket-dev',
    apply: 'serve',
    async configureServer(server) {
      const { createSocketServer } = await import('./server/socket-server.mjs')
      const port = Number(process.env.SOCKET_PORT ?? 3001)
      const socket = await createSocketServer({ port })
      if (!socket) { server.config.logger.warn(`[socket] porta ${port} em uso: reutilizando o servidor existente`); return }
      server.config.logger.info(`[socket] Socket.IO (dev) em http://localhost:${port}`)
      server.httpServer?.on('close', () => void socket.close())
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), socketDevServer()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
})
