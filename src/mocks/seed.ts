import type { Category, NFT, User, Wallet, Coupon } from '@/types'

/** SHA-256("nft-demo:" + senha). Nunca armazenamos senha em texto puro. */
export const DEMO_PASSWORD_HASH = '1313a1929db3530d367dc72972b85fc0ca7d0a4fc5c97014a7036df89439fca4'
export const DEMO_PASSWORD = 'Senha123!'

export interface UserRecord extends User { passwordHash: string }

export const seedUsers = (): UserRecord[] => [
  { id: 'u_ana', name: 'Ana Souza', email: 'ana@demo.com', createdAt: '2026-01-10T12:00:00Z', passwordHash: DEMO_PASSWORD_HASH },
  { id: 'u_bruno', name: 'Bruno Lima', email: 'bruno@demo.com', createdAt: '2026-02-03T12:00:00Z', passwordHash: DEMO_PASSWORD_HASH },
]

export const seedWallets = (): Record<string, Wallet[]> => ({
  u_ana: [{ id: 'w_ana_1', provider: 'metamask', network: 'ethereum', address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', connected: false }],
  u_bruno: [{ id: 'w_bruno_1', provider: 'coinbase', network: 'polygon', address: '0x2546BcD3c84621e976D8185a91A922aE77ECEc30', connected: false }],
})

export const seedCoupons = (): Coupon[] => [
  { code: 'WELCOME10', percent: 10, expiresAt: '2099-12-31T23:59:59Z' },
  { code: 'EXPIRED20', percent: 20, expiresAt: '2024-01-01T00:00:00Z' },
]

const palette = [['#7c3aed', '#06b6d4'], ['#f43f5e', '#f59e0b'], ['#10b981', '#3b82f6'], ['#ec4899', '#8b5cf6'], ['#f97316', '#eab308'], ['#14b8a6', '#6366f1']]

/** Imagem SVG gerada (data URI): sem assets externos, sem layout shift. */
function art(seed: number, variant: number): string {
  const [a, b] = palette[(seed + variant) % palette.length]
  const r = 40 + ((seed * 37 + variant * 53) % 120)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="400" height="400" fill="url(#g)"/><circle cx="${120 + variant * 60}" cy="${140 + (seed % 5) * 20}" r="${r}" fill="#fff" fill-opacity=".22"/><circle cx="${280 - variant * 30}" cy="270" r="${r / 2}" fill="#000" fill-opacity=".2"/></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

const cats: Category[] = ['art', 'music', 'gaming', 'collectibles', 'photography']
const collections = ['Neon Dreams', 'Pixel Forest', 'Echo Chamber', 'Void Walkers', 'Solar Drift']
const prices = ['0.05', '0.125', '0.3', '0.75', '1.2', '2.5', '0.0875', '0.45']

export const seedNfts = (): NFT[] =>
  Array.from({ length: 24 }, (_, i) => {
    const n = i + 1
    const stock = n % 9 === 0 ? 0 : 1 + (n % 5) * 2
    return {
      id: String(n),
      name: `${collections[i % 5]} #${String(n).padStart(3, '0')}`,
      collection: collections[i % 5],
      edition: `#${n}/50`,
      category: cats[i % 5],
      description: `Peça digital exclusiva da coleção ${collections[i % 5]}. Obra fictícia criada para a demonstração.`,
      price: prices[i % prices.length],
      available: stock,
      featured: n <= 4,
      images: [art(n, 0), art(n, 1), art(n, 2)],
      version: 1,
      createdAt: new Date(Date.UTC(2026, 0, 1 + n)).toISOString(),
    }
  })
