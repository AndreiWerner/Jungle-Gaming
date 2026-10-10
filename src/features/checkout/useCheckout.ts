import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useSession } from '@/app/session'
import { cartApi } from '@/services/cart'
import { ordersApi } from '@/services/orders'
import { ApiError, toApiError } from '@/lib/errors'
import type { Cart, Quote } from '@/types'
import { orderKey } from './queries'

class QuoteChanged extends Error {}
interface Input { displayedQuoteId: string; walletId: string; collector: { name: string; email: string } }

/**
 * Confirmação de compra:
 *  1) revalida a cotação (preço, estoque, cupom, taxas) e compara com a que o usuário viu;
 *  2) se algo mudou, NÃO cria o pedido: atualiza a tela e exige nova confirmação;
 *  3) cria o pedido com chave de idempotência estável por tentativa, reutilizada em reenvios.
 */
export function useCheckout(cart: Cart) {
  const qc = useQueryClient()
  const router = useRouter()
  const { session } = useSession()
  const keyRef = useRef<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [retryable, setRetryable] = useState(false)
  const quoteKey = ['quote', cart] as const

  const mutation = useMutation({
    mutationFn: async (input: Input) => {
      const fresh = await qc.fetchQuery({ queryKey: quoteKey, queryFn: ({ signal }) => cartApi.quote(cart, signal), staleTime: 0 })
      if (fresh.quoteId !== input.displayedQuoteId || fresh.hasIssues) throw new QuoteChanged()
      keyRef.current ??= crypto.randomUUID()
      return ordersApi.create({ quoteId: fresh.quoteId, walletId: input.walletId, collector: input.collector }, keyRef.current)
    },
    onMutate: () => { setNotice(null); setRetryable(false) },
    onSuccess: (order) => {
      keyRef.current = null
      qc.setQueryData(orderKey(session?.user.id, order.id), order)
      void router.navigate({ to: '/order/$id', params: { id: order.id } })
    },
    onError: (error) => {
      if (error instanceof QuoteChanged) {
        setNotice('Preço, desconto, taxas ou disponibilidade mudaram. Revise os valores atualizados e confirme novamente.')
        return
      }
      const e: ApiError = toApiError(error)
      if (e.status === 409) {
        const quote = e.body.details?.quote as Quote | undefined
        if (quote) qc.setQueryData(quoteKey, quote)
        keyRef.current = null // falha definitiva: a próxima tentativa é uma compra nova
        setNotice('Os valores ou a disponibilidade mudaram. Revise e confirme novamente.')
      } else if (e.status === 0) {
        // timeout/rede: o pedido pode ter sido criado. Reenviar com a MESMA chave é seguro e não duplica
        setRetryable(true)
        setNotice('A confirmação demorou ou a conexão falhou. Seu pedido pode já ter sido criado: tentar novamente é seguro e não gera pedido duplicado.')
      } else {
        keyRef.current = null
        setNotice(e.message)
      }
    },
  })
  return { submit: (input: Input) => { if (!mutation.isPending) mutation.mutate(input) }, pending: mutation.isPending, notice, retryable }
}
