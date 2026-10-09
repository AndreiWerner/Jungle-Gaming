import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from '@/app/session'
import { cartApi } from '@/services/cart'
import { toApiError } from '@/lib/errors'
import { notify } from '@/lib/notify'
import type { Cart, NFT } from '@/types'
import { acceptPrice, addItem, removeItem, sameCart, setQuantity, withCoupon } from './cartOps'
import { mergeGuestCartIfAny, readGuestCart, writeGuestCart } from './guestCart'

/** Visitante e cada usuário têm chaves próprias: nenhum carrinho vaza para outra conta. */
export const cartKey = (userId?: string) => ['cart', userId ?? 'guest'] as const
const UPDATE_KEY = ['cart', 'update'] as const

export function useCart() {
  const { session } = useSession()
  const userId = session?.user.id
  return useQuery({
    queryKey: cartKey(userId),
    queryFn: async ({ signal }) => {
      if (!userId) return readGuestCart()
      await mergeGuestCartIfAny() // preserva os itens do visitante ao fazer login
      return cartApi.get(signal)
    },
    staleTime: userId ? 30_000 : Infinity,
  })
}

/** Cotação (subtotal, desconto, taxa, total e avisos) calculada pela API para o carrinho atual. */
export function useQuote(cart: Cart | undefined) {
  return useQuery({
    queryKey: ['quote', cart],
    queryFn: ({ signal }) => cartApi.quote(cart!, signal),
    enabled: !!cart && cart.items.length > 0,
    placeholderData: keepPreviousData,
  })
}

interface Ctx { previous: Cart | undefined; optimistic: Cart }

function useUpdateCart() {
  const qc = useQueryClient()
  const { session } = useSession()
  const userId = session?.user.id
  const key = cartKey(userId)

  return useMutation<Cart, unknown, Cart, Ctx>({
    mutationKey: UPDATE_KEY,
    scope: { id: 'cart' }, // as gravações são enviadas em série, na ordem dos cliques
    mutationFn: async (next) => {
      if (!userId) { writeGuestCart(next); return next }
      return cartApi.put(next)
    },
    onMutate: async (next) => {
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<Cart>(key)
      qc.setQueryData<Cart>(key, next) // atualização otimista
      return { previous, optimistic: next }
    },
    onError: (error, _next, ctx) => {
      const current = qc.getQueryData<Cart>(key)
      // só desfaz se nenhuma outra alteração entrou depois; caso contrário reconcilia com a API
      if (ctx?.previous && sameCart(current, ctx.optimistic)) qc.setQueryData<Cart>(key, ctx.previous)
      else void qc.invalidateQueries({ queryKey: key })
      notify(`Não foi possível atualizar o carrinho. ${toApiError(error).message}`)
    },
    onSettled: () => {
      if (qc.isMutating({ mutationKey: UPDATE_KEY }) <= 1) void qc.invalidateQueries({ queryKey: key })
    },
  })
}

/** Ações do carrinho. Sempre partem do cache mais recente e só rodam com o carrinho já carregado. */
export function useCartActions() {
  const qc = useQueryClient()
  const { session } = useSession()
  const query = useCart()
  const update = useUpdateCart()
  const key = cartKey(session?.user.id)

  const run = (fn: (cart: Cart) => Cart, options?: { onSuccess?: () => void }) => {
    const current = qc.getQueryData<Cart>(key)
    if (!current) return // evita sobrescrever o carrinho do servidor antes de carregá-lo
    update.mutate(fn(current), options)
  }
  return {
    query,
    cart: query.data,
    ready: query.data !== undefined,
    add: (nft: NFT, quantity: number, options?: { onSuccess?: () => void }) => run((c) => addItem(c, nft, quantity), options),
    setQuantity: (nftId: string, quantity: number) => run((c) => setQuantity(c, nftId, quantity)),
    remove: (nftId: string) => run((c) => removeItem(c, nftId)),
    acceptPrice: (nftId: string, price: string) => run((c) => acceptPrice(c, nftId, price)),
    setCoupon: (code: string | null) => run((c) => withCoupon(c, code)),
  }
}
