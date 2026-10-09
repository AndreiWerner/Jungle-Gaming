import { expect, test, type Page } from '@playwright/test'

// Seed (mocks/seed.ts), NFT 1: "Neon Dreams #001", coleção Neon Dreams, edição #1/50, art, 0.05 ETH, 3 disponíveis.
// NFT 9 está esgotado (available = 0).
const useScenario = (page: Page, scenario: string) =>
  page.addInitScript((s) => localStorage.setItem('nftm:scenario', JSON.stringify(s)), scenario)

test('abre o detalhe a partir do catálogo e volta preservando os filtros', async ({ page }) => {
  await page.goto('/?category=art')
  await page.getByRole('region', { name: 'Catálogo' }).getByRole('link').first().click()
  await expect(page).toHaveURL(/\/nft\/\d+$/)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.getByRole('link', { name: 'Voltar ao catálogo' }).click()
  await expect(page).toHaveURL(/category=art/)
})

test('acesso direto à URL exibe os dados e o título da página', async ({ page }) => {
  await page.goto('/nft/1')
  await expect(page.getByRole('heading', { level: 1, name: 'Neon Dreams #001' })).toBeVisible()
  await expect(page).toHaveTitle(/Neon Dreams #001/)
})

test('dados exibidos correspondem à resposta mockada', async ({ page }) => {
  await page.goto('/nft/1')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  // a chamada passa pelo service worker do MSW, como a da aplicação
  const api = await page.evaluate(() => fetch('/api/nfts/1').then((r) => r.json()))
  expect(api.name).toBe('Neon Dreams #001')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(api.name)
  await expect(page.getByText(`${api.collection} · Edição ${api.edition}`)).toBeVisible()
  await expect(page.getByText(api.description)).toBeVisible()
  await expect(page.getByText('0.05 ETH')).toBeVisible()
  await expect(page.getByText(`${api.available} unidades disponíveis`)).toBeVisible()
})

test('galeria troca a imagem principal por teclado', async ({ page }) => {
  await page.goto('/nft/1')
  const main = page.getByRole('img', { name: /imagem 1 de 3/ })
  await expect(main).toBeVisible()
  const second = page.getByRole('button', { name: 'Mostrar imagem 2 de 3' })
  await second.focus()
  await page.keyboard.press('Enter')
  await expect(second).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('img', { name: /imagem 2 de 3/ })).toBeVisible()
})

test('NFT esgotado informa indisponibilidade', async ({ page }) => {
  await page.goto('/nft/9')
  await expect(page.getByText(/Esgotado/)).toBeVisible()
})

test('exibe estado de carregamento acessível enquanto busca', async ({ page }) => {
  await useScenario(page, 'latency=1500')
  await page.goto('/nft/1')
  await expect(page.getByRole('status', { name: 'Carregando NFT' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name: 'Neon Dreams #001' })).toBeVisible()
  await expect(page.getByRole('status', { name: 'Carregando NFT' })).toHaveCount(0)
})

test('erro de API mostra alerta e permite tentar novamente', async ({ page }) => {
  await useScenario(page, 'nfts.detail=500')
  await page.goto('/nft/1')
  await expect(page.getByRole('alert')).toContainText('Algo deu errado', { timeout: 15_000 })
  await page.evaluate(() => localStorage.setItem('nftm:scenario', JSON.stringify('latency=50')))
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Neon Dreams #001' })).toBeVisible()
})

test('NFT inexistente mostra "não encontrado" com caminho de volta', async ({ page }) => {
  await page.goto('/nft/9999')
  await expect(page.getByText('NFT não encontrado')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Voltar ao catálogo' })).toBeVisible()
})

test('layout em 390px não tem overflow horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/nft/1')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await expect(page.getByRole('button', { name: 'Mostrar imagem 3 de 3' })).toBeVisible()
})
