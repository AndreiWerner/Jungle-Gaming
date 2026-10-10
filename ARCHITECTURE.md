# Arquitetura

## Visão geral

```
UI (routes/ + features/*)  →  hooks TanStack Query  →  services/ (Axios)  →  /api/*  →  MSW (mocks/)
                                     ▲                                                     │ publish
                                     └── RealtimeProvider (socket.io-client) ◄── servidor Socket.IO (dev) ◄┘
```

- `src/routes/`: páginas (uma por rota). `src/features/<domínio>/`: componentes, hooks (`queries.ts`) e regras de cada área
  (catalog, nft, favorites, cart, checkout, wallets, profile, auth, realtime). `src/services/`: único lugar com chamadas HTTP.
  `src/lib/`: utilitários (HTTP, erros, dinheiro, storage, ledger de eventos). `src/mocks/`: todo o backend simulado.
  `src/types/`: contratos TypeScript. Nenhum dado simulado vive em componentes.
- Estado remoto: TanStack Query. Estado local: `useState`. Sessão: `SessionProvider` + `localStorage`.
- Valores em ETH são **strings decimais** manipuladas com `decimal.js` (`lib/money.ts`), nunca `number`.

## Contratos REST (MSW)

| Método e rota | Auth | Observações |
|---|---|---|
| `POST /auth/register` `{name,email,password}` | – | 201 `Session`; 409 e-mail duplicado; 400 dados inválidos |
| `POST /auth/login` `{email,password}` | – | 200 `Session`; 401 credenciais inválidas |
| `POST /auth/logout` · `GET /auth/session` | sim | 401 `SESSION_EXPIRED` quando expira |
| `GET /nfts?search&category&collection&sort&page` | – | `Page<NFT>` (8 por página); `GET /nfts/featured`, `/nfts/facets`, `/nfts/:id` (404) |
| `GET /favorites` · `PUT\|DELETE /favorites/:nftId` | sim | lista de ids por usuário |
| `GET\|PUT /cart` · `POST /cart/merge` | sim | `merge` aceita `Idempotency-Key` opcional |
| `POST /quote` `Cart` | – | `Quote` (linhas com avisos, subtotal, desconto, taxa 0.0015, total, `quoteId`) |
| `POST /coupons/validate` | – | 400 `COUPON_INVALID` / `COUPON_EXPIRED` |
| `GET\|POST /wallets` · `POST /wallets/:id/connect\|disconnect` · `DELETE /wallets/:id` | sim | 400 provedor/rede inválidos; 403 recusa; 404 |
| `POST /orders` `{quoteId,walletId,collector}` + `Idempotency-Key` | sim | 201 pedido `pending`; 200 se a chave já existe; 409 com `details.quote` se algo mudou |
| `GET /orders` · `GET /orders/:id` | sim | 403 pedido de outro usuário; 404 |
| `GET\|PATCH /profile` | sim | só `name` é editável |

Utilitários de teste: `POST /__reset`, `POST /__nft-update {id, price?, available?}` (muda o banco e publica `nft.updated`).

## Política de sessão

Sessão (`token`, `user`, `expiresAt`, 30 min) em `localStorage["nftm:session"]`, validada na leitura. O interceptor do Axios anexa o token;
um `401 SESSION_EXPIRED` encerra a sessão e leva ao login com aviso. Logout apaga a sessão local **imediatamente** e avisa a API em segundo plano.
Guardas de rota (`beforeLoad`) protegem as rotas privadas e preservam o destino em `?redirect=` (apenas caminhos internos). O `SessionWatcher`
reavalia os guardas quando a sessão muda (logout/expiração em página privada). Ao entrar ou sair, **todo o cache do Query é limpo** e as chaves
de cache privadas incluem o id do usuário.

## Estratégia de cache

Chaves: `['nfts','list'|'detail'|'featured'|'facets', …]`, `['favorites', userId]`, `['cart', userId|'guest']`, `['quote', cart]`,
`['wallets', userId]`, `['orders', userId, 'list'|'detail', id]`, `['profile', userId]`. Consultas de catálogo mantêm a página anterior enquanto
carregam e abortam requisições obsoletas via `signal`. Favoritos e carrinho usam atualização otimista com rollback (ver abaixo).

## Carrinho

Visitante: `localStorage["nftm:cart:guest"]` (validado). Autenticado: servidor. Ao entrar, o carrinho de visitante é mesclado
(`POST /cart/merge` com `Idempotency-Key`, reutilizada até concluir, então repetir não duplica itens) e só então descartado.
Mutações usam `scope` (gravações em série), `onMutate` otimista, rollback restrito quando nada mais mudou (senão reconcilia com a API) e invalidação.
O resumo vem de `POST /quote`; avisos de preço alterado, indisponível e acima do estoque bloqueiam o checkout.

## Idempotência (pedidos)

O checkout revalida a cotação antes de comprar: se o `quoteId` ou os avisos mudaram, **não cria pedido** e exige nova confirmação.
Cada tentativa usa uma `Idempotency-Key` estável: clique repetido e reenvio após timeout reutilizam a chave e nunca criam um segundo pedido
(no mock, checar+criar+registrar a chave é atômico). Falhas definitivas (409/400) descartam a chave. O recibo guarda um **snapshot** dos itens.
Confirmar baixa o estoque e remove do carrinho só o que foi comprado; recusar preserva o carrinho.

## Socket.IO e reconciliação com REST

**Eventos** (`types/index.ts`): `nft.updated {nftId, changes{price?,available?}}` e `order.updated {orderId, status, rejectionReason?}`, ambos com
`eventId` (identidade estável), `resource` (`nft:<id>` / `order:<id>`), `version` e `at`.

**Cliente** (`features/realtime`): `RealtimeProvider` abre uma conexão por usuário; ao trocar/sair, desconecta e remove os listeners. O `EventLedger`
descarta **duplicados** (mesmo `eventId`) e **antigos** (versão ≤ última aceita do recurso); o cache só é alterado se a versão do evento for maior que a
do dado em cache (um REST mais novo vence). `nft.updated` atualiza detalhe e listas em memória, marca listas como obsoletas e invalida `['quote']`
(carrinho/checkout). `order.updated` atualiza o pedido do usuário atual e invalida o histórico. Na **reconexão**, tudo (`nfts`, `quote`, `cart`, `orders`)
é invalidado e rebuscado via REST. Os eventos não passam por `setState` direto: sempre `socket.io-client → ledger → cache do Query`.

**Polling de pedidos** continua como fallback, no detalhe (`useOrder`) **e no histórico** (`useOrders`, enquanto houver pedido pendente): 5 s com o socket
conectado (rede de segurança) e 1,5 s sem ele. Ao criar um pedido, o checkout também invalida o histórico em cache. O estado é exibido no rodapé
("Tempo real: conectado / reconectando… / indisponível").

### Servidor de desenvolvimento × produção

`server/socket-server.mjs` é um **relay de desenvolvimento**, iniciado junto com `npm run dev` por um plugin do Vite (ou isolado com `npm run dev:socket`).
Como todo o "backend" é o MSW dentro do navegador, os handlers publicam seus eventos neste servidor (cliente com `role: "backend"`) e ele os entrega:
`nft.updated` aos clientes do mesmo backend simulado; `order.updated` somente à sala do dono do pedido. Os pedidos são resolvidos por um timer do mock (~2,6 s), como faria um backend real. Como esse timer vive na página que fez o `POST`, uma recarga ou
navegação completa o destruiria; por isso o mock **reagenda os pedidos pendentes ao iniciar** (`schedulePendingSettlements`) e a resolução também ocorre
de forma preguiçosa em `GET /orders` e `GET /orders/:id` quando o prazo já venceu.

**Isolamento por backend simulado:** cada navegador tem o próprio banco (MSW + `localStorage`), identificado por `localStorage["nftm:backend-id"]`.
Cliente e publisher enviam esse `backendId` no handshake e o servidor só entrega eventos a clientes do **mesmo** `backendId` (salas `tenant:<id>` e
`user:<id>:<userId>`). Sem isso um evento do banco de uma aba corromperia o estado de outra, que tem um banco independente.

**Reconexão:** o socket.io-client não reconecta sozinho quando o servidor encerra a conexão de propósito (`io server disconnect`) nem quando um middleware
a recusa (`socket.active === false`); o `RealtimeProvider` trata os dois casos chamando `connect()` manualmente.

Limitações **conhecidas**:
- O servidor **não valida tokens** (eles só existem no navegador/mock): o `userId` do handshake é confiado. Num backend real a sala seria derivada do token validado.
- Os eventos só existem enquanto uma aba com o MSW estiver aberta (é ela que os publica).
- **Produção/Vercel:** funções serverless não mantêm WebSocket. **Não há comprovação de que o Socket.IO funcione na Vercel**, e o app não depende dele:
  sem `VITE_SOCKET_URL` o build de produção desliga o tempo real e usa REST/polling. Para tempo real em produção é necessário hospedar o servidor
  em um processo persistente separado (não testado aqui).

## Testes

Playwright em `e2e/`, contra `npm run dev` (MSW + Socket.IO). Os testes de tempo real usam um cliente Socket.IO em Node para publicar eventos
(duplicados, antigos, inválidos), derrubar e bloquear reconexões (`dev:kick`, `dev:block`) e inspecionar as salas (`dev:stats`).

## Decisões importantes e limitações

- Carteiras e rede: a rede é atributo da carteira (não há endpoint para trocá-la); escolhe-se carteira+rede ao adicionar e a carteira no checkout.
- shadcn/ui: componentes no estilo shadcn escritos à mão (sem a CLI/Radix); o diálogo de confirmação usa `<dialog>` nativo.
- O banco simulado vive no `localStorage` (inclui tokens de sessão): aceitável para demonstração, **não** para produção.
- Fidelidade ao Figma **não foi verificada**: o arquivo exige login e não foi acessível durante o desenvolvimento.

## Lighthouse

Procedimento: `npm run build`, `npm run preview` (porta 4173) e a API Node do Lighthouse 13.5 com Chromium 1194 *headless* (container Linux de **1 núcleo**, sem GPU),
categorias performance, accessibility, best-practices e seo, perfis `mobile` (padrão) e `desktop`. Metas: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90.
Uma execução por célula, exceto o catálogo mobile (4 execuções), porque a variação entre execuções é grande neste ambiente.

| Página | Perfil | Perf | A11y | BP | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|---|
| Catálogo `/` | mobile | **73 · 85 · 87 · 88** (mediana ≈ 86) | 100 | 96 | 92 | 3.2–4.0 s | 0 | 160–260 ms |
| Catálogo `/` | desktop | 100 | 96 | 100 | 92 | 0.8 s | 0.001 | 30 ms |
| Detalhe `/nft/1` | mobile | 91 | 96 | 100 | 92 | 2.9 s | 0 | 100 ms |
| Detalhe `/nft/1` | desktop | 100 | 96 | 100 | 92 | 0.6 s | 0 | 0 ms |
| Login `/login` | mobile | 92 | 96 | 100 | 91 | 2.9 s | 0 | 60 ms |
| Login `/login` | desktop | 100 | 96 | 100 | 91 | 0.6 s | 0 | 0 ms |

Resultado: **todas as metas foram atingidas, exceto Performance do catálogo em mobile**, que ficou entre 73 e 88 (mediana ≈ 86) e **nunca chegou a 90**.
Histórico: a primeira medição do catálogo deu 72 no mobile e 86 no desktop com CLS 0.268; o deslocamento era causado pela seção "Em destaque", que aparecia depois
do catálogo e o empurrava. Reservar o espaço com skeletons zerou o CLS. Foi testada a divisão do código por rota (`lazyRouteComponent`): o bundle inicial caiu de
560 kB para 409 kB, mas a nota não melhorou de forma mensurável e a partida a frio dos testes ficou mais lenta (+~400 ms depois do `load`), então foi **revertida**.
Causa provável do que resta: o MSW (chunk de ~408 kB, 158 kB gzip) precisa carregar e registrar o service worker **antes** da primeira renderização, porque o desafio exige
mocks funcionando em produção; com a CPU 4× mais lenta do perfil mobile isso pesa em LCP/TBT. Não foi tentado: adiar o MSW por rota ou pré-renderizar o catálogo.
