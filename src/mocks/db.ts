import type { Cart, NFT, Order, Wallet, Coupon } from '@/types'
import { seedCoupons, seedNfts, seedUsers, seedWallets, type UserRecord } from './seed'

export interface SessionRecord { token: string; userId: string; expiresAt: string }
export interface MockDb {
  users: UserRecord[]
  nfts: NFT[]
  coupons: Coupon[]
  sessions: SessionRecord[]
  favorites: Record<string, string[]>
  carts: Record<string, Cart>
  wallets: Record<string, Wallet[]>
  orders: Order[]
  /** chave de idempotência -> id do pedido */
  idempotency: Record<string, string>
  /** instante (ms) em que cada pedido pendente será resolvido */
  settleAt: Record<string, number>
  eventSeq: number
}

const STORAGE_KEY = 'nftm:mockdb'
const fresh = (): MockDb => ({
  users: seedUsers(), nfts: seedNfts(), coupons: seedCoupons(), sessions: [],
  favorites: { u_ana: ['2'], u_bruno: [] }, carts: {}, wallets: seedWallets(),
  orders: [], idempotency: {}, settleAt: {}, eventSeq: 0,
})

function load(): MockDb {
  try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) return JSON.parse(raw) as MockDb } catch { /* usa seed */ }
  return fresh()
}

export const db: MockDb = load()

/** Persiste o banco simulado para sobreviver a refresh. */
export const save = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)) } catch { /* noop */ } }

/** Reset completo dos dados simulados. */
export function resetDb() {
  Object.assign(db, fresh())
  save()
}

export const newId = (p: string) => `${p}_${Math.random().toString(36).slice(2, 10)}`
