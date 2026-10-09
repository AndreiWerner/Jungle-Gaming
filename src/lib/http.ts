import axios from 'axios'
import { KEYS, storage } from './storage'
import { toApiError } from './errors'
import type { Session } from '@/types'

/** Cliente HTTP único: anexa token/cenário e traduz erros em ApiError. */
export const http = axios.create({ baseURL: '/api', timeout: 8000 })

let onSessionExpired: (() => void) | null = null
export const setSessionExpiredHandler = (fn: (() => void) | null) => { onSessionExpired = fn }

http.interceptors.request.use((config) => {
  const session = storage.get<Session>(KEYS.session)
  if (session?.token) config.headers.Authorization = `Bearer ${session.token}`
  const scenario = storage.get<string>(KEYS.scenario)
  if (scenario) config.headers['x-mock-scenario'] = scenario
  return config
})

http.interceptors.response.use(
  (r) => r,
  (error) => {
    const err = toApiError(error)
    if (err.status === 401 && err.code === 'SESSION_EXPIRED') onSessionExpired?.()
    return Promise.reject(err)
  },
)
