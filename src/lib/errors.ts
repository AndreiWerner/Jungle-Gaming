import { isAxiosError } from 'axios'
import type { ApiErrorBody } from '@/types'

export class ApiError extends Error {
  constructor(public status: number, public body: ApiErrorBody) { super(body.message) }
  get code() { return this.body.code }
}

export function toApiError(e: unknown): ApiError {
  if (e instanceof ApiError) return e
  if (isAxiosError(e)) {
    if (e.response) {
      const body = e.response.data as ApiErrorBody | undefined
      return new ApiError(e.response.status, body?.code ? body : { code: 'INTERNAL', message: 'Erro inesperado.' })
    }
    if (e.code === 'ECONNABORTED') return new ApiError(0, { code: 'TIMEOUT', message: 'A requisição demorou demais.' })
    return new ApiError(0, { code: 'INTERNAL', message: 'Sem conexão com o servidor.' })
  }
  return new ApiError(0, { code: 'INTERNAL', message: 'Erro inesperado.' })
}
