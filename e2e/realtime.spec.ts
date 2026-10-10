import { expect, test, type Page } from '@playwright/test'
import { io, type Socket } from 'socket.io-client'
import { login, nav, PASSWORD, scenario } from './support'

// Servidor Socket.IO de desenvolvimento, iniciado junto com `npm run dev` (ver vite.config.ts).
const SOCKET = 'http://localhost:3001'
const N1 = 'Neon Dreams #001'

const connect = (auth: object) =>
  new Promise<Socket>((resolve, reject) => {
    const s = io(SOCKET, { auth, transports: ['websocket'], reconnection: false })
    s.once('connect', () => resolve(s))
    s.once('connect_error', reject)
  })
const ask = <T>(s: Socket, ev: string, payload: unknown) => new Promise<T>((r) => s.emit(ev, payload, r))
/** Cada navegador tem o próprio banco simulado (backendId); eventos só alcançam clientes do mesmo backendId. */
const tenantOf = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('nftm:backend-id')!) as string)
async function publish(tenant: string, event: object, userId?: string) {
  const s = await connect({ role: 'backend', backendId: tenant })
  const ack = await ask<{ ok: boolean; error?: string }>(s, 'publish', { event, userId })
  s.close()
  return ack
}
async function command(tenant: string, ev: string, payload: object = {}) {
  const s = await connect({ role: 'backend', backendId: tenant })
  const ack = await ask<{ rooms?: Record<string, number> }>(s, ev, payload)
  s.close()
  return ack
}
const rooms = async (tenant: string) => (await command(tenant, 'dev:stats')).rooms ?? {}
const nftEvent = (over: object) => ({ type: 'nft.updated', eventId: 'x', resource: 'nft:1', version: 100, at: new Date().toISOString(), nftId: '1', changes: {}, ...over })
const updateNft = (page: Page, body: object) => page.evaluate((b) => fetch('/api/__nft-update', { method: 'POST', body: JSON.stringify(b) }).then((r) => r.status), body)
const connected = (page: Page) => expect(page.getByText('Tempo real: conectado')).toBeVisible()

async function readyCheckout(page: Page) {
  await login(page, 'ana@demo.com')
  await page.goto('/nft/1')
  const add = page.getByRole('button', { name: 'Adicionar ao carrinho' })
  await expect(add).toHaveAttribute('aria-disabled', 'false')
  await add.click()
  await expect(page.getByText('Adicionado ao carrinho')).toBeVisible()
  await page.goto('/checkout')
  await page.getByRole('radio', { name: /MetaMask/ }).check()
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await expect(page.getByRole('button', { name: 'Desconectar carteira' })).toBeVisible()
}

test('o cliente conecta ao servidor Socket.IO e mostra o estado da conexão', async ({ page }) => {
  await page.goto('/')
  await connected(page)
})

test('nft.updated atualiza o catálogo em tempo real, sem recarregar', async ({ page }) => {
  await page.goto(`/?search=${encodeURIComponent(N1)}`)
  await connected(page)
  await expect(page.getByRole('region', { name: 'Catálogo' }).getByText('0.05 ETH')).toBeVisible()
  expect(await updateNft(page, { id: '1', price: '0.77' })).toBe(200)
  await expect(page.getByRole('region', { name: 'Catálogo' }).getByText('0.77 ETH')).toBeVisible()
})

test('nft.updated atualiza o detalhe (preço e estoque) em tempo real', async ({ page }) => {
  await page.goto('/nft/1')
  await connected(page)
  await updateNft(page, { id: '1', price: '0.77', available: 1 })
  await expect(page.getByText('0.77 ETH')).toBeVisible()
  await expect(page.getByText('1 unidade disponível')).toBeVisible()
})

test('nft.updated faz o carrinho avisar a mudança de preço', async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('nftm:cart:guest')) localStorage.setItem('nftm:cart:guest', JSON.stringify({ items: [{ nftId: '1', quantity: 1, unitPrice: '0.05' }], couponCode: null }))
  })
  await page.goto('/cart')
  await connected(page)
  await expect(page.getByRole('heading', { name: N1 })).toBeVisible()
  await updateNft(page, { id: '1', price: '0.77' })
  await expect(page.getByText('O preço mudou de 0.05 ETH para 0.77 ETH.')).toBeVisible()
})

test('eventos duplicados e antigos são descartados; o mais novo é aplicado', async ({ page }) => {
  await page.goto('/nft/1')
  await connected(page)
  // registra todo preço que já apareceu na tela, para provar que o descartado nunca foi exibido
  await page.evaluate(() => {
    const seen = new Set<string>()
    ;(window as unknown as { __prices: Set<string> }).__prices = seen
    const read = () => { const m = document.querySelector('[aria-label="Preço e disponibilidade"]')?.textContent?.match(/[\d.]+ ETH/); if (m) seen.add(m[0]) }
    read(); new MutationObserver(read).observe(document.body, { subtree: true, childList: true, characterData: true })
  })
  const tenant = await tenantOf(page)
  expect((await publish(tenant, nftEvent({ eventId: 'a1', version: 50, changes: { price: '7' } }))).ok).toBe(true)
  await expect(page.getByText('7 ETH', { exact: true })).toBeVisible()
  await publish(tenant, nftEvent({ eventId: 'a1', version: 60, changes: { price: '8' } })) // mesmo eventId: duplicado
  await publish(tenant, nftEvent({ eventId: 'a2', version: 10, changes: { price: '9' } })) // versão menor: antigo
  await publish(tenant, nftEvent({ eventId: 'a3', version: 51, changes: { price: '6' } })) // mais novo: aplica
  await expect(page.getByText('6 ETH', { exact: true })).toBeVisible()
  const seen = await page.evaluate(() => [...(window as unknown as { __prices: Set<string> }).__prices])
  expect(seen).toEqual(['0.05 ETH', '7 ETH', '6 ETH']) // 8 e 9 jamais apareceram
})

test('order.updated confirma o pedido em tempo real (antes do polling de segurança)', async ({ page }) => {
  await readyCheckout(page)
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page).toHaveURL(/\/order\/ord_/)
  await connected(page)
  // o servidor resolve em ~2,6 s; o polling de segurança só roda a cada 5 s com o socket conectado
  await expect(page.getByText('Pedido confirmado')).toBeVisible({ timeout: 4200 })
})

test('sem Socket.IO o polling assume e o pedido ainda é confirmado', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('nftm:socket-url', JSON.stringify('http://localhost:9')))
  await readyCheckout(page)
  await expect(page.getByText('Tempo real indisponível: atualizando periodicamente')).toBeVisible({ timeout: 10_000 })
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page).toHaveURL(/\/order\/ord_/)
  await expect(page.getByText('Pedido confirmado')).toBeVisible({ timeout: 15_000 })
})

test('após reconexão o app reconcilia via REST o que perdeu durante a queda', async ({ page }) => {
  await page.goto('/nft/1')
  await connected(page)
  const tenant = await tenantOf(page)
  await command(tenant, 'dev:block', { ms: 2500 }) // recusa reconexões por 2,5 s
  await command(tenant, 'dev:kick') // derruba os clientes deste banco
  await expect(page.getByText('Tempo real: reconectando…')).toBeVisible()
  await updateNft(page, { id: '1', price: '0.55' }) // evento emitido sem ninguém ouvindo: perdido
  await expect(page.getByText('Tempo real: conectado')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('0.55 ETH')).toBeVisible() // recuperado por REST na reconexão
})

test('sair e trocar de usuário encerra a assinatura anterior (sem vazamento)', async ({ page }) => {
  await login(page, 'ana@demo.com')
  await connected(page)
  const tenant = await tenantOf(page)
  await expect.poll(async () => (await rooms(tenant))['user:u_ana'] ?? 0).toBe(1)
  await nav(page).getByRole('button', { name: 'Sair' }).click()
  await expect.poll(async () => (await rooms(tenant))['user:u_ana'] ?? 0).toBe(0)
  await login(page, 'bruno@demo.com')
  await expect.poll(async () => (await rooms(tenant))['user:u_bruno'] ?? 0).toBe(1)
  expect((await rooms(tenant))['user:u_ana'] ?? 0).toBe(0)
})

test('servidor: order.updated só chega ao dono; nft.updated aos clientes do mesmo backend; nada vaza entre backends', async () => {
  const tenant = `t-${Math.random().toString(36).slice(2)}`
  const ana = await connect({ userId: 'u_ana', backendId: tenant })
  const bruno = await connect({ userId: 'u_bruno', backendId: tenant })
  const outro = await connect({ userId: 'u_ana', backendId: 'outro-backend' }) // mesmo usuário, OUTRO banco simulado
  const leaked: string[] = []
  outro.on('order.updated', (e) => leaked.push(e.eventId)); outro.on('nft.updated', (e) => leaked.push(e.eventId))
  const got = { ana: [] as string[], bruno: [] as string[] }
  ana.on('order.updated', (e) => got.ana.push(e.eventId)); bruno.on('order.updated', (e) => got.bruno.push(e.eventId))
  ana.on('nft.updated', (e) => got.ana.push(e.eventId)); bruno.on('nft.updated', (e) => got.bruno.push(e.eventId))
  const order = { type: 'order.updated', eventId: 'o1', resource: 'order:ord_1', version: 2, at: new Date().toISOString(), orderId: 'ord_1', status: 'confirmed' }
  await publish(tenant, order, 'u_ana')
  await publish(tenant, nftEvent({ eventId: 'n1', version: 2 }))
  await expect.poll(() => got.ana).toEqual(['o1', 'n1'])
  await expect.poll(() => got.bruno).toEqual(['n1']) // nunca recebe o pedido da Ana
  expect(leaked).toEqual([]) // nada vaza para clientes de outro backend simulado
  ana.close(); bruno.close(); outro.close()
})

test('servidor: rejeita eventos inválidos e publicação por clientes comuns', async () => {
  const t = `t-${Math.random().toString(36).slice(2)}`
  expect(await publish(t, { type: 'nft.updated', eventId: 'z', resource: 'nft:1', at: 'x' })).toEqual({ ok: false, error: 'invalid-event' }) // sem versão
  expect(await publish(t, { ...nftEvent({}), type: 'order.updated', eventId: 'z2' })).toEqual({ ok: false, error: 'missing-user' })
  const client = await connect({ userId: 'u_ana', backendId: t })
  expect(await ask(client, 'publish', { event: nftEvent({ eventId: 'z3' }) })).toEqual({ ok: false, error: 'forbidden' })
  client.close()
})

test('o login continua funcionando com o tempo real ativo', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill('ana@demo.com')
  await page.getByLabel('Senha').fill(PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL('/')
  await scenario(page, 'latency=50')
  await connected(page)
})
