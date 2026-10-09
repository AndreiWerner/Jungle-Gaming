import { http } from '@/lib/http'
export const favoritesApi = {
  list: () => http.get<string[]>('/favorites').then((r) => r.data),
  add: (id: string) => http.put<string[]>(`/favorites/${id}`).then((r) => r.data),
  remove: (id: string) => http.delete<string[]>(`/favorites/${id}`).then((r) => r.data),
}
