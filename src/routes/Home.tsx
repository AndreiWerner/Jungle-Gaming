import { useCallback, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import type { HomeSearch } from '@/app/router'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { Button } from '@/components/ui/button'
import { facetsOptions, featuredOptions, nftListOptions } from '@/features/catalog/queries'
import { Filters } from '@/features/catalog/Filters'
import { NftCard, NftCardSkeleton } from '@/features/catalog/NftCard'
import { Pagination } from '@/features/catalog/Pagination'
import { saveLastSearch } from '@/features/catalog/lastSearch'

export function Home() {
  const search = useSearch({ from: '/' }) as HomeSearch
  const navigate = useNavigate({ from: '/' })
  const filters = { search: search.search, category: search.category, collection: search.collection, sort: search.sort, page: search.page ?? 1 }

  useEffect(() => { saveLastSearch(search) }, [search])

  const list = useQuery(nftListOptions(filters))
  const facets = useQuery(facetsOptions())
  const featured = useQuery(featuredOptions())

  /** Qualquer mudança de filtro/busca/ordenação volta para a página 1. */
  const change = useCallback((patch: Partial<HomeSearch>) => {
    void navigate({ search: (prev) => ({ ...prev, ...patch, page: undefined }) })
  }, [navigate])
  const goToPage = (page: number) => void navigate({ search: (prev) => ({ ...prev, page: page > 1 ? page : undefined }) })
  const clear = () => void navigate({ search: {} })

  // Página inválida (ex.: ?page=99): corrige para a última existente.
  const data = list.data
  useEffect(() => {
    if (data && data.page > data.totalPages) void navigate({ search: (prev) => ({ ...prev, page: data.totalPages > 1 ? data.totalPages : undefined }), replace: true })
  }, [data, navigate])

  const hasFilters = !!(search.search || search.category || search.collection)
  const showFeatured = !hasFilters && !search.page && featured.data?.length

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      <h1 className="text-2xl font-bold sm:text-3xl">Explorar NFTs</h1>

      {showFeatured ? (
        <section aria-labelledby="featured-title" className="space-y-3">
          <h2 id="featured-title" className="text-lg font-semibold">Em destaque</h2>
          <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">{featured.data!.map((n) => <NftCard key={n.id} nft={n} />)}</ul>
        </section>
      ) : featured.isPending && !hasFilters && !search.page ? (
        // reserva o espaço dos destaques enquanto carregam: evita deslocar o catálogo (layout shift)
        <section aria-busy="true" aria-label="Carregando destaques" className="space-y-3">
          <h2 className="text-lg font-semibold">Em destaque</h2>
          <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <NftCardSkeleton key={i} />)}</ul>
        </section>
      ) : null}

      <section aria-labelledby="catalog-title" className="space-y-4">
        <h2 id="catalog-title" className="sr-only">Catálogo</h2>
        <Filters value={search} facets={facets.data} onChange={change} onClear={clear} />

        <p className="min-h-5 text-sm text-muted" aria-live="polite">
          {data && !list.isError ? `${data.total} ${data.total === 1 ? 'resultado' : 'resultados'}` : ''}
          {list.isFetching && data ? ' · atualizando…' : ''}
        </p>

        {list.isPending ? (
          <ul aria-busy="true" aria-label="Carregando NFTs" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => <NftCardSkeleton key={i} />)}
          </ul>
        ) : list.isError ? (
          <ErrorState error={list.error} onRetry={() => void list.refetch()} />
        ) : !data ? null : data.items.length === 0 && data.total === 0 ? (
          <EmptyState title={hasFilters ? 'Nenhum NFT encontrado' : 'O catálogo está vazio'}>
            {hasFilters ? <><p>Tente outros termos ou remova filtros.</p><Button variant="secondary" className="mt-4" onClick={clear}>Limpar filtros</Button></> : <p>Volte mais tarde.</p>}
          </EmptyState>
        ) : (
          <>
            <ul className={`grid grid-cols-2 gap-4 transition-opacity lg:grid-cols-4 ${list.isPlaceholderData ? 'opacity-60' : ''}`}>
              {data.items.map((n) => <NftCard key={n.id} nft={n} />)}
            </ul>
            <Pagination page={data.page} totalPages={data.totalPages} onPage={goToPage} />
          </>
        )}
      </section>
    </div>
  )
}
