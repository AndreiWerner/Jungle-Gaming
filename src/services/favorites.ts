import { http } from '@/lib/http'
export const favoritesApi = {
  list: (signal?: AbortSignal) => http.get<string[]>('/favorites', { signal }).then((r) => r.data),
  add: (id: string) => http.put<string[]>(`/favorites/${id}`).then((r) => r.data),
  remove: (id: string) => http.delete<string[]>(`/favorites/${id}`).then((r) => r.data),
}
