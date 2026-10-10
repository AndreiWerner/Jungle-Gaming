import { CircleCheck, CircleX, Loader } from 'lucide-react'
import type { OrderStatus } from '@/types'

const MAP = {
  pending: { label: 'Pendente', icon: Loader, cls: 'text-warning' },
  confirmed: { label: 'Confirmado', icon: CircleCheck, cls: 'text-success' },
  rejected: { label: 'Recusado', icon: CircleX, cls: 'text-danger' },
} as const

/** Estado em texto + ícone (nunca só por cor). */
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { label, icon: Icon, cls } = MAP[status]
  return <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${cls}`}><Icon size={16} aria-hidden />{label}</span>
}
