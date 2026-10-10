import { expect, test } from '@playwright/test'
import { PASSWORD, login, nav, noOverflow, placeOrderViaApi, scenario } from './support'

test('visitante é levado ao login e volta ao perfil depois de entrar', async ({ page }) => {
  await page.goto('/profile')
  await expect(page).toHaveURL(/\/login\?redirect=%2Fprofile/)
  await page.getByLabel('E-mail').fill('ana@demo.com')
  await page.getByLabel('Senha').fill(PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/profile$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Perfil' })).toBeVisible()
})

test('mostra os dados do usuário autenticado (e-mail somente leitura)', async ({ page }) => {
  await login(page, 'ana@demo.com')
  await page.goto('/profile')
  await expect(page.getByLabel('Nome')).toHaveValue('Ana Souza')
  await expect(page.getByLabel('E-mail')).toHaveValue('ana@demo.com')
  await expect(page.getByLabel('E-mail')).toHaveAttribute('readonly', '')
})

test('edita o nome e ele persiste após recarregar', async ({ page }) => {
  await login(page, 'ana@demo.com')
  await page.goto('/profile')
  await page.getByLabel('Nome').fill('Ana Maria')
  await page.getByRole('button', { name: 'Salvar nome' }).click()
  await expect(page.getByText('Nome atualizado.')).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Nome')).toHaveValue('Ana Maria')
})

test('nome vazio é bloqueado com erro associado ao campo', async ({ page }) => {
  await login(page, 'ana@demo.com')
  await page.goto('/profile')
  await page.getByLabel('Nome').fill('')
  await page.getByRole('button', { name: 'Salvar nome' }).click()
  await expect(page.getByText('Informe seu nome.')).toBeVisible()
  await expect(page.getByLabel('Nome')).toHaveAttribute('aria-invalid', 'true')
})

test('sem pedidos mostra o estado vazio', async ({ page }) => {
  await login(page, 'ana@demo.com')
  await page.goto('/profile')
  await expect(page.getByText('Você ainda não fez pedidos')).toBeVisible()
})

test('histórico lista o pedido, atualiza o status e leva ao detalhe', async ({ page }) => {
  await login(page, 'ana@demo.com')
  const id = await placeOrderViaApi(page)
  await page.goto('/profile')
  const item = page.getByRole('list', { name: 'Histórico de pedidos' }).getByRole('listitem').first()
  await expect(item).toContainText(id)
  await expect(item).toContainText('1× Neon Dreams #001')
  await expect(item).toContainText('0.0515 ETH')
  await expect(item).toContainText('Confirmado', { timeout: 15_000 }) // pendente -> confirmado sem recarregar
  await item.getByRole('link').click()
  await expect(page).toHaveURL(new RegExp(`/order/${id}$`))
})

test('pedido criado no checkout aparece no histórico sem recarregar a página', async ({ page }) => {
  // sem tempo real: só a invalidação feita ao criar o pedido pode atualizar a lista em cache
  await page.addInitScript(() => localStorage.setItem('nftm:socket-url', JSON.stringify('http://localhost:9')))
  await login(page, 'ana@demo.com')
  // abre o perfil ANTES: a lista vazia entra no cache; depois compra navegando só por links (sem recarregar)
  await nav(page).getByRole('link', { name: 'Perfil' }).click()
  await expect(page.getByText('Você ainda não fez pedidos')).toBeVisible()
  await nav(page).getByRole('link', { name: 'Explorar' }).click()
  await page.getByRole('region', { name: 'Catálogo' }).getByRole('link').first().click()
  const add = page.getByRole('button', { name: 'Adicionar ao carrinho' })
  await expect(add).toHaveAttribute('aria-disabled', 'false')
  await add.click()
  await page.getByRole('link', { name: 'Ver carrinho' }).click()
  await page.getByRole('link', { name: 'Finalizar compra' }).click()
  await page.getByRole('radio', { name: /MetaMask/ }).check()
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await expect(page.getByRole('button', { name: 'Desconectar carteira' })).toBeVisible()
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page).toHaveURL(/\/order\/ord_/)
  await nav(page).getByRole('link', { name: 'Perfil' }).click()
  await expect(page.getByRole('list', { name: 'Histórico de pedidos' }).getByRole('listitem')).toHaveCount(1)
})

test('pedidos ficam isolados por usuário', async ({ page }) => {
  await login(page, 'ana@demo.com')
  const id = await placeOrderViaApi(page)
  await page.goto('/profile')
  await expect(page.getByRole('list', { name: 'Histórico de pedidos' })).toContainText(id)
  await nav(page).getByRole('button', { name: 'Sair' }).click()
  await expect(page).toHaveURL(/\/login\?redirect=%2Fprofile/)
  await page.getByLabel('E-mail').fill('bruno@demo.com')
  await page.getByLabel('Senha').fill(PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/profile$/)
  await expect(page.getByLabel('Nome')).toHaveValue('Bruno Lima')
  await expect(page.getByText('Você ainda não fez pedidos')).toBeVisible()
  await expect(page.getByText(id)).toHaveCount(0)
})

test('erro ao listar pedidos mostra alerta e recupera ao tentar novamente', async ({ page }) => {
  await login(page, 'ana@demo.com')
  await scenario(page, 'orders.list=500')
  await page.goto('/profile')
  await expect(page.getByRole('alert')).toContainText('Algo deu errado', { timeout: 15_000 })
  await scenario(page, 'latency=50')
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page.getByText('Você ainda não fez pedidos')).toBeVisible()
})

test('exibe skeleton acessível enquanto carrega os pedidos', async ({ page }) => {
  await login(page, 'ana@demo.com')
  await scenario(page, 'latency=1500')
  await page.goto('/profile')
  await expect(page.getByRole('status', { name: 'Carregando pedidos' })).toBeVisible()
  await expect(page.getByText('Você ainda não fez pedidos')).toBeVisible()
})

test('perfil em 390px sem overflow horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await login(page, 'ana@demo.com')
  await placeOrderViaApi(page)
  await page.goto('/profile')
  await expect(page.getByRole('list', { name: 'Histórico de pedidos' })).toBeVisible()
  expect(await noOverflow(page)).toBe(true)
})
