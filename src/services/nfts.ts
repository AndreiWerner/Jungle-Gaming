import { http } from '@/lib/http'
import type { CatalogFacets, Category, NFT, Page, SortKey } from '@/types'

export interface NftFilters { search?: string; category?: Category; collection?: string; sort?: SortKey; page?: number }

export const nftsApi = {
  list: (f: NftFilters, signal?: AbortSignal) => http.get<Page<NFT>>('/nfts', { params: f, signal }).then((r) => r.data),
  facets: () => http.get<CatalogFacets>('/nfts/facets').then((r) => r.data),
  featured: (signal?: AbortSignal) => http.get<NFT[]>('/nfts/featured', { signal }).then((r) => r.data),
  detail: (id: string) => http.get<NFT>(`/nfts/${id}`).then((r) => r.data),
}
