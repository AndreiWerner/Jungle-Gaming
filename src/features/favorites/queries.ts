import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from '@/app/session'
import { favoritesApi } from '@/services/favorites'
import { toApiError } from '@/lib/errors'
import { notify } from '@/lib/notify'

/** A chave inclui o usuário: favoritos de contas diferentes nunca compartilham cache. */
export const favoritesKey = (userId?: string) => ['favorites', userId ?? 'anon'] as const
const TOGGLE_KEY = ['favorites', 'toggle'] as const

export function useFavoriteIds() {
  const { session } = useSession()
  return useQuery({
    queryKey: favoritesKey(session?.user.id),
    queryFn: ({ signal }) => favoritesApi.list(signal),
    enabled: !!session,
  })
}

interface Vars { nftId: string; favorite: boolean }
interface Ctx { previous: string[] | undefined; wasFavorite: boolean }

/** Favoritar/desfavoritar com atualização otimista e rollback. */
export function useToggleFavorite() {
  const qc = useQueryClient()
  const { session } = useSession()
  const key = favoritesKey(session?.user.id)

  return useMutation<string[], unknown, Vars, Ctx>({
    mutationKey: TOGGLE_KEY,
    mutationFn: ({ nftId, favorite }) => (favorite ? favoritesApi.add(nftId) : favoritesApi.remove(nftId)),
    onMutate: async ({ nftId, favorite }) => {
      // 1) cancela consultas em andamento para que não sobrescrevam o estado otimista
      await qc.cancelQueries({ queryKey: key })
      // 2) snapshot do estado anterior
      const previous = qc.getQueryData<string[]>(key)
      // 3) atualiza a interface imediatamente
      qc.setQueryData<string[]>(key, (old = []) => (favorite ? [...new Set([...old, nftId])] : old.filter((id) => id !== nftId)))
      return { previous, wasFavorite: !favorite }
    },
    onError: (error, { nftId }, ctx) => {
      // 4) rollback restrito a ESTE NFT: não desfaz mudanças de outras requisições em andamento
      qc.setQueryData<string[]>(key, (old) => {
        const base = old ?? ctx?.previous ?? []
        return ctx?.wasFavorite ? [...new Set([...base, nftId])] : base.filter((id) => id !== nftId)
      })
      notify(`Não foi possível atualizar seus favoritos. ${toApiError(error).message}`)
    },
    onSettled: () => {
      // 5) reconcilia com a API; se houver outra mutação em voo, deixa a última delas reconciliar
      if (qc.isMutating({ mutationKey: TOGGLE_KEY }) <= 1) void qc.invalidateQueries({ queryKey: key })
    },
  })
}
