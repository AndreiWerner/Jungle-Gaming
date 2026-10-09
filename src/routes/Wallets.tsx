import { useState } from 'react'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { AddWalletForm } from '@/features/wallets/AddWalletForm'
import { WalletCard } from '@/features/wallets/WalletCard'
import { NETWORK_LABEL, PROVIDER_LABEL } from '@/features/wallets/labels'
import { useRemoveWallet, useWallets } from '@/features/wallets/queries'
import { toApiError } from '@/lib/errors'
import type { Wallet } from '@/types'

export function Wallets() {
  const wallets = useWallets()
  const remove = useRemoveWallet()
  const [toRemove, setToRemove] = useState<Wallet | null>(null)

  const close = () => { setToRemove(null); remove.reset() }
  const confirm = () => { if (toRemove) remove.mutate(toRemove.id, { onSuccess: close }) }

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl">Carteiras</h1>
        <p className="text-sm text-muted">Carteiras simuladas para esta demonstração: nenhuma conexão real com blockchain é feita.</p>
      </div>

      <section aria-labelledby="wallets-title" className="space-y-4">
        <h2 id="wallets-title" className="text-lg font-semibold">Suas carteiras</h2>
        {wallets.isPending ? (
          <div role="status" aria-busy="true" aria-label="Carregando carteiras" className="space-y-3">
            {[0, 1].map((i) => <div key={i} className="skeleton h-28 rounded-xl" />)}
          </div>
        ) : wallets.isError ? (
          <ErrorState error={wallets.error} onRetry={() => void wallets.refetch()} />
        ) : wallets.data.length === 0 ? (
          <EmptyState title="Nenhuma carteira cadastrada"><p>Adicione uma carteira abaixo para poder pagar no checkout.</p></EmptyState>
        ) : (
          <ul aria-label="Carteiras cadastradas" className="grid gap-3 sm:grid-cols-2">
            {wallets.data.map((w) => <WalletCard key={w.id} wallet={w} onRemove={() => setToRemove(w)} />)}
          </ul>
        )}
      </section>

      <AddWalletForm />

      <ConfirmDialog open={!!toRemove} title="Remover carteira?" confirmLabel="Remover carteira" pending={remove.isPending}
        error={remove.error ? toApiError(remove.error).message : null} onConfirm={confirm} onCancel={close}>
        {toRemove && <p>{PROVIDER_LABEL[toRemove.provider]} ({NETWORK_LABEL[toRemove.network]}) será removida da sua conta.</p>}
      </ConfirmDialog>
    </div>
  )
}
