import { expect, test, type Page } from '@playwright/test'

// Cada teste roda em um contexto novo (localStorage vazio) => banco MSW isolado e com seed.
const catalog = (page: Page) => page.getByRole('region', { name: 'Catálogo' })
const cards = (page: Page) => catalog(page).getByRole('listitem')

test('exibe catálogo, destaques e total de resultados', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Em destaque' })).toBeVisible()
  await expect(cards(page)).toHaveCount(8)
  await expect(catalog(page).getByText('24 resultados')).toBeVisible()
})

test('busca atualiza a URL, reseta a página e sobrevive ao refresh', async ({ page }) => {
  await page.goto('/?page=2')
  await page.getByRole('searchbox', { name: 'Buscar NFTs' }).fill('Pixel')
  await expect(page).toHaveURL(/search=Pixel/)
  await expect(page).not.toHaveURL(/page=/)
  await page.reload()
  await expect(page.getByRole('searchbox', { name: 'Buscar NFTs' })).toHaveValue('Pixel')
  for (const c of await cards(page).all()) await expect(c).toContainText('Pixel Forest')
})

test('filtros combinados e limpar filtros', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Categoria').selectOption('art')
  await page.getByLabel('Coleção').selectOption('Neon Dreams')
  await expect(page).toHaveURL(/category=art/)
  await expect(page).toHaveURL(/collection=Neon/)
  await expect(cards(page).first()).toContainText('Neon Dreams')
  await page.getByRole('button', { name: 'Limpar filtros' }).click()
  await expect(page).not.toHaveURL(/category=/)
  await expect(catalog(page).getByText('24 resultados')).toBeVisible()
})

test('ordenação por menor preço', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Ordenar por').selectOption('price-asc')
  await expect(page).toHaveURL(/sort=price-asc/)
  await expect(cards(page).first()).toContainText('0.05 ETH')
})

test('paginação, histórico do navegador e página inválida', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Página 2' }).click()
  await expect(page).toHaveURL(/page=2/)
  await page.reload()
  await expect(page).toHaveURL(/page=2/)
  await page.goBack()
  await expect(page).not.toHaveURL(/page=2/)
  await page.goForward()
  await expect(page).toHaveURL(/page=2/)
  await page.goto('/?page=99')
  await expect(page).toHaveURL(/page=3/)
})

test('busca sem resultados mostra estado vazio', async ({ page }) => {
  await page.goto('/?search=zzzz')
  await expect(page.getByText('Nenhum NFT encontrado')).toBeVisible()
})

test('falha da API mostra erro e recupera ao tentar novamente', async ({ page }) => {
  await page.addInitScript(() => { if (!localStorage.getItem('nftm:scenario')) localStorage.setItem('nftm:scenario', JSON.stringify('nfts.list=500')) })
  await page.goto('/')
  await expect(catalog(page).getByRole('alert')).toContainText('Algo deu errado')
  await page.evaluate(() => localStorage.setItem('nftm:scenario', JSON.stringify('latency=50')))
  await catalog(page).getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(cards(page)).toHaveCount(8)
})

test('mobile 390px sem overflow horizontal e filtros acessíveis', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(cards(page)).toHaveCount(8)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.getByRole('button', { name: /Filtros/ }).click()
  await expect(page.getByLabel('Categoria')).toBeVisible()
})
