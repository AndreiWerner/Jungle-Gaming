import { X } from 'lucide-react'
import { dismiss, useNotices } from '@/lib/notify'

export function Toaster() {
  const notices = useNotices()
  return (
    <div role="region" aria-label="Notificações" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
      {notices.map((n) => (
        <div key={n.id} role="alert" className="pointer-events-auto flex max-w-md items-start gap-3 rounded-lg border border-danger/50 bg-surface px-4 py-3 text-sm shadow-lg">
          <p>{n.message}</p>
          <button type="button" aria-label="Fechar notificação" onClick={() => dismiss(n.id)} className="rounded p-0.5 hover:bg-surface-2"><X size={16} aria-hidden /></button>
        </div>
      ))}
    </div>
  )
}
