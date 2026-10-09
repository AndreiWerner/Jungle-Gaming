import { useId, useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { cartApi } from '@/services/cart'
import { toApiError } from '@/lib/errors'
import type { Coupon } from '@/types'

interface Props { appliedCode: string | null; applied: Coupon | null; onApply: (code: string) => void; onRemove: () => void }

export function CouponForm({ appliedCode, applied, onApply, onRemove }: Props) {
  const [code, setCode] = useState('')
  const id = useId()
  const validate = useMutation({ mutationFn: (c: string) => cartApi.validateCoupon(c), onSuccess: (coupon) => { onApply(coupon.code); setCode('') } })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const value = code.trim().toUpperCase()
    if (!value || validate.isPending) return
    validate.mutate(value)
  }
  const error = validate.error ? toApiError(validate.error).message : null

  return (
    <div className="space-y-2">
      {appliedCode && (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-surface-2 p-3 text-sm">
          <p>{applied ? <>Cupom <strong>{applied.code}</strong> aplicado ({applied.percent}% de desconto)</> : <>O cupom <strong>{appliedCode}</strong> não é mais válido.</>}</p>
          <Button variant="ghost" className="px-2" onClick={onRemove} aria-label={`Remover cupom ${appliedCode}`}>Remover</Button>
        </div>
      )}
      <form onSubmit={submit} className="space-y-2" noValidate>
        <label htmlFor={id} className="text-sm text-muted">Cupom de desconto</label>
        <div className="flex gap-2">
          <input id={id} value={code} onChange={(e) => { setCode(e.target.value); if (validate.isError) validate.reset() }}
            aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} autoComplete="off"
            className="min-h-10 min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 uppercase" />
          <Button type="submit" variant="secondary" aria-disabled={validate.isPending}>{validate.isPending ? 'Validando…' : 'Aplicar cupom'}</Button>
        </div>
        {error && <p id={`${id}-error`} role="alert" className="text-sm text-danger">{error}</p>}
      </form>
    </div>
  )
}
