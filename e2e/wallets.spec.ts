import { expect, test, type Page } from '@playwright/test'

// Seed: ana tem MetaMask/Ethereum (0x71C7…976F), desconectada; bruno tem Coinbase Wallet/Polygon. Senha: Senha123!
const PASSWORD = 'Senha123!'
const nav = (page: Page) => page.getByRole('navigation', { name: 'Principal' })
const card = (page: Page, text: string) => page.getByRole('listitem').filter({ hasText: text })
const scenario = (page: Page, s: string) => page.evaluate((v) => localStorage.setItem('nftm:scenario', JSON.stringify(v)), s)

async function login(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill(PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL('/')
}
async function openWallets(page: Page, email = 'ana@demo.com') {
  await login(page, email)
  await page.goto('/wallets')
  await expect(page.getByRole('heading', { level: 1, name: 'Carteiras' })).toBeVisible()
}

test('rota privada: visitante vai ao login e volta para /wallets depois de entrar', async ({ page }) => {
  await page.goto('/wallets')
  await expect(page).toHaveURL(/\/login\?redirect=%2Fwallets/)
  await page.getByLabel('E-mail').fill('ana@demo.com')
  await page.getByLabel('Senha').fill(PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/wallets$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Carteiras' })).toBeVisible()
})

test('lista as carteiras da conta com provedor, rede, endereço abreviado e estado', async ({ page }) => {
  await openWallets(page)
  const c = card(page, 'MetaMask')
  await expect(c).toContainText('Ethereum')
  await expect(c).toContainText('0x71C7…976F')
  await expect(c.getByText('Desconectada', { exact: true })).toBeVisible()
})

test('conecta (por teclado), persiste após refresh e desconecta', async ({ page }) => {
  await openWallets(page)
  const c = card(page, 'MetaMask')
  const connect = c.getByRole('button', { name: /^Conectar / })
  await connect.focus()
  await page.keyboard.press('Enter')
  await expect(c.getByText('Conectada', { exact: true })).toBeVisible()
  await page.reload()
  await expect(card(page, 'MetaMask').getByText('Conectada', { exact: true })).toBeVisible()
  await card(page, 'MetaMask').getByRole('button', { name: /^Desconectar / }).click()
  await expect(card(page, 'MetaMask').getByText('Desconectada', { exact: true })).toBeVisible()
})

test('recusa na carteira mostra erro, não conecta e permite tentar de novo', async ({ page }) => {
  await openWallets(page)
  await scenario(page, 'wallet-refuse')
  const c = card(page, 'MetaMask')
  await c.getByRole('button', { name: /^Conectar / }).click()
  await expect(c.getByRole('alert')).toContainText('Conexão recusada pelo usuário na carteira.')
  await expect(c.getByText('Desconectada', { exact: true })).toBeVisible()
  await scenario(page, 'latency=50')
  await c.getByRole('button', { name: /^Conectar / }).click()
  await expect(c.getByText('Conectada', { exact: true })).toBeVisible()
  await expect(c.getByRole('alert')).toHaveCount(0)
})

test('falha de rede ao conectar mostra erro e mantém a carteira desconectada', async ({ page }) => {
  await openWallets(page)
  await scenario(page, 'wallets.connect=network')
  const c = card(page, 'MetaMask')
  await c.getByRole('button', { name: /^Conectar / }).click()
  await expect(c.getByRole('alert')).toContainText('Sem conexão com o servidor.')
  await expect(c.getByText('Desconectada', { exact: true })).toBeVisible()
})

test('mostra estado de conexão em andamento antes de confirmar', async ({ page }) => {
  await openWallets(page)
  await scenario(page, 'latency=1200')
  const c = card(page, 'MetaMask')
  await c.getByRole('button', { name: /^Conectar / }).click()
  await expect(c.getByText('Conectando…')).toBeVisible()
  await expect(c.getByText('Conectada', { exact: true })).toBeVisible()
})

test('adiciona uma carteira escolhendo provedor e rede, e ela persiste', async ({ page }) => {
  await openWallets(page)
  await page.getByLabel('Carteira', { exact: true }).selectOption('coinbase')
  await page.getByLabel('Rede', { exact: true }).selectOption('arbitrum')
  await page.getByRole('button', { name: 'Adicionar carteira' }).click()
  await expect(page.getByText('Carteira adicionada. Conecte-a para usá-la.')).toBeVisible()
  const c = card(page, 'Coinbase Wallet')
  await expect(c).toContainText('Arbitrum')
  await expect(c.getByText('Desconectada', { exact: true })).toBeVisible()
  await page.reload()
  await expect(card(page, 'Coinbase Wallet')).toContainText('Arbitrum')
})

test('remover pede confirmação em diálogo; cancelar mantém e confirmar leva ao estado vazio', async ({ page }) => {
  await openWallets(page)
  await card(page, 'MetaMask').getByRole('button', { name: /^Remover / }).click()
  const dialog = page.getByRole('dialog', { name: 'Remover carteira?' })
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(card(page, 'MetaMask')).toBeVisible()
  await card(page, 'MetaMask').getByRole('button', { name: /^Remover / }).click()
  await dialog.getByRole('button', { name: 'Remover carteira' }).click()
  await expect(page.getByText('Nenhuma carteira cadastrada')).toBeVisible()
})

test('carteiras ficam isoladas por usuário', async ({ page }) => {
  await openWallets(page, 'ana@demo.com')
  await card(page, 'MetaMask').getByRole('button', { name: /^Conectar / }).click()
  await expect(card(page, 'MetaMask').getByText('Conectada', { exact: true })).toBeVisible()
  await nav(page).getByRole('button', { name: 'Sair' }).click()
  await expect(page).toHaveURL(/\/login/) // sair de uma página privada leva ao login
  await login(page, 'bruno@demo.com')
  await page.goto('/wallets')
  await expect(card(page, 'Coinbase Wallet')).toContainText('Polygon')
  // escopo na lista: o formulário de adicionar também tem uma <option>MetaMask</option>
  await expect(page.getByRole('list', { name: 'Carteiras cadastradas' }).getByText('MetaMask')).toHaveCount(0)
})

test('erro ao listar mostra alerta e recupera ao tentar novamente', async ({ page }) => {
  await login(page, 'ana@demo.com')
  await scenario(page, 'wallets.list=500')
  await page.goto('/wallets')
  await expect(page.getByRole('alert')).toContainText('Algo deu errado', { timeout: 15_000 })
  await scenario(page, 'latency=50')
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(card(page, 'MetaMask')).toBeVisible()
})

test('exibe skeleton acessível enquanto carrega', async ({ page }) => {
  await login(page, 'ana@demo.com')
  await scenario(page, 'latency=1500')
  await page.goto('/wallets')
  await expect(page.getByRole('status', { name: 'Carregando carteiras' })).toBeVisible()
  await expect(card(page, 'MetaMask')).toBeVisible()
})

test('sessão expirada em página privada leva ao login com aviso', async ({ page }) => {
  await login(page, 'ana@demo.com')
  await scenario(page, 'session-expired')
  await page.goto('/wallets')
  await expect(page).toHaveURL(/\/login\?redirect=%2Fwallets/)
  await expect(page.getByText('Sua sessão expirou. Entre novamente para continuar.')).toBeVisible()
})

test('carteiras em 390px: sem overflow e formulário utilizável', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openWallets(page)
  await expect(card(page, 'MetaMask')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Adicionar carteira' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
