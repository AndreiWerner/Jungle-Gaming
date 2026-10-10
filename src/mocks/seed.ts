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

const palettes = [
  ['#d8c4a8', '#8c604b', '#33463d', '#eee3d1'],
  ['#d4d8c8', '#6d7e69', '#b46e4e', '#f0e8d9'],
  ['#e3c7b9', '#8c5148', '#4a5650', '#f3e5d4'],
  ['#d6c8b4', '#6e6254', '#b5a17d', '#f1e9dc'],
  ['#c7d0c6', '#536d63', '#c38b61', '#e9e0d0'],
  ['#ddc8a8', '#a65f45', '#5a6253', '#f4ead9'],
]

/** Ilustrações vetoriais editoriais com paleta terrosa, em vez de gradientes neon genéricos. */
function art(seed: number, variant: number): string {
  const [paper, dark, accent, light] = palettes[(seed + variant) % palettes.length]
  const shift = (seed * 19 + variant * 31) % 70
  const motif = seed % 4
  const drawing = motif === 0
    ? `<path d="M0 270 Q80 ${190+shift} 150 255 T300 230 T400 250 V400 H0Z" fill="${dark}"/><path d="M0 315 Q100 255 205 315 T400 290 V400 H0Z" fill="${accent}"/><circle cx="${280-shift/3}" cy="${90+shift/4}" r="34" fill="${light}"/><path d="M40 340 Q95 280 150 340 M210 360 Q275 285 340 350" fill="none" stroke="${light}" stroke-width="3" opacity=".75"/>`
    : motif === 1
    ? `<rect x="64" y="48" width="272" height="304" rx="136" fill="${dark}"/><path d="M70 255 Q130 170 195 250 T330 210 V350 H70Z" fill="${accent}"/><circle cx="200" cy="142" r="45" fill="${paper}"/><path d="M105 320 L175 220 L220 285 L260 240 L320 320" fill="none" stroke="${light}" stroke-width="5" stroke-linecap="round"/>`
    : motif === 2
    ? `<rect x="58" y="54" width="284" height="292" fill="${light}"/><path d="M80 290 L160 115 L225 250 L270 170 L320 290Z" fill="${dark}"/><circle cx="255" cy="115" r="29" fill="${accent}"/><path d="M82 310 H318" stroke="${dark}" stroke-width="3"/>`
    : `<path d="M200 48 C245 100 320 105 326 175 C334 250 264 320 200 350 C136 320 66 250 74 175 C80 105 155 100 200 48Z" fill="${dark}"/><path d="M200 92 C228 138 282 150 280 197 C278 238 233 278 200 300 C167 278 122 238 120 197 C118 150 172 138 200 92Z" fill="${paper}"/><circle cx="200" cy="196" r="34" fill="${accent}"/>`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><defs><pattern id="grain" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="1" cy="2" r=".65" fill="#33271f" opacity=".16"/></pattern></defs><rect width="400" height="400" fill="${paper}"/><path d="M0 0H400V400H0Z" fill="${light}" opacity=".25"/>${drawing}<rect width="400" height="400" fill="url(#grain)"/><path d="M22 22H378V378H22Z" fill="none" stroke="${dark}" stroke-opacity=".22" stroke-width="1"/></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

const cats: Category[] = ['art', 'music', 'gaming', 'collectibles', 'photography']
const collections = ['Quiet Landscapes', 'Field Notes', 'Small Rituals', 'Studies in Form', 'After the Rain']
const prices = ['0.05', '0.125', '0.3', '0.75', '1.2', '2.5', '0.0875', '0.45']

export const seedNfts = (): NFT[] =>
  Array.from({ length: 24 }, (_, i) => {
    const n = i + 1
    const stock = n % 9 === 0 ? 0 : 1 + (n % 5) * 2
    return {
      id: String(n),
      name: `${['Golden Hour', 'Moss Study', 'Still Life No. 4', 'Soft Geometry', 'Sunday Garden'][i % 5]} #${String(n).padStart(3, '0')}`,
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
