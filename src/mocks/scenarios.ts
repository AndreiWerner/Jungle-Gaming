import { HttpResponse, delay } from 'msw'
import type { ApiErrorBody } from '@/types'

/**
 * Cenários via header `x-mock-scenario` (definido por localStorage `nftm:scenario`).
 * Formato: "chave=valor;chave=valor". Valores: status HTTP | timeout | network.
 * Chaves especiais: latency=<ms>. Demais chaves: id da rota (ex.: nfts.list=500).
 * Flags: session-expired, payment-rejected, order-timeout, price-changed, sold-out, empty.
 */
export function parseScenario(request: Request): Record<string, string> {
  const raw = request.headers.get('x-mock-scenario') ?? ''
  return Object.fromEntries(raw.split(';').map((p) => p.trim()).filter(Boolean).map((p) => {
    const [k, v = 'true'] = p.split('=')
    return [k, v]
  }))
}

export const err = (status: number, code: ApiErrorBody['code'], message: string, details?: Record<string, unknown>) =>
  HttpResponse.json({ code, message, details } satisfies ApiErrorBody, { status })

const MESSAGES: Record<number, [ApiErrorBody['code'], string]> = {
  400: ['BAD_REQUEST', 'Requisição inválida.'], 401: ['UNAUTHORIZED', 'Não autenticado.'],
  403: ['FORBIDDEN', 'Acesso negado.'], 404: ['NOT_FOUND', 'Recurso não encontrado.'],
  409: ['CONFLICT', 'Conflito de estado.'], 500: ['INTERNAL', 'Erro interno do servidor.'],
}

/** Aplica latência e falhas forçadas. Retorna uma Response para interromper o handler. */
export async function gate(request: Request, routeId: string): Promise<Response | undefined> {
  const sc = parseScenario(request)
  const base = sc.latency ? Number(sc.latency) : 120
  await delay(Number.isFinite(base) ? base : 120)
  const forced = sc[routeId]
  if (!forced) return undefined
  if (forced === 'network') return HttpResponse.error()
  if (forced === 'timeout') { await delay(15000); return err(500, 'TIMEOUT', 'Tempo esgotado.') }
  const status = Number(forced)
  const [code, message] = MESSAGES[status] ?? MESSAGES[500]
  return err(status, code, message)
}
