import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { nftDetailOptions } from '@/features/catalog/queries'
import { readLastSearch } from '@/features/catalog/lastSearch'
import { CATEGORY_LABEL } from '@/features/catalog/labels'
import { Gallery } from '@/features/nft/Gallery'
import { PurchasePanel } from '@/features/nft/PurchasePanel'
import { DetailSkeleton } from '@/features/nft/DetailSkeleton'
import { toApiError } from '@/lib/errors'

export function NftDetail() {
  const { id } = useParams({ from: '/nft/$id' })
  const { data: nft, isPending, error, refetch } = useQuery(nftDetailOptions(id))

  useEffect(() => {
    document.title = nft ? `${nft.name} | NFT Marketplace` : 'NFT | NFT Marketplace'
    return () => { document.title = 'NFT Marketplace' }
  }, [nft])

  const notFound = error ? toApiError(error).status === 404 : false

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <Link to="/" search={readLastSearch()} className="inline-flex min-h-10 items-center gap-2 rounded-lg text-sm text-muted hover:text-fg">
        <ArrowLeft size={16} aria-hidden /> Voltar ao catálogo
      </Link>

      {isPending ? <DetailSkeleton />
        : notFound ? <EmptyState title="NFT não encontrado"><p>Este NFT não existe ou foi removido.</p></EmptyState>
        : error ? <ErrorState error={error} onRetry={() => void refetch()} />
        : (
          <article className="grid gap-8 md:grid-cols-2">
            <Gallery key={nft.id} name={nft.name} images={nft.images} />
            <div className="space-y-5">
              <div className="space-y-2">
                <p className="text-sm text-muted">{nft.collection} · Edição {nft.edition} · {CATEGORY_LABEL[nft.category]}</p>
                <h1 className="text-3xl font-bold">{nft.name}</h1>
              </div>
              <p className="leading-relaxed text-muted">{nft.description}</p>
              <PurchasePanel nft={nft} />
            </div>
          </article>
        )}
    </div>
  )
}
