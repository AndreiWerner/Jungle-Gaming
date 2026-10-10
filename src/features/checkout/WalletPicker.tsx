import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import type { Wallet } from '@/types'
import { Button } from '@/components/ui/button'
import { toApiError } from '@/lib/errors'
import { NETWORK_LABEL, PROVIDER_LABEL, shortAddress } from '@/features/wallets/labels'
import { useWalletConnection, useWallets } from '@/features/wallets/queries'

interface Props { selectedId: string | null; onSelect: (id: string) => void }

export function WalletPicker({ selectedId, onSelect }: Props) {
  const wallets = useWallets()
  const connect = useWalletConnection('connect')
  const disconnect = useWalletConnection('disconnect')
  const [touched, setTouched] = useState(false)
  const busy = connect.isPending || disconnect.isPending
  const error = connect.error ?? disconnect.error

  if (wallets.isPending) return <div role="status" aria-busy="true" aria-label="Carregando carteiras" className="skeleton h-20" />
  if (wallets.isError) return <p role="alert" className="text-sm text-danger">{toApiError(wallets.error).message} <Button variant="ghost" onClick={() => void wallets.refetch()}>Tentar novamente</Button></p>
  const list = wallets.data
  if (list.length === 0) return <p className="text-sm text-muted">Você ainda não tem carteiras. <Link to="/wallets" className="text-brand underline">Adicionar carteira</Link></p>

  const selected: Wallet | undefined = list.find((w) => w.id === selectedId)
  return (
    <div className="space-y-3">
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm text-muted">Carteira e rede de pagamento</legend>
        {list.map((w) => (
          <label key={w.id} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${w.id === selectedId ? 'border-brand bg-surface-2' : 'border-border'}`}>
            <input type="radio" name="wallet" value={w.id} checked={w.id === selectedId} onChange={() => { onSelect(w.id); setTouched(true); connect.reset(); disconnect.reset() }} />
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{PROVIDER_LABEL[w.provider]} · {NETWORK_LABEL[w.network]}</span>
              <span className="block text-sm text-muted">{shortAddress(w.address)} · {w.connected ? 'Conectada' : 'Desconectada'}</span>
            </span>
          </label>
        ))}
      </fieldset>
      {selected && (
        <div className="flex flex-wrap items-center gap-2">
          <Button variant={selected.connected ? 'secondary' : 'primary'} aria-disabled={busy}
            onClick={() => { if (busy) return; connect.reset(); disconnect.reset(); if (selected.connected) disconnect.mutate(selected.id); else connect.mutate(selected.id) }}>
            {connect.isPending ? 'Conectando…' : selected.connected ? 'Desconectar carteira' : 'Conectar carteira'}
          </Button>
          <Link to="/wallets" className="text-sm text-brand underline">Gerenciar carteiras</Link>
        </div>
      )}
      {!selected && touched && <p className="text-sm text-muted">Selecione uma carteira.</p>}
      {error && <p role="alert" className="text-sm text-danger">{toApiError(error).message}</p>}
    </div>
  )
}
