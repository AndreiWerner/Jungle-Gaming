import { forwardRef, useId, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

interface Props extends InputHTMLAttributes<HTMLInputElement> { label: string; error?: string }

/** Campo com label e mensagem de erro associadas (aria-describedby / aria-invalid). */
export const Field = forwardRef<HTMLInputElement, Props>(function Field({ label, error, className, id, ...props }, ref) {
  const auto = useId()
  const fid = id ?? auto
  const eid = `${fid}-error`
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fid} className="text-sm text-muted">{label}</label>
      <input
        ref={ref} id={fid} aria-invalid={!!error} aria-describedby={error ? eid : undefined}
        className={cn('min-h-10 rounded-lg border bg-surface px-3 text-fg placeholder:text-muted', error ? 'border-danger' : 'border-border', className)}
        {...props}
      />
      {error && <p id={eid} role="alert" className="text-sm text-danger">Erro: {error}</p>}
    </div>
  )
})
