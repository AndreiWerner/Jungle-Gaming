import type { QueryClient } from '@tanstack/react-query'
import type { NFT, NftUpdatedEvent, Order, OrderUpdatedEvent, Page } from '@/types'
import { catalogKeys } from '@/features/catalog/queries'
import { orderKey, ordersKey } from '@/features/checkout/queries'

/** nft.updated: atualiza detalhe e listas em memória e invalida o que depende do preço/estoque. */
export function applyNftUpdated(qc: QueryClient, e: NftUpdatedEvent) {
  // só aplica se o evento for mais novo que o que já está em cache (um REST mais recente vence)
  const patch = (n: NFT): NFT => (n.id === e.nftId && e.version > n.version ? { ...n, ...e.changes, version: e.version } : n)
  qc.setQueryData<NFT>(catalogKeys.detail(e.nftId), (old) => (old ? patch(old) : old))
  qc.setQueriesData<Page<NFT>>({ queryKey: ['nfts', 'list'] }, (old) => (old ? { ...old, items: old.items.map(patch) } : old))
  qc.setQueryData<NFT[]>(catalogKeys.featured, (old) => old?.map(patch))
  // listas: marca como obsoletas sem refazer agora (a ordenação pode ter mudado; atualiza no próximo acesso)
  void qc.invalidateQueries({ queryKey: ['nfts', 'list'], refetchType: 'none' })
  // carrinho/checkout: a cotação depende de preço e estoque
  void qc.invalidateQueries({ queryKey: ['quote'] })
}

/** order.updated: atualiza o pedido do USUÁRIO ATUAL (a chave inclui o id) e invalida o histórico. */
export function applyOrderUpdated(qc: QueryClient, userId: string, e: OrderUpdatedEvent) {
  qc.setQueryData<Order>(orderKey(userId, e.orderId), (old) =>
    old && e.version > old.version ? { ...old, status: e.status, rejectionReason: e.rejectionReason, version: e.version } : old)
  void qc.invalidateQueries({ queryKey: ordersKey(userId) })
}

/** Após reconexão: eventos podem ter sido perdidos, então reconcilia tudo com o REST. */
export function reconcileAll(qc: QueryClient) {
  for (const k of ['nfts', 'quote', 'cart', 'orders']) void qc.invalidateQueries({ queryKey: [k] })
}
