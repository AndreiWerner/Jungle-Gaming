import { expect, test, type Page } from '@playwright/test'

// Seed: NFT 1 "Neon Dreams #001" 0.05 ETH (estoque 3); ana tem MetaMask/Ethereum desconectada. Taxa 0.0015. Senha: Senha123!
const PASSWORD = 'Senha123!'
const N1 = 'Neon Dreams #001'
const nav = (page: Page) => page.getByRole('navigation', { name: 'Principal' })
const confirmButton = (page: Page) => page.getByRole('button', { name: 'Confirmar compra' })
const scenario = (page: Page, s: string) => page.evaluate((v) => localStorage.setItem('nftm:scenario', JSON.stringify(v)), s)
const apiCount = (page: Page) => page.evaluate(async () => {
  const s = JSON.parse(localStorage.getItem('nftm:session')!)
  const r = await fetch('/api/orders', { headers: { authorization: `Bearer ${s.token}` } })
  return ((await r.json()) as unknown[]).length
})

async function login(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill(PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL('/')
}
async function addFromDetail(page: Page, id: string) {
  await page.goto(`/nft/${id}`)
  const add = page.getByRole('button', { name: 'Adicionar ao carrinho' })
  await expect(add).toHaveAttribute('aria-disabled', 'false')
  await add.click()
  await expect(page.getByText('Adicionado ao carrinho')).toBeVisible()
}
/** Conta ana, 1× NFT 1 no carrinho, checkout aberto com a carteira MetaMask conectada. */
async function readyCheckout(page: Page) {
  await login(page, 'ana@demo.com')
  await addFromDetail(page, '1')
  await page.goto('/checkout')
  await expect(page.getByRole('heading', { level: 1, name: 'Checkout' })).toBeVisible()
  await page.getByRole('radio', { name: /MetaMask/ }).check()
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await expect(page.getByRole('button', { name: 'Desconectar carteira' })).toBeVisible()
}

test('visitante finaliza a compra: vai ao login e volta ao checkout com o carrinho preservado', async ({ page }) => {
  await addFromDetail(page, '1')
  await page.goto('/cart')
  await page.getByRole('link', { name: 'Finalizar compra' }).click()
  await expect(page).toHaveURL(/\/login\?redirect=%2Fcheckout/)
  await page.getByLabel('E-mail').fill('ana@demo.com')
  await page.getByLabel('Senha').fill(PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/checkout$/)
  await expect(page.getByText(N1)).toBeVisible()
})

test('carrinho vazio no checkout mostra estado vazio', async ({ page }) => {
  await login(page, 'ana@demo.com')
  await page.goto('/checkout')
  await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
})

test('sem carteira conectada a compra é bloqueada e explica o motivo', async ({ page }) => {
  await login(page, 'ana@demo.com')
  await addFromDetail(page, '1')
  await page.goto('/checkout')
  await expect(confirmButton(page)).toHaveAttribute('aria-disabled', 'true')
  // aria-disabled mantém o botão clicável para o usuário (é assim que o motivo é explicado);
  // o Playwright o trata como desabilitado, então o clique precisa ser forçado
  await confirmButton(page).click({ force: true })
  await expect(page.getByText('Selecione uma carteira.')).toBeVisible()
  await page.getByRole('radio', { name: /MetaMask/ }).check()
  await confirmButton(page).click({ force: true })
  await expect(page.getByText('Conecte a carteira selecionada.')).toBeVisible()
  await expect(page).toHaveURL(/\/checkout$/)
})

test('recusa na conexão da carteira mostra erro e permite tentar de novo', async ({ page }) => {
  await login(page, 'ana@demo.com')
  await addFromDetail(page, '1')
  await page.goto('/checkout')
  await scenario(page, 'wallet-refuse')
  await page.getByRole('radio', { name: /MetaMask/ }).check()
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await expect(page.getByRole('alert')).toContainText('Conexão recusada pelo usuário na carteira.')
  await scenario(page, 'latency=50')
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await expect(page.getByRole('button', { name: 'Desconectar carteira' })).toBeVisible()
})

test('compra confirmada: recibo completo, estoque baixado e carrinho esvaziado', async ({ page }) => {
  await readyCheckout(page)
  await expect(page.getByText(/Total\s*0\.0515 ETH/)).toBeVisible()
  await confirmButton(page).click()
  await expect(page).toHaveURL(/\/order\/ord_/)
  await expect(page.getByText('Pedido confirmado')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText(N1)).toBeVisible()
  await expect(page.getByText(/Subtotal\s*0\.05 ETH/)).toBeVisible()
  await expect(page.getByText(/Taxa de rede\s*0\.0015 ETH/)).toBeVisible()
  await expect(page.getByText(/Total\s*0\.0515 ETH/)).toBeVisible()
  await expect(page.getByText(/0x[0-9a-f]{64}/)).toBeVisible()
  await expect(page.getByText('Ethereum', { exact: true })).toBeVisible()
  await page.goto('/cart')
  await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
  await page.goto('/nft/1')
  await expect(page.getByText('2 unidades disponíveis')).toBeVisible()
})

test('pagamento recusado: pedido rejeitado e carrinho preservado', async ({ page }) => {
  await readyCheckout(page)
  await scenario(page, 'payment-rejected')
  await confirmButton(page).click()
  await expect(page).toHaveURL(/\/order\/ord_/)
  await expect(page.getByText('Pagamento recusado', { exact: true })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText(/Seu carrinho foi preservado/)).toBeVisible()
  await page.getByRole('link', { name: 'Voltar ao carrinho' }).click()
  await expect(page.getByRole('heading', { name: N1 })).toBeVisible()
})

test('clique repetido não cria dois pedidos', async ({ page }) => {
  await readyCheckout(page)
  await confirmButton(page).dblclick()
  await expect(page).toHaveURL(/\/order\/ord_/)
  expect(await apiCount(page)).toBe(1)
})

test('timeout na criação: a nova tentativa usa a mesma chave e não duplica o pedido', async ({ page }) => {
  test.setTimeout(60_000)
  await readyCheckout(page)
  await scenario(page, 'order-timeout')
  await confirmButton(page).click()
  await expect(page.getByRole('alert')).toContainText('A confirmação demorou', { timeout: 20_000 })
  await expect(page).toHaveURL(/\/checkout$/)
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page).toHaveURL(/\/order\/ord_/)
  expect(await apiCount(page)).toBe(1)
})

test('preço mudou entre a revisão e a confirmação: bloqueia, informa e exige nova confirmação', async ({ page }) => {
  await readyCheckout(page)
  await scenario(page, 'price-changed')
  await confirmButton(page).click()
  await expect(page.getByRole('alert').filter({ hasText: 'mudaram' })).toBeVisible()
  await expect(page).toHaveURL(/\/checkout$/)
  expect(await apiCount(page)).toBe(0) // nenhum pedido foi criado
  await expect(page.getByText('O preço mudou de 0.05 ETH para 0.06 ETH.')).toBeVisible()
  await page.getByRole('button', { name: 'Aceitar novo preço' }).click()
  await expect(page.getByText(/O preço mudou/)).toHaveCount(0)
  await confirmButton(page).click()
  await expect(page).toHaveURL(/\/order\/ord_/)
  await expect(page.getByText(/Total\s*0\.0615 ETH/)).toBeVisible()
})

test('NFT esgotado antes de confirmar: bloqueia a compra e não cria pedido', async ({ page }) => {
  await readyCheckout(page)
  await scenario(page, 'sold-out')
  await confirmButton(page).click()
  await expect(page.getByRole('alert').filter({ hasText: 'mudaram' })).toBeVisible()
  await expect(page.getByText(/esgotado ou indisponível/)).toBeVisible()
  await expect(page).toHaveURL(/\/checkout$/)
  expect(await apiCount(page)).toBe(0)
})

test('o recibo é um snapshot: mudanças posteriores no catálogo não o alteram', async ({ page }) => {
  await readyCheckout(page)
  await confirmButton(page).click()
  await expect(page.getByText('Pedido confirmado')).toBeVisible({ timeout: 15_000 })
  await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('nftm:mockdb')!)
    db.nfts[0].price = '9'; db.nfts[0].name = 'NOME ALTERADO'
    localStorage.setItem('nftm:mockdb', JSON.stringify(db))
  })
  await page.reload()
  await expect(page.getByText(N1)).toBeVisible()
  await expect(page.getByText(/Subtotal\s*0\.05 ETH/)).toBeVisible()
  await expect(page.getByText('NOME ALTERADO')).toHaveCount(0)
})

test('confirmação remove do carrinho somente o que foi comprado', async ({ page }) => {
  await readyCheckout(page)
  await confirmButton(page).click()
  await expect(page).toHaveURL(/\/order\/ord_/)
  // enquanto o pedido está pendente, o usuário adiciona outro NFT (não comprado) ao carrinho
  await page.evaluate(async () => {
    const s = JSON.parse(localStorage.getItem('nftm:session')!)
    await fetch('/api/cart', { method: 'PUT', headers: { authorization: `Bearer ${s.token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ items: [{ nftId: '1', quantity: 1, unitPrice: '0.05' }, { nftId: '3', quantity: 1, unitPrice: '0.3' }], couponCode: null }) })
  })
  await expect(page.getByText('Pedido confirmado')).toBeVisible({ timeout: 15_000 })
  const ids = await page.evaluate(async () => {
    const s = JSON.parse(localStorage.getItem('nftm:session')!)
    const r = await fetch('/api/cart', { headers: { authorization: `Bearer ${s.token}` } })
    return ((await r.json()) as { items: { nftId: string }[] }).items.map((i) => i.nftId)
  })
  expect(ids).toEqual(['3'])
})

test('pedido de outro usuário é negado e pedido inexistente mostra não encontrado', async ({ page }) => {
  await readyCheckout(page)
  await confirmButton(page).click()
  await expect(page).toHaveURL(/\/order\/ord_/)
  const orderUrl = page.url()
  await page.goto('/order/ord_nao_existe')
  await expect(page.getByText('Pedido não encontrado')).toBeVisible()
  await page.goto(orderUrl)
  await nav(page).getByRole('button', { name: 'Sair' }).click()
  await expect(page).toHaveURL(/\/login\?redirect=/)
  await page.getByLabel('E-mail').fill('bruno@demo.com')
  await page.getByLabel('Senha').fill(PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(orderUrl)
  await expect(page.getByText('Você não tem acesso a este pedido')).toBeVisible()
})

test('checkout em 390px não tem overflow horizontal e a compra é possível', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await readyCheckout(page)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await expect(confirmButton(page)).toBeVisible()
  await confirmButton(page).click()
  await expect(page).toHaveURL(/\/order\/ord_/)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
