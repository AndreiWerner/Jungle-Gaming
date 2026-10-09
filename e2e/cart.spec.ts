import { expect, test, type Page } from '@playwright/test'

// Seed: NFT 1 "Neon Dreams #001" 0.05 ETH, estoque 3; NFT 2 "Pixel Forest #002" e NFT 3 "Echo Chamber #003" têm estoque. Taxa de rede fixa: 0.0015 ETH.
// Cupons: WELCOME10 (10%), EXPIRED20 (expirado). Usuários ana/bruno, senha Senha123!.
const PASSWORD = 'Senha123!'
const N1 = 'Neon Dreams #001'
const nav = (page: Page) => page.getByRole('navigation', { name: 'Principal' })
const summary = (page: Page) => page.getByRole('region', { name: 'Resumo do pedido' })
const qty = (page: Page, name = N1) => page.getByRole('status', { name: `Quantidade de ${name}` })
const addButton = (page: Page) => page.getByRole('button', { name: 'Adicionar ao carrinho' })

async function login(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill(PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL('/')
}
async function addFromDetail(page: Page, id: string) {
  await page.goto(`/nft/${id}`)
  await expect(addButton(page)).toHaveAttribute('aria-disabled', 'false') // carrinho carregado
  await addButton(page).click()
  await expect(page.getByText('Adicionado ao carrinho')).toBeVisible()
}
const seedGuest = (page: Page, items: { nftId: string; quantity: number; unitPrice: string }[], scenario?: string) =>
  page.addInitScript(([c, s]) => {
    if (!localStorage.getItem('nftm:cart:guest')) localStorage.setItem('nftm:cart:guest', JSON.stringify({ items: c, couponCode: null }))
    if (s && !localStorage.getItem('nftm:scenario')) localStorage.setItem('nftm:scenario', JSON.stringify(s))
  }, [items, scenario] as const)
const ITEM1 = { nftId: '1', quantity: 1, unitPrice: '0.05' }

test('carrinho vazio mostra estado vazio com caminho para o catálogo', async ({ page }) => {
  await page.goto('/cart')
  await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Explorar NFTs' })).toBeVisible()
})

test('visitante adiciona um NFT, vê o contador e o item persiste após refresh', async ({ page }) => {
  await addFromDetail(page, '1')
  await expect(page.getByRole('link', { name: /Carrinho, 1 item/ })).toBeVisible()
  await page.goto('/cart')
  await expect(page.getByRole('heading', { name: N1 })).toBeVisible()
  await expect(qty(page)).toHaveText('1')
  await page.reload()
  await expect(page.getByRole('heading', { name: N1 })).toBeVisible()
  await expect(summary(page)).toContainText(/Subtotal\s*0\.05 ETH/)
  await expect(summary(page)).toContainText(/Taxa de rede\s*0\.0015 ETH/)
  await expect(summary(page)).toContainText(/Total\s*0\.0515 ETH/)
})

test('altera a quantidade (inclusive por teclado) e os totais acompanham', async ({ page }) => {
  await seedGuest(page, [ITEM1])
  await page.goto('/cart')
  const inc = page.getByRole('button', { name: `Aumentar quantidade de ${N1}` })
  await inc.focus()
  await page.keyboard.press('Enter')
  await expect(qty(page)).toHaveText('2')
  await expect(summary(page)).toContainText(/Subtotal\s*0\.1 ETH/)
  await expect(summary(page)).toContainText(/Total\s*0\.1015 ETH/)
  await page.getByRole('button', { name: `Diminuir quantidade de ${N1}` }).click()
  await expect(qty(page)).toHaveText('1')
})

test('remove um item e volta ao estado vazio', async ({ page }) => {
  await seedGuest(page, [ITEM1])
  await page.goto('/cart')
  await page.getByRole('button', { name: `Remover ${N1} do carrinho` }).click()
  await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
})

test('cupom válido aplica desconto, persiste e pode ser removido', async ({ page }) => {
  await seedGuest(page, [ITEM1])
  await page.goto('/cart')
  await page.getByLabel('Cupom de desconto').fill('welcome10')
  await page.getByRole('button', { name: 'Aplicar cupom' }).click()
  await expect(summary(page)).toContainText(/Desconto \(WELCOME10\)\s*−0\.005 ETH/)
  await expect(summary(page)).toContainText(/Total\s*0\.0465 ETH/)
  await page.reload()
  await expect(summary(page)).toContainText(/Desconto \(WELCOME10\)/)
  await page.getByRole('button', { name: 'Remover cupom WELCOME10' }).click()
  await expect(summary(page)).not.toContainText('Desconto')
  await expect(summary(page)).toContainText(/Total\s*0\.0515 ETH/)
})

test('cupom inválido e cupom expirado mostram erro associado ao campo', async ({ page }) => {
  await seedGuest(page, [ITEM1])
  await page.goto('/cart')
  const field = page.getByLabel('Cupom de desconto')
  await field.fill('NAOEXISTE')
  await page.getByRole('button', { name: 'Aplicar cupom' }).click()
  await expect(page.getByRole('alert')).toContainText('Cupom inválido.')
  await expect(field).toHaveAttribute('aria-invalid', 'true')
  await field.fill('EXPIRED20')
  await page.getByRole('button', { name: 'Aplicar cupom' }).click()
  await expect(page.getByRole('alert')).toContainText('Cupom expirado.')
  await expect(summary(page)).not.toContainText('Desconto')
})

test('detalhe respeita o estoque (máx. 3) e informa quando tudo já está no carrinho', async ({ page }) => {
  await page.goto('/nft/1')
  await expect(page.getByText('Máx. 3')).toBeVisible()
  const inc = page.getByRole('button', { name: `Aumentar quantidade de ${N1}` })
  await inc.click(); await inc.click()
  await expect(qty(page)).toHaveText('3')
  await expect(inc).toBeDisabled()
  await expect(addButton(page)).toHaveAttribute('aria-disabled', 'false')
  await addButton(page).click()
  await expect(page.getByText('Adicionado ao carrinho')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Você já tem todas as unidades disponíveis no carrinho.')).toBeVisible()
})

test('quantidade acima do estoque no carrinho é sinalizada e pode ser ajustada', async ({ page }) => {
  await seedGuest(page, [{ ...ITEM1, quantity: 99 }])
  await page.goto('/cart')
  await expect(page.getByText('Apenas 3 unidades disponíveis.')).toBeVisible()
  await page.getByRole('button', { name: 'Ajustar quantidade' }).click()
  await expect(qty(page)).toHaveText('3')
  await expect(page.getByText('Apenas 3 unidades disponíveis.')).toHaveCount(0)
})

test('mudança de preço é informada e só some depois de aceitar o novo preço', async ({ page }) => {
  await seedGuest(page, [ITEM1], 'price-changed')
  await page.goto('/cart')
  await expect(page.getByText('O preço mudou de 0.05 ETH para 0.06 ETH.')).toBeVisible()
  await expect(summary(page)).toContainText('Resolva os avisos')
  await page.getByRole('button', { name: 'Aceitar novo preço' }).click()
  await expect(page.getByText(/O preço mudou/)).toHaveCount(0)
  await expect(summary(page)).not.toContainText('Resolva os avisos')
})

test('NFT esgotado é sinalizado e exige remoção', async ({ page }) => {
  await seedGuest(page, [ITEM1], 'sold-out')
  await page.goto('/cart')
  await expect(page.getByText('Este NFT está esgotado ou indisponível. Remova-o para continuar.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Aceitar novo preço' })).toHaveCount(0)
})

test('exibe skeleton enquanto a cotação carrega', async ({ page }) => {
  await seedGuest(page, [ITEM1], 'latency=1500')
  await page.goto('/cart')
  await expect(page.getByRole('status', { name: 'Carregando resumo' })).toBeVisible()
  await expect(summary(page)).toContainText(/Total\s*0\.0515 ETH/)
})

test('falha na cotação mostra erro e recupera ao tentar novamente', async ({ page }) => {
  await seedGuest(page, [ITEM1], 'quote=500')
  await page.goto('/cart')
  await expect(page.getByRole('alert')).toContainText('Algo deu errado', { timeout: 15_000 })
  await page.evaluate(() => localStorage.setItem('nftm:scenario', JSON.stringify('latency=50')))
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page.getByRole('heading', { name: N1 })).toBeVisible()
})

test('ao entrar, o carrinho do visitante é preservado e some do armazenamento local', async ({ page }) => {
  await addFromDetail(page, '2')
  await login(page, 'ana@demo.com')
  await page.goto('/cart')
  await expect(page.getByRole('heading', { name: 'Pixel Forest #002' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Carrinho, 1 item/ })).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('nftm:cart:guest'))).toBeNull()
  // após logout o visitante recomeça vazio; ao entrar de novo o carrinho do servidor volta
  await nav(page).getByRole('button', { name: 'Sair' }).click()
  await expect(page.getByRole('link', { name: 'Carrinho', exact: true })).toBeVisible()
  await login(page, 'ana@demo.com')
  await expect(page.getByRole('link', { name: /Carrinho, 1 item/ })).toBeVisible()
})

test('mescla soma as quantidades do visitante com as do carrinho da conta', async ({ page }) => {
  await login(page, 'ana@demo.com')
  await addFromDetail(page, '2')
  await nav(page).getByRole('button', { name: 'Sair' }).click()
  await addFromDetail(page, '2') // como visitante
  await login(page, 'ana@demo.com')
  await page.goto('/cart')
  await expect(qty(page, 'Pixel Forest #002')).toHaveText('2')
})

test('carrinho da conta persiste após refresh e não vaza para outro usuário', async ({ page }) => {
  await login(page, 'ana@demo.com')
  await addFromDetail(page, '3')
  await page.goto('/cart')
  await page.reload()
  await expect(qty(page, 'Echo Chamber #003')).toHaveText('1')
  await nav(page).getByRole('button', { name: 'Sair' }).click()
  await login(page, 'bruno@demo.com')
  await page.goto('/cart')
  await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
})

test('falha ao gravar o carrinho reverte a quantidade otimista e avisa', async ({ page }) => {
  await login(page, 'ana@demo.com')
  await addFromDetail(page, '1')
  await page.goto('/cart')
  await expect(qty(page)).toHaveText('1')
  await page.evaluate(() => localStorage.setItem('nftm:scenario', JSON.stringify('cart.put=500;latency=1000')))
  await page.getByRole('button', { name: `Aumentar quantidade de ${N1}` }).click()
  await expect(qty(page)).toHaveText('2') // otimista
  await expect(qty(page)).toHaveText('1', { timeout: 10_000 }) // rollback
  await expect(page.getByRole('alert')).toContainText('Não foi possível atualizar o carrinho')
})

test('carrinho em 390px não tem overflow horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await seedGuest(page, [ITEM1])
  await page.goto('/cart')
  await expect(page.getByRole('heading', { name: N1 })).toBeVisible()
  await expect(page.getByRole('button', { name: `Remover ${N1} do carrinho` })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
