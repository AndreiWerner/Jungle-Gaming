# NFT Marketplace

Marketplace de NFTs (demonstração) em **React + TypeScript**, com catálogo, detalhe, favoritos, carrinho, cupom,
checkout, carteiras, pedidos, perfil e atualizações em tempo real. **Todo o backend é simulado**: API REST via MSW,
autenticação fictícia, carteiras e pagamentos simulados. Não há blockchain, extensão de carteira nem gateway real.

## Stack

React 19 · TypeScript · TanStack Router · TanStack Query · Axios · Socket.IO (client + servidor de dev) · Tailwind CSS 4 ·
componentes no estilo shadcn/ui (cva + tailwind-merge, escritos no projeto) · MSW 3 · Playwright · decimal.js (valores em ETH).

## Instalação e execução

Requisitos: Node 20+ (testado com 22) e npm.

```bash
npm install
npm run dev          # app em http://localhost:5173 + servidor Socket.IO de desenvolvimento em :3001
```

| Script | O que faz |
|---|---|
| `npm run dev` | Vite + servidor Socket.IO (porta 3001, embutido por um plugin do Vite) |
| `npm run dev:socket` | Sobe **só** o servidor Socket.IO (`server/socket-server.mjs`) |
| `npm run build` | `tsc --noEmit` + build de produção |
| `npm run preview` | Serve o build de produção (sem servidor Socket.IO: tempo real indisponível, polling assume) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Testes end-to-end com Playwright |

### Variáveis de ambiente (`.env.example`)

| Variável | Padrão | Descrição |
|---|---|---|
| `VITE_ENABLE_MSW` | `true` | `false` desliga o MSW (só faz sentido com um backend real em `/api`) |
| `VITE_SOCKET_URL` | vazio | URL do servidor Socket.IO. Em dev, vazio = `http://localhost:3001`. Em produção, vazio = tempo real desativado |
| `SOCKET_PORT` | `3001` | Porta do servidor Socket.IO de dev |
| `SOCKET_CORS_ORIGIN` | `*` | Origem permitida ao rodar `npm run dev:socket` |

## Credenciais fictícias

| Usuário | E-mail | Senha |
|---|---|---|
| Ana Souza | `ana@demo.com` | `Senha123!` |
| Bruno Lima | `bruno@demo.com` | `Senha123!` |

Também é possível criar contas em `/register` (senha com 8+ caracteres). Nenhuma senha é guardada em texto puro (hash SHA-256 com prefixo).

Cupons: `WELCOME10` (10%) e `EXPIRED20` (expirado, para testar o erro).

## Rotas

`/` catálogo · `/nft/:id` detalhe · `/cart` carrinho · `/login` · `/register` · e, **privadas** (redirecionam ao login e voltam ao destino):
`/checkout` · `/order/:id` · `/profile` · `/wallets`.

## Cenários de erro do MSW

Os cenários são lidos de `localStorage["nftm:scenario"]` (string JSON) e enviados no header `x-mock-scenario`.
Exemplo no console do navegador: `localStorage.setItem('nftm:scenario', JSON.stringify('nfts.list=500;latency=800'))`
e, para limpar, `localStorage.removeItem('nftm:scenario')`.

Formato: `chave=valor;chave=valor`.

- `latency=<ms>`: latência de todas as respostas.
- `<rota>=<status|timeout|network>`: falha forçada. Rotas: `nfts.list`, `nfts.detail`, `nfts.featured`, `nfts.facets`, `auth.login`,
  `auth.register`, `auth.session`, `favorites.list|add|remove`, `cart.get`, `cart.put`, `quote`, `coupons.validate`,
  `orders.create|list|detail`, `profile.get|patch`, `wallets.list|create|connect|disconnect|remove`.
  Status aceitos: `400 401 403 404 409 500`; `timeout` (15 s) e `network` (falha de rede).
- Flags: `session-expired`, `payment-rejected`, `order-timeout` (a criação do pedido demora 12 s), `price-changed`, `sold-out`, `empty`, `wallet-refuse`.

Outros mecanismos de teste: `localStorage["nftm:socket-url"]` sobrescreve a URL do Socket.IO.

### Resetar os dados simulados

O banco simulado vive no `localStorage` (`nftm:mockdb`). Para resetar: `localStorage.clear()` e recarregar, ou, no console, `window.__resetMocks()`.

## Testes

```bash
npx playwright install chromium   # uma vez
npm run test:e2e                  # sobe o app (e o Socket.IO) automaticamente
npx playwright show-report        # relatório HTML
```

Os testes ficam em `e2e/` (autenticação, catálogo, detalhe, favoritos, carrinho, carteiras, checkout/pedidos, perfil,
tempo real e responsividade em 390/768/1440 px). Cada teste roda em um contexto novo, então começa com o banco simulado limpo.
O `playwright.config.ts` reaproveita um `npm run dev` já aberto na porta 5173; feche-o para uma execução 100% limpa.

## Lighthouse

Resultados medidos e limitações em `ARCHITECTURE.md` (seção "Lighthouse"): metas atingidas, **exceto Performance do catálogo em mobile (85)**.
Para rodar: `npm run build && npm run preview` e, em outro terminal, `npx lighthouse http://localhost:4173 --view` (Chrome instalado).

## Deploy (Vercel)

1. `vercel.json` já reescreve todas as rotas para `index.html` (SPA).
2. Build: `npm run build`, saída em `dist/`. O MSW roda no navegador e funciona em produção (o `mockServiceWorker.js` está em `public/`).
3. **Socket.IO em produção:** a Vercel **não** mantém conexões WebSocket persistentes em funções serverless. O build publicado na Vercel
   funciona **sem tempo real** (o app detecta a ausência do servidor e usa polling para pedidos). Para ter tempo real em produção é preciso
   hospedar `server/socket-server.mjs` em um serviço com processo Node persistente (Render, Railway, Fly.io etc.), definir `SOCKET_CORS_ORIGIN`
   com o domínio do front e `VITE_SOCKET_URL` no build do front. **Esse caminho não foi testado em produção neste projeto.**
   Detalhes e limitações em `ARCHITECTURE.md`.
