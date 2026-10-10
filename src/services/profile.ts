import { http } from '@/lib/http'
import type { User } from '@/types'

export const profileApi = {
  get: (signal?: AbortSignal) => http.get<User>('/profile', { signal }).then((r) => r.data),
  update: (name: string) => http.patch<User>('/profile', { name }).then((r) => r.data),
}
