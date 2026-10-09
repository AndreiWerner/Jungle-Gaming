import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { CartLineRow } from '@/features/cart/CartLineRow'
import { CartSummary } from '@/features/cart/CartSummary'
import { CouponForm } from '@/features/cart/CouponForm'
import { useCartActions, useQuote } from '@/features/cart/queries'

function CartSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className="space-y-4">
      {[0, 1].map((i) => <div key={i} className="flex gap-4 rounded-xl border border-border bg-surface p-4"><div className="skeleton size-24 shrink-0" /><div className="flex-1 space-y-2"><div className="skeleton h-5 w-2/3" /><div className="skeleton h-4 w-1/3" /><div className="skeleton h-10 w-32" /></div></div>)}
    </div>
  )
}

export function Cart() {
  const actions = useCartActions()
  const { cart, query } = actions
  const quote = useQuote(cart)

  const heading = <h1 className="text-2xl font-bold sm:text-3xl">Carrinho</h1>
  let body
  if (query.isPending) {
    body = <CartSkeleton label="Carregando carrinho" />
  } else if (query.isError || !cart) {
    body = <ErrorState error={query.error} onRetry={() => void query.refetch()} />
  } else if (cart.items.length === 0) {
    body = <EmptyState title="Seu carrinho está vazio"><p>Explore o catálogo e adicione NFTs.</p><Link to="/" className="mt-4 inline-block rounded-lg bg-brand px-4 py-2 font-medium text-brand-fg">Explorar NFTs</Link></EmptyState>
  } else if (quote.isError && !quote.data) {
    body = <ErrorState error={quote.error} onRetry={() => void quote.refetch()} />
  } else {
    const data = quote.data
    const stale = quote.isPlaceholderData || quote.isFetching
    body = (
      <div className="grid items-start gap-8 lg:grid-cols-[1fr_22rem]">
        <ul aria-label="Itens do carrinho" className="space-y-4">
          {cart.items.map((item) => {
            const line = data?.lines.find((l) => l.nftId === item.nftId)
            return (
              <CartLineRow key={item.nftId} item={item} line={line}
                onQuantity={(q) => actions.setQuantity(item.nftId, q)} onRemove={() => actions.remove(item.nftId)}
                onAcceptPrice={() => line && actions.acceptPrice(item.nftId, line.currentPrice)}
                onFitStock={() => line?.nft && actions.setQuantity(item.nftId, line.nft.available)} />
            )
          })}
        </ul>
        <section aria-label="Resumo do pedido" className="space-y-5 rounded-2xl border border-border bg-surface p-5 lg:sticky lg:top-24">
          <h2 className="text-lg font-semibold">Resumo</h2>
          {data ? <CartSummary quote={data} stale={stale} /> : <div role="status" aria-busy="true" aria-label="Carregando resumo" className="space-y-3"><div className="skeleton h-4 w-full" /><div className="skeleton h-4 w-full" /><div className="skeleton h-6 w-full" /></div>}
          <CouponForm appliedCode={cart.couponCode} applied={data?.coupon ?? null} onApply={(c) => actions.setCoupon(c)} onRemove={() => actions.setCoupon(null)} />
          {quote.isError && <Button variant="secondary" onClick={() => void quote.refetch()}>Recalcular resumo</Button>}
        </section>
      </div>
    )
  }
  return <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">{heading}{body}</div>
}
