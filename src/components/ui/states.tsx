import type { ReactNode } from 'react'
import { Button } from './button'
import { toApiError } from '@/lib/errors'

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div role="status" className="rounded-xl border border-dashed border-border p-10 text-center">
      <p className="font-medium">{title}</p>
      {children && <div className="mt-2 text-sm text-muted">{children}</div>}
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const e = toApiError(error)
  return (
    <div role="alert" className="rounded-xl border border-danger/40 bg-danger/10 p-6 text-center">
      <p className="font-medium">Algo deu errado</p>
      <p className="mt-1 text-sm text-muted">{e.message}</p>
      {onRetry && <Button variant="secondary" className="mt-4" onClick={onRetry}>Tentar novamente</Button>}
    </div>
  )
}
