import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Button } from './button'

interface Props { open: boolean; title: string; children: ReactNode; confirmLabel: string; pending?: boolean; error?: string | null; onConfirm: () => void; onCancel: () => void }

/** Diálogo modal nativo (<dialog>): prende o foco, fecha com Esc e devolve o foco a quem o abriu. */
export function ConfirmDialog({ open, title, children, confirmLabel, pending, error, onConfirm, onCancel }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog ref={ref} aria-labelledby={titleId} onCancel={(e) => { e.preventDefault(); if (!pending) onCancel() }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-border bg-surface p-6 text-fg backdrop:bg-black/70">
      <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
      <div className="mt-2 text-sm text-muted">{children}</div>
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} aria-disabled={pending}>Cancelar</Button>
        <Button variant="danger" onClick={() => { if (!pending) onConfirm() }} aria-disabled={pending}>{pending ? 'Removendo…' : confirmLabel}</Button>
      </div>
    </dialog>
  )
}
