import { CircleCheck, CircleOff, Wallet as WalletIcon } from 'lucide-react'
import type { Wallet } from '@/types'
import { Button } from '@/components/ui/button'
import { toApiError } from '@/lib/errors'
import { NETWORK_LABEL, PROVIDER_LABEL, shortAddress } from './labels'
import { useWalletConnection } from './queries'

export function WalletCard({ wallet, onRemove }: { wallet: Wallet; onRemove: () => void }) {
  const connect = useWalletConnection('connect')
  const disconnect = useWalletConnection('disconnect')
  const connecting = connect.isPending
  const busy = connecting || disconnect.isPending
  const error = connect.error ?? disconnect.error
  const label = `${PROVIDER_LABEL[wallet.provider]} ${NETWORK_LABEL[wallet.network]}`

  const act = () => {
    if (busy) return
    connect.reset(); disconnect.reset()
    if (wallet.connected) disconnect.mutate(wallet.id); else connect.mutate(wallet.id)
  }

  return (
    <li aria-busy={busy} className="space-y-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-2"><WalletIcon size={20} aria-hidden /></span>
          <div className="min-w-0">
            <h3 className="font-medium">{PROVIDER_LABEL[wallet.provider]}</h3>
            <p className="text-sm text-muted">{NETWORK_LABEL[wallet.network]} · <span title={wallet.address}>{shortAddress(wallet.address)}</span></p>
          </div>
        </div>
        <p className={`flex shrink-0 items-center gap-1.5 text-sm font-medium ${wallet.connected ? 'text-success' : 'text-muted'}`}>
          {wallet.connected ? <CircleCheck size={16} aria-hidden /> : <CircleOff size={16} aria-hidden />}
          {connecting ? 'Conectando…' : wallet.connected ? 'Conectada' : 'Desconectada'}
        </p>
      </div>
      {error && <p role="alert" className="text-sm text-danger">{toApiError(error).message}</p>}
      <div className="flex flex-wrap gap-2">
        <Button variant={wallet.connected ? 'secondary' : 'primary'} aria-disabled={busy} aria-label={`${wallet.connected ? 'Desconectar' : 'Conectar'} ${label}`} onClick={act}>
          {wallet.connected ? 'Desconectar' : 'Conectar'}
        </Button>
        <Button variant="ghost" aria-disabled={busy} aria-label={`Remover ${label}`} onClick={() => { if (!busy) onRemove() }}>Remover</Button>
      </div>
    </li>
  )
}
