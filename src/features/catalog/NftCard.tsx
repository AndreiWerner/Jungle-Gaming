import { Link } from '@tanstack/react-router'
import type { NFT } from '@/types'
import { formatEth } from '@/lib/money'
import { FavoriteButton } from '@/features/favorites/FavoriteButton'

export function NftCard({ nft }: { nft: NFT }) {
  const soldOut = nft.available <= 0
  return (
    <li className="relative">
      <Link to="/nft/$id" params={{ id: nft.id }} className="group block overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-brand">
        <div className="relative aspect-square bg-surface-2">
          <img src={nft.images[0]} alt={`Arte do NFT ${nft.name}`} width={400} height={400} loading="lazy" className="h-full w-full object-cover" />
          {soldOut && <span className="absolute left-2 top-2 rounded-full bg-black/80 px-2 py-1 text-xs font-medium">Esgotado</span>}
        </div>
        <div className="space-y-1 p-3">
          <p className="truncate text-xs text-muted">{nft.collection} · {nft.edition}</p>
          <h3 className="truncate font-medium">{nft.name}</h3>
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">{formatEth(nft.price)}</span>
            <span className="text-muted">{soldOut ? 'Indisponível' : `${nft.available} disp.`}</span>
          </div>
        </div>
      </Link>
      <FavoriteButton nftId={nft.id} name={nft.name} variant="icon" className="absolute right-2 top-2 z-10" />
    </li>
  )
}

export function NftCardSkeleton() {
  return (
    <li aria-hidden="true" className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="skeleton aspect-square rounded-none" />
      <div className="space-y-2 p-3">
        <div className="skeleton h-3 w-2/3" /><div className="skeleton h-5 w-4/5" /><div className="skeleton h-4 w-1/2" />
      </div>
    </li>
  )
}
