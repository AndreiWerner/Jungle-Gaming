import type { NFT } from '@/types'
import { formatEth } from '@/lib/money'

/**
 * Painel de preço e disponibilidade. Favoritos e carrinho (Fases 7 e 8) serão acoplados aqui;
 * por ora não há ações, então nenhum botão é exibido.
 */
export function PurchasePanel({ nft }: { nft: NFT }) {
  const soldOut = nft.available <= 0
  return (
    <section aria-label="Preço e disponibilidade" className="space-y-3 rounded-2xl border border-border bg-surface p-5">
      <div>
        <p className="text-sm text-muted">Preço</p>
        <p className="text-3xl font-bold">{formatEth(nft.price)}</p>
      </div>
      <p className={soldOut ? 'font-medium text-danger' : 'text-success'}>
        {soldOut ? 'Esgotado: nenhuma unidade disponível' : `${nft.available} ${nft.available === 1 ? 'unidade disponível' : 'unidades disponíveis'}`}
      </p>
    </section>
  )
}
