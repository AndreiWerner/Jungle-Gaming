import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from '@/app/session'
import { walletsApi } from '@/services/wallets'
import type { Network, Wallet, WalletProvider } from '@/types'

/** Chave por usuário: carteiras de contas diferentes nunca compartilham cache. */
export const walletsKey = (userId?: string) => ['wallets', userId ?? 'anon'] as const

export function useWallets() {
  const { session } = useSession()
  return useQuery({ queryKey: walletsKey(session?.user.id), queryFn: ({ signal }) => walletsApi.list(signal), enabled: !!session })
}

function useWalletsCache() {
  const qc = useQueryClient()
  const { session } = useSession()
  const key = walletsKey(session?.user.id)
  return {
    /** Atualiza o cache com a resposta da API (nunca de forma otimista) e reconcilia em seguida. */
    set: (fn: (old: Wallet[]) => Wallet[]) => { qc.setQueryData<Wallet[]>(key, (old) => fn(old ?? [])); void qc.invalidateQueries({ queryKey: key }) },
  }
}

export function useAddWallet() {
  const cache = useWalletsCache()
  return useMutation({
    mutationFn: ({ provider, network }: { provider: WalletProvider; network: Network }) => walletsApi.create(provider, network),
    onSuccess: (wallet) => cache.set((old) => [...old, wallet]),
  })
}

/** Conectar/desconectar: a interface só muda de estado depois que a API confirma. */
export function useWalletConnection(kind: 'connect' | 'disconnect') {
  const cache = useWalletsCache()
  return useMutation({
    mutationFn: (id: string) => (kind === 'connect' ? walletsApi.connect(id) : walletsApi.disconnect(id)),
    onSuccess: (wallet) => cache.set((old) => old.map((w) => (w.id === wallet.id ? wallet : w))),
  })
}

export function useRemoveWallet() {
  const cache = useWalletsCache()
  return useMutation({
    mutationFn: (id: string) => walletsApi.remove(id),
    onSuccess: (_void, id) => cache.set((old) => old.filter((w) => w.id !== id)),
  })
}
