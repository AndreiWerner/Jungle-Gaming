import { useState, type FormEvent } from 'react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/input'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { useOrders } from '@/features/checkout/queries'
import { OrderStatusBadge } from '@/features/orders/OrderStatusBadge'
import { useProfile, useUpdateProfile } from '@/features/profile/queries'
import { toApiError } from '@/lib/errors'
import { formatEth } from '@/lib/money'
import type { User } from '@/types'

function ProfileData({ user }: { user: User }) {
  const update = useUpdateProfile()
  const [name, setName] = useState(user.name)
  const [saved, setSaved] = useState(false)
  const [touched, setTouched] = useState(false)
  const error = touched && !name.trim() ? 'Informe seu nome.' : undefined

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (!name.trim() || update.isPending) return
    setSaved(false)
    update.mutate(name.trim(), { onSuccess: () => setSaved(true) })
  }
  return (
    <form onSubmit={submit} noValidate className="space-y-4" aria-label="Dados do colecionador">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome" name="name" autoComplete="name" value={name} error={error} onChange={(e) => { setName(e.target.value); setSaved(false) }} />
        <Field label="E-mail" name="email" value={user.email} readOnly aria-describedby="email-note" />
      </div>
      <p id="email-note" className="text-sm text-muted">O e-mail identifica sua conta e não pode ser alterado. Membro desde {new Date(user.createdAt).toLocaleDateString('pt-BR')}.</p>
      {update.error && <p role="alert" className="text-sm text-danger">{toApiError(update.error).message}</p>}
      {saved && <p role="status" className="text-sm text-success">Nome atualizado.</p>}
      <Button type="submit" aria-disabled={update.isPending}>{update.isPending ? 'Salvando…' : 'Salvar nome'}</Button>
    </form>
  )
}

function Orders() {
  const orders = useOrders()
  if (orders.isPending) return <div role="status" aria-busy="true" aria-label="Carregando pedidos" className="space-y-3">{[0, 1].map((i) => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>
  if (orders.isError) return <ErrorState error={orders.error} onRetry={() => void orders.refetch()} />
  if (orders.data.length === 0) return <EmptyState title="Você ainda não fez pedidos"><p>Seus pedidos aparecerão aqui.</p><Link to="/" className="mt-4 inline-block rounded-lg bg-brand px-4 py-2 font-medium text-brand-fg">Explorar NFTs</Link></EmptyState>
  return (
    <ul aria-label="Histórico de pedidos" className="space-y-3">
      {orders.data.map((o) => (
        <li key={o.id}>
          <Link to="/order/$id" params={{ id: o.id }} className="block space-y-2 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-brand">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="break-all font-medium">{o.id}</span>
              <OrderStatusBadge status={o.status} />
            </div>
            <p className="truncate text-sm text-muted">{o.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}</p>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-muted">{new Date(o.createdAt).toLocaleString('pt-BR')}</span>
              <span className="font-semibold">{formatEth(o.total)}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function Profile() {
  const profile = useProfile()
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <h1 className="text-2xl font-bold sm:text-3xl">Perfil</h1>
      <section aria-labelledby="data-title" className="space-y-4 rounded-2xl border border-border bg-surface p-5">
        <h2 id="data-title" className="text-lg font-semibold">Seus dados</h2>
        {profile.isPending ? <div role="status" aria-busy="true" aria-label="Carregando perfil" className="skeleton h-32" />
          : profile.isError ? <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />
          : <ProfileData key={profile.data.id} user={profile.data} />}
      </section>
      <section aria-labelledby="orders-title" className="space-y-4">
        <h2 id="orders-title" className="text-lg font-semibold">Meus pedidos</h2>
        <Orders />
      </section>
    </div>
  )
}
