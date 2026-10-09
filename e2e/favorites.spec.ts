import { expect, test, type Page } from '@playwright/test'

// Seed: ana tem o NFT 2 favoritado; bruno não tem nenhum. Senha de ambos: Senha123!
const PASSWORD = 'Senha123!'
const nav = (page: Page) => page.getByRole('navigation', { name: 'Principal' })
const add = (page: Page) => page.getByRole('button', { name: /Adicionar aos favoritos/ })
const remove = (page: Page) => page.getByRole('button', { name: /Remover dos favoritos/ })

async function login(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill(PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL('/')
}
// o botão só fica aria-disabled="false" quando a lista carregou e não há mutação pendente
const settled = (button: ReturnType<Page['getByRole']>) => expect(button).toHaveAttribute('aria-disabled', 'false')

test('adiciona um NFT aos favoritos pelo catálogo e reflete no detalhe', async ({ page }) => {
  await login(page, 'ana@demo.com')
  const catalog = page.getByRole('region', { name: 'Catálogo' })
  const first = catalog.getByRole('button', { name: /Adicionar aos favoritos/ }).first()
  await settled(first)
  await first.click()
  await expect(catalog.getByRole('button', { name: /Remover dos favoritos/ })).toHaveCount(1)
  await expect(catalog.getByRole('button', { name: /Remover dos favoritos/ })).toHaveAttribute('aria-disabled', 'false')
  await page.goto('/nft/24') // primeiro card da ordenação padrão
  await expect(remove(page)).toBeVisible()
})

test('remove um favorito', async ({ page }) => {
  await login(page, 'ana@demo.com')
  await page.goto('/nft/2')
  const button = remove(page)
  await expect(button).toBeVisible()
  await settled(button)
  await button.click()
  await expect(add(page)).toBeVisible()
  await settled(add(page))
  await page.reload()
  await expect(add(page)).toBeVisible()
})

test('o favorito persiste após recarregar a página', async ({ page }) => {
  await login(page, 'ana@demo.com')
  await page.goto('/nft/1')
  await settled(add(page))
  await add(page).click()
  await expect(remove(page)).toBeVisible()
  await settled(remove(page))
  await page.reload()
  await expect(remove(page)).toBeVisible()
})

test('favoritos de usuários diferentes ficam isolados', async ({ page }) => {
  await login(page, 'ana@demo.com')
  await page.goto('/nft/2')
  await expect(remove(page)).toBeVisible()
  await nav(page).getByRole('button', { name: 'Sair' }).click()

  await login(page, 'bruno@demo.com')
  await page.goto('/nft/2')
  await expect(add(page)).toBeVisible() // bruno não herda o favorito da ana
  await settled(add(page))
  await add(page).click()
  await expect(remove(page)).toBeVisible()
  await settled(remove(page))
  await nav(page).getByRole('button', { name: 'Sair' }).click()

  await login(page, 'ana@demo.com')
  await page.goto('/nft/2')
  await expect(remove(page)).toBeVisible()
  await page.goto('/nft/1')
  await expect(add(page)).toBeVisible()
})

test('reverte o estado otimista e avisa quando a API falha', async ({ page }) => {
  await login(page, 'ana@demo.com')
  await page.goto('/nft/1')
  await settled(add(page))
  await page.evaluate(() => localStorage.setItem('nftm:scenario', JSON.stringify('favorites.add=500;latency=1000')))
  await add(page).click()
  await expect(remove(page)).toBeVisible() // atualização otimista imediata
  await expect(add(page)).toBeVisible({ timeout: 10_000 }) // rollback após o 500
  await expect(page.getByRole('alert')).toContainText('Não foi possível atualizar seus favoritos')
})

test('visitante é levado ao login e volta ao NFT depois de autenticar', async ({ page }) => {
  const favoriteCalls: string[] = []
  page.on('request', (r) => { if (r.url().includes('/api/favorites')) favoriteCalls.push(r.method()) })
  await page.goto('/nft/1')
  await expect(add(page)).toBeVisible()
  await add(page).click()
  await expect(page).toHaveURL(/\/login\?redirect=%2Fnft%2F1/)
  expect(favoriteCalls).toEqual([]) // nenhuma chamada privada sem sessão
  await page.getByLabel('E-mail').fill('ana@demo.com')
  await page.getByLabel('Senha').fill(PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/nft\/1$/)
})

test('favoritar funciona em 390px sem overflow horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await login(page, 'ana@demo.com')
  await page.goto('/nft/1')
  await settled(add(page))
  await add(page).click()
  await expect(remove(page)).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
