import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { nftsApi, type NftFilters } from '@/services/nfts'

export const catalogKeys = {
  all: ['nfts'] as const,
  list: (f: NftFilters) => ['nfts', 'list', f] as const,
  featured: ['nfts', 'featured'] as const,
  facets: ['nfts', 'facets'] as const,
}

/** `signal` do TanStack Query é repassado ao Axios: consultas obsoletas são abortadas. */
export const nftListOptions = (f: NftFilters) =>
  queryOptions({ queryKey: catalogKeys.list(f), queryFn: ({ signal }) => nftsApi.list(f, signal), placeholderData: keepPreviousData })
export const featuredOptions = () => queryOptions({ queryKey: catalogKeys.featured, queryFn: ({ signal }) => nftsApi.featured(signal) })
export const facetsOptions = () => queryOptions({ queryKey: catalogKeys.facets, queryFn: () => nftsApi.facets(), staleTime: Infinity })
