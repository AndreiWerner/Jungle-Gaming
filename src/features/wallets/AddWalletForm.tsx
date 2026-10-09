import { useId, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { toApiError } from '@/lib/errors'
import type { Network, WalletProvider } from '@/types'
import { NETWORKS, NETWORK_LABEL, PROVIDERS, PROVIDER_LABEL } from './labels'
import { useAddWallet } from './queries'

const selectCls = 'min-h-10 w-full rounded-lg border border-border bg-surface px-3 text-fg'

export function AddWalletForm() {
  const [provider, setProvider] = useState<WalletProvider>('metamask')
  const [network, setNetwork] = useState<Network>('ethereum')
  const [added, setAdded] = useState(false)
  const add = useAddWallet()
  const ids = { p: useId(), n: useId() }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (add.isPending) return
    setAdded(false)
    add.mutate({ provider, network }, { onSuccess: () => setAdded(true) })
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border bg-surface p-5" aria-label="Adicionar carteira">
      <h2 className="text-lg font-semibold">Adicionar carteira</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={ids.p} className="mb-1 block text-sm text-muted">Carteira</label>
          <select id={ids.p} className={selectCls} value={provider} onChange={(e) => { setProvider(e.target.value as WalletProvider); setAdded(false) }}>
            {PROVIDERS.map((p) => <option key={p} value={p}>{PROVIDER_LABEL[p]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={ids.n} className="mb-1 block text-sm text-muted">Rede</label>
          <select id={ids.n} className={selectCls} value={network} onChange={(e) => { setNetwork(e.target.value as Network); setAdded(false) }}>
            {NETWORKS.map((n) => <option key={n} value={n}>{NETWORK_LABEL[n]}</option>)}
          </select>
        </div>
      </div>
      {add.error && <p role="alert" className="text-sm text-danger">{toApiError(add.error).message}</p>}
      {added && <p role="status" className="text-sm text-success">Carteira adicionada. Conecte-a para usá-la.</p>}
      <Button type="submit" aria-disabled={add.isPending}>{add.isPending ? 'Adicionando…' : 'Adicionar carteira'}</Button>
    </form>
  )
}
