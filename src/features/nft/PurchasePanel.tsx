import type { NFT } from '@/types'
import { formatEth } from '@/lib/money'
import { FavoriteButton } from '@/features/favorites/FavoriteButton'
import { AddToCart } from '@/features/cart/AddToCart'

/**
 * Painel de preço e disponibilidade, com a ação de favoritar. Também reúne a compra (carrinho).
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
      <AddToCart nft={nft} />
      <FavoriteButton nftId={nft.id} name={nft.name} variant="full" />
    </section>
  )
}
