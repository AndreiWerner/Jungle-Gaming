import type { SocketEvent } from '@/types'

export type Verdict = 'ok' | 'duplicate' | 'stale'

export function isSocketEvent(e: unknown): e is SocketEvent {
  if (!e || typeof e !== 'object') return false
  const x = e as Record<string, unknown>
  return (x.type === 'nft.updated' || x.type === 'order.updated') && typeof x.eventId === 'string' && typeof x.resource === 'string'
    && Number.isInteger(x.version) && (x.version as number) >= 1
}

/**
 * Registro de eventos já vistos.
 *  - duplicate: mesmo eventId já processado;
 *  - stale: versão menor ou igual à última aceita para o mesmo recurso.
 * Só eventos 'ok' avançam a versão do recurso.
 */
export class EventLedger {
  private seen = new Set<string>()
  private versions = new Map<string, number>()
  constructor(private maxSeen = 1000) {}

  accept(e: SocketEvent): Verdict {
    if (this.seen.has(e.eventId)) return 'duplicate'
    this.seen.add(e.eventId)
    if (this.seen.size > this.maxSeen) this.seen.delete(this.seen.values().next().value as string)
    if (e.version <= (this.versions.get(e.resource) ?? 0)) return 'stale'
    this.versions.set(e.resource, e.version)
    return 'ok'
  }
}
