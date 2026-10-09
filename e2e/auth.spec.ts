import { expect, test } from '@playwright/test'

const PASSWORD = 'Senha123!'

test('login válido redireciona para a home e persiste após refresh', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill('ana@demo.com')
  await page.getByLabel('Senha').fill(PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL('/')
  await page.reload()
  await expect(page.getByRole('navigation', { name: 'Principal' }).getByRole('button', { name: 'Sair' })).toBeVisible()
})

test('credenciais inválidas mostram erro sem criar sessão', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill('ana@demo.com')
  await page.getByLabel('Senha').fill('errada123')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('alert')).toContainText('E-mail ou senha inválidos.')
  await expect(page).toHaveURL(/\/login/)
  expect(await page.evaluate(() => localStorage.getItem('nftm:session'))).toBeNull()
})

test('validação de campos vazios associa erro ao campo e foca o primeiro inválido', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Entrar' }).click()
  const email = page.getByLabel('E-mail')
  await expect(email).toHaveAttribute('aria-invalid', 'true')
  await expect(email).toBeFocused()
  await expect(page.getByText('Informe sua senha.')).toBeVisible()
})

test('rota privada sem sessão redireciona ao login e volta ao destino após autenticar', async ({ page }) => {
  await page.goto('/profile')
  await expect(page).toHaveURL(/\/login\?redirect=%2Fprofile/)
  await page.getByLabel('E-mail').fill('bruno@demo.com')
  await page.getByLabel('Senha').fill(PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/profile$/)
})

test('cadastro válido cria a conta e já autentica', async ({ page }) => {
  await page.goto('/register')
  await page.getByLabel('Nome').fill('Carla Dias')
  await page.getByLabel('E-mail').fill('carla@demo.com')
  await page.getByLabel(/Senha/).fill(PASSWORD)
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('navigation', { name: 'Principal' }).getByRole('button', { name: 'Sair' })).toBeVisible()
})

test('cadastro com e-mail duplicado mostra erro no campo', async ({ page }) => {
  await page.goto('/register')
  await page.getByLabel('Nome').fill('Outra Ana')
  await page.getByLabel('E-mail').fill('ana@demo.com')
  await page.getByLabel(/Senha/).fill(PASSWORD)
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page.getByText('Este e-mail já está cadastrado.')).toBeVisible()
  await expect(page).toHaveURL(/\/register/)
})

test('senha curta é bloqueada no cliente', async ({ page }) => {
  await page.goto('/register')
  await page.getByLabel('Nome').fill('Teste')
  await page.getByLabel('E-mail').fill('teste@demo.com')
  await page.getByLabel(/Senha/).fill('curta')
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page.getByText('A senha precisa ter pelo menos 8 caracteres.')).toBeVisible()
})

test('logout encerra a sessão e protege novamente a rota privada', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill('ana@demo.com')
  await page.getByLabel('Senha').fill(PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('button', { name: 'Sair' }).click()
  await page.goto('/profile')
  await expect(page).toHaveURL(/\/login/)
})

test('login em 390px não gera overflow horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/login')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
