import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useSession } from '@/app/session'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/input'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { EMAIL } from '@/features/auth/validation'
import { CartSummary } from '@/features/cart/CartSummary'
import { useCartActions, useQuote } from '@/features/cart/queries'
import { ReviewLines } from '@/features/checkout/ReviewLines'
import { WalletPicker } from '@/features/checkout/WalletPicker'
import { useCheckout } from '@/features/checkout/useCheckout'
import { useWallets } from '@/features/wallets/queries'
import { EMPTY_CART } from '@/features/cart/cartOps'

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section aria-label={title} className="space-y-4 rounded-2xl border border-border bg-surface p-5">
    <h2 className="text-lg font-semibold">{title}</h2>{children}
  </section>
)

export function Checkout() {
  const { session } = useSession()
  const actions = useCartActions()
  const cart = actions.cart ?? EMPTY_CART
  const quote = useQuote(actions.cart)
  const wallets = useWallets()
  const checkout = useCheckout(cart)
  const [name, setName] = useState(session?.user.name ?? '')
  const [email, setEmail] = useState(session?.user.email ?? '')
  const [walletId, setWalletId] = useState<string | null>(null)
  const [showErrors, setShowErrors] = useState(false)

  const selectedId = walletId ?? wallets.data?.find((w) => w.connected)?.id ?? null
  const wallet = wallets.data?.find((w) => w.id === selectedId)
  const errors = { name: name.trim() ? undefined : 'Informe seu nome.', email: EMAIL.test(email.trim()) ? undefined : 'Informe um e-mail válido.' }
  const data = quote.data

  const blockers: string[] = []
  if (errors.name || errors.email) blockers.push('Preencha os dados do colecionador.')
  if (!wallet) blockers.push('Selecione uma carteira.')
  else if (!wallet.connected) blockers.push('Conecte a carteira selecionada.')
  if (data?.hasIssues) blockers.push('Resolva os avisos nos itens do pedido.')
  const ready = blockers.length === 0 && !!data

  const confirm = () => {
    setShowErrors(true)
    if (!ready || !data || !wallet || checkout.pending) return
    checkout.submit({ displayedQuoteId: data.quoteId, walletId: wallet.id, collector: { name: name.trim(), email: email.trim() } })
  }

  let body
  if (actions.query.isPending) body = <div role="status" aria-busy="true" aria-label="Carregando checkout" className="space-y-4"><div className="skeleton h-40 rounded-2xl" /><div className="skeleton h-40 rounded-2xl" /></div>
  else if (actions.query.isError) body = <ErrorState error={actions.query.error} onRetry={() => void actions.query.refetch()} />
  else if (cart.items.length === 0) body = <EmptyState title="Seu carrinho está vazio"><p>Adicione NFTs para finalizar uma compra.</p><Link to="/" className="mt-4 inline-block rounded-lg bg-brand px-4 py-2 font-medium text-brand-fg">Explorar NFTs</Link></EmptyState>
  else if (quote.isError && !data) body = <ErrorState error={quote.error} onRetry={() => void quote.refetch()} />
  else body = (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-6">
        <Section title="Dados do colecionador">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome" name="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} error={showErrors ? errors.name : undefined} />
            <Field label="E-mail" name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={showErrors ? errors.email : undefined} />
          </div>
        </Section>
        <Section title="Carteira">
          <WalletPicker selectedId={selectedId} onSelect={setWalletId} />
        </Section>
        <Section title="Revisão do pedido">
          {data ? <ReviewLines cart={cart} quote={data} onAcceptPrice={actions.acceptPrice} /> : <div role="status" aria-busy="true" aria-label="Carregando revisão" className="skeleton h-24" />}
        </Section>
      </div>
      <aside aria-label="Resumo e confirmação" className="space-y-4 rounded-2xl border border-border bg-surface p-5 lg:sticky lg:top-24">
        <h2 className="text-lg font-semibold">Resumo</h2>
        {data ? <CartSummary quote={data} stale={quote.isFetching} /> : <div className="skeleton h-24" />}
        {checkout.notice && <p role="alert" className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">{checkout.notice}</p>}
        {blockers.length > 0 && showErrors && <ul className="list-disc space-y-1 pl-5 text-sm text-muted">{blockers.map((b) => <li key={b}>{b}</li>)}</ul>}
        <Button className="w-full" aria-disabled={!ready || checkout.pending} onClick={confirm}>
          {checkout.pending ? 'Confirmando…' : checkout.retryable ? 'Tentar novamente' : 'Confirmar compra'}
        </Button>
      </aside>
    </div>
  )
  return <div className="mx-auto max-w-7xl space-y-6 px-4 py-8"><h1 className="text-2xl font-bold sm:text-3xl">Checkout</h1>{body}</div>
}
