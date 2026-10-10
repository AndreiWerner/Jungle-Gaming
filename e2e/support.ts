import { expect, type Page } from '@playwright/test'

export const PASSWORD = 'Senha123!'
export const nav = (page: Page) => page.getByRole('navigation', { name: 'Principal' })
export const scenario = (page: Page, s: string) => page.evaluate((v) => localStorage.setItem('nftm:scenario', JSON.stringify(v)), s)
export const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)

export async function login(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill(PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL('/')
}

/** Cria um pedido pela API (carteira conectada + carrinho + cotação + POST /orders) e devolve o id. */
export function placeOrderViaApi(page: Page, nftId = '1', quantity = 1): Promise<string> {
  return page.evaluate(async ({ nftId, quantity }) => {
    const s = JSON.parse(localStorage.getItem('nftm:session')!)
    const h = { authorization: `Bearer ${s.token}`, 'content-type': 'application/json' }
    const call = async (path: string, init?: RequestInit) => {
      const r = await fetch(`/api${path}`, { ...init, headers: { ...h, ...(init?.headers as Record<string, string> | undefined) } })
      if (!r.ok) throw new Error(`${path} -> ${r.status}`)
      return r.json()
    }
    const wallets = await call('/wallets')
    await call(`/wallets/${wallets[0].id}/connect`, { method: 'POST' })
    const nft = await call(`/nfts/${nftId}`)
    const cart = { items: [{ nftId, quantity, unitPrice: nft.price }], couponCode: null }
    await call('/cart', { method: 'PUT', body: JSON.stringify(cart) })
    const quote = await call('/quote', { method: 'POST', body: JSON.stringify(cart) })
    const order = await call('/orders', { method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({ quoteId: quote.quoteId, walletId: wallets[0].id, collector: { name: 'Ana Souza', email: 'ana@demo.com' } }) })
    return order.id as string
  }, { nftId, quantity })
}
