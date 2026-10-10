import { Link, useParams } from '@tanstack/react-router'
import { CircleCheck, CircleX, Loader } from 'lucide-react'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { useOrder } from '@/features/checkout/queries'
import { NETWORK_LABEL } from '@/features/wallets/labels'
import { toApiError } from '@/lib/errors'
import { formatEth, mul } from '@/lib/money'
import type { Order as OrderType } from '@/types'

const STATUS = {
  pending: { label: 'Processando pagamento…', icon: Loader, cls: 'text-warning' },
  confirmed: { label: 'Pedido confirmado', icon: CircleCheck, cls: 'text-success' },
  rejected: { label: 'Pagamento recusado', icon: CircleX, cls: 'text-danger' },
} as const

function Receipt({ order }: { order: OrderType }) {
  const s = STATUS[order.status]
  const Icon = s.icon
  const row = 'flex justify-between gap-4'
  return (
    <div className="space-y-6">
      <div role="status" aria-live="polite" className={`flex items-center gap-3 rounded-2xl border border-border bg-surface p-5 text-lg font-semibold ${s.cls}`}>
        <Icon aria-hidden className={order.status === 'pending' ? 'animate-spin' : undefined} />
        <span>{s.label}</span>
      </div>
      {order.status === 'rejected' && (
        <div className="space-y-3 rounded-2xl border border-danger/40 bg-danger/10 p-5 text-sm">
          <p>{order.rejectionReason ?? 'O pagamento não foi concluído.'} Seu carrinho foi preservado.</p>
          <Link to="/cart" className="inline-block rounded-lg bg-brand px-4 py-2 font-medium text-brand-fg">Voltar ao carrinho</Link>
        </div>
      )}
      <section aria-label="Itens do pedido" className="space-y-3 rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-lg font-semibold">Itens</h2>
        <ul className="space-y-3">
          {order.items.map((i) => (
            <li key={i.nftId} className="flex items-center gap-3">
              <img src={i.image} alt={`Arte do NFT ${i.name}`} width={56} height={56} className="size-14 rounded-md object-cover" />
              <div className="min-w-0 flex-1"><p className="truncate font-medium">{i.name}</p><p className="text-sm text-muted">{i.collection} · {i.edition} · {i.quantity} × {formatEth(i.unitPrice)}</p></div>
              <p className="font-semibold">{formatEth(mul(i.unitPrice, i.quantity))}</p>
            </li>
          ))}
        </ul>
        <dl className="space-y-2 border-t border-border pt-4 text-sm">
          <div className={row}><dt className="text-muted">Subtotal</dt><dd>{formatEth(order.subtotal)}</dd></div>
          {order.discount !== '0' && <div className={row}><dt className="text-muted">Desconto{order.couponCode ? ` (${order.couponCode})` : ''}</dt><dd>−{formatEth(order.discount)}</dd></div>}
          <div className={row}><dt className="text-muted">Taxa de rede</dt><dd>{formatEth(order.networkFee)}</dd></div>
          <div className={`${row} text-base font-semibold`}><dt>Total</dt><dd>{formatEth(order.total)}</dd></div>
        </dl>
      </section>
      <section aria-label="Detalhes da transação" className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-3 text-lg font-semibold">Detalhes</h2>
        <dl className="space-y-2 text-sm">
          <div className={row}><dt className="text-muted">Pedido</dt><dd className="break-all">{order.id}</dd></div>
          <div className={row}><dt className="text-muted">Rede</dt><dd>{NETWORK_LABEL[order.network]}</dd></div>
          <div className={row}><dt className="text-muted">Referência da transação</dt><dd className="break-all text-right">{order.txRef}</dd></div>
          <div className={row}><dt className="text-muted">Data</dt><dd>{new Date(order.createdAt).toLocaleString('pt-BR')}</dd></div>
          <div className={row}><dt className="text-muted">Colecionador</dt><dd className="text-right">{order.collector.name} ({order.collector.email})</dd></div>
        </dl>
      </section>
      <Link to="/" className="inline-block text-sm text-brand underline">Continuar explorando</Link>
    </div>
  )
}

export function Order() {
  const { id } = useParams({ from: '/order/$id' })
  const { data, isPending, error, refetch } = useOrder(id)
  const status = error ? toApiError(error).status : 0
  let body
  if (isPending) body = <div role="status" aria-busy="true" aria-label="Carregando pedido" className="space-y-4"><div className="skeleton h-20 rounded-2xl" /><div className="skeleton h-48 rounded-2xl" /></div>
  else if (status === 404) body = <EmptyState title="Pedido não encontrado"><p>Verifique o endereço ou consulte seus pedidos.</p></EmptyState>
  else if (status === 403) body = <EmptyState title="Você não tem acesso a este pedido"><p>Este pedido pertence a outra conta.</p></EmptyState>
  else if (error) body = <ErrorState error={error} onRetry={() => void refetch()} />
  else body = <Receipt order={data} />
  return <div className="mx-auto max-w-3xl space-y-6 px-4 py-8"><h1 className="text-2xl font-bold sm:text-3xl">Pedido</h1>{body}</div>
}
