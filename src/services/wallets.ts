import { http } from '@/lib/http'
import type { Network, Wallet, WalletProvider } from '@/types'

export const walletsApi = {
  list: (signal?: AbortSignal) => http.get<Wallet[]>('/wallets', { signal }).then((r) => r.data),
  create: (provider: WalletProvider, network: Network) => http.post<Wallet>('/wallets', { provider, network }).then((r) => r.data),
  connect: (id: string) => http.post<Wallet>(`/wallets/${id}/connect`).then((r) => r.data),
  disconnect: (id: string) => http.post<Wallet>(`/wallets/${id}/disconnect`).then((r) => r.data),
  remove: (id: string) => http.delete(`/wallets/${id}`).then(() => undefined),
}
