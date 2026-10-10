import { expect, test } from '@playwright/test'
import { login, noOverflow, placeOrderViaApi } from './support'

// Rotas obrigatórias do desafio em 390 / 768 / 1440 px: sem overflow horizontal e com o conteúdo principal visível.
for (const width of [390, 768, 1440]) {
  test(`rotas públicas em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    const routes: [string, string][] = [['/', 'Explorar NFTs'], ['/nft/1', 'Neon Dreams #001'], ['/cart', 'Carrinho'], ['/login', 'Entrar'], ['/register', 'Criar conta']]
    for (const [path, heading] of routes) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
      expect(await noOverflow(page), `${path} @${width}px`).toBe(true)
    }
    if (width < 768) {
      await page.getByRole('button', { name: 'Abrir menu' }).click()
      await expect(page.getByRole('navigation', { name: 'Principal (mobile)' }).getByRole('link', { name: 'Explorar' })).toBeVisible()
    }
  })

  test(`rotas privadas em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await login(page, 'ana@demo.com')
    const orderId = await placeOrderViaApi(page, '1')
    // item ainda não comprado, para que /cart e /checkout tenham conteúdo
    await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('nftm:session')!)
      return fetch('/api/cart', { method: 'PUT', headers: { authorization: `Bearer ${s.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ items: [{ nftId: '2', quantity: 1, unitPrice: '0.125' }], couponCode: null }) })
    })
    const routes: [string, string][] = [['/cart', 'Carrinho'], ['/checkout', 'Checkout'], [`/order/${orderId}`, 'Pedido'], ['/profile', 'Perfil'], ['/wallets', 'Carteiras']]
    for (const [path, heading] of routes) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
      expect(await noOverflow(page), `${path} @${width}px`).toBe(true)
    }
  })
}
