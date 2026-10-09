import { http } from '@/lib/http'
import type { Session } from '@/types'

export const authApi = {
  login: (email: string, password: string) => http.post<Session>('/auth/login', { email, password }).then((r) => r.data),
  register: (name: string, email: string, password: string) => http.post<Session>('/auth/register', { name, email, password }).then((r) => r.data),
  logout: () => http.post('/auth/logout').then(() => undefined),
  session: () => http.get<Session>('/auth/session').then((r) => r.data),
}
