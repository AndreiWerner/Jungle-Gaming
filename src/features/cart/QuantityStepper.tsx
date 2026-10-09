import { Minus, Plus } from 'lucide-react'

interface Props { value: number; min?: number; max?: number; name: string; onChange: (value: number) => void }

export function QuantityStepper({ value, min = 1, max, name, onChange }: Props) {
  const btn = 'inline-flex size-10 items-center justify-center rounded-lg hover:bg-surface-2 disabled:opacity-40 disabled:pointer-events-none'
  return (
    <div role="group" aria-label={`Quantidade de ${name}`} className="inline-flex items-center rounded-lg border border-border">
      <button type="button" className={btn} aria-label={`Diminuir quantidade de ${name}`} disabled={value <= min} onClick={() => onChange(value - 1)}><Minus size={16} aria-hidden /></button>
      <output aria-label={`Quantidade de ${name}`} className="min-w-8 text-center font-medium">{value}</output>
      <button type="button" className={btn} aria-label={`Aumentar quantidade de ${name}`} disabled={max !== undefined && value >= max} onClick={() => onChange(value + 1)}><Plus size={16} aria-hidden /></button>
    </div>
  )
}
