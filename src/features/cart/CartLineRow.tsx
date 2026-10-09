import { Link } from '@tanstack/react-router'
import { Trash2, TriangleAlert } from 'lucide-react'
import type { CartItem, CartLine } from '@/types'
import { Button } from '@/components/ui/button'
import { formatEth, mul } from '@/lib/money'
import { QuantityStepper } from './QuantityStepper'

interface Props {
  item: CartItem
  line: CartLine | undefined // ausente enquanto a cotação desta linha ainda não chegou
  onQuantity: (q: number) => void
  onRemove: () => void
  onAcceptPrice: () => void
  onFitStock: () => void
}

const Warning = ({ children }: { children: React.ReactNode }) => (
  <p className="flex items-start gap-2 text-sm text-warning"><TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden /><span>{children}</span></p>
)

export function CartLineRow({ item, line, onQuantity, onRemove, onAcceptPrice, onFitStock }: Props) {
  if (!line) {
    return <li aria-hidden="true" className="flex gap-4 rounded-xl border border-border bg-surface p-4"><div className="skeleton size-24 shrink-0" /><div className="flex-1 space-y-2"><div className="skeleton h-5 w-2/3" /><div className="skeleton h-4 w-1/3" /><div className="skeleton h-10 w-32" /></div></li>
  }
  const name = line.nft?.name ?? 'NFT indisponível'
  const max = line.nft && line.nft.available > 0 ? line.nft.available : undefined
  return (
    <li className="space-y-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex gap-4">
        {line.nft
          ? <Link to="/nft/$id" params={{ id: line.nft.id }} className="shrink-0"><img src={line.nft.images[0]} alt={`Arte do NFT ${name}`} width={96} height={96} className="size-20 rounded-lg object-cover sm:size-24" /></Link>
          : <div className="size-20 shrink-0 rounded-lg bg-surface-2 sm:size-24" aria-hidden />}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="truncate font-medium">{line.nft ? <Link to="/nft/$id" params={{ id: line.nft.id }} className="hover:underline">{name}</Link> : name}</h2>
              {line.nft && <p className="truncate text-xs text-muted">{line.nft.collection} · {line.nft.edition}</p>}
            </div>
            <Button variant="ghost" className="px-2" aria-label={`Remover ${name} do carrinho`} onClick={onRemove}><Trash2 size={18} aria-hidden /></Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <QuantityStepper value={item.quantity} max={max} name={name} onChange={onQuantity} />
            <p className="text-right text-sm"><span className="text-muted">{formatEth(line.currentPrice)} cada</span><br /><span className="font-semibold">{formatEth(mul(line.currentPrice, item.quantity))}</span></p>
          </div>
        </div>
      </div>
      {line.unavailable && <Warning>Este NFT está esgotado ou indisponível. Remova-o para continuar.</Warning>}
      {line.priceChanged && !line.unavailable && (
        <div className="space-y-2"><Warning>O preço mudou de {formatEth(item.unitPrice)} para {formatEth(line.currentPrice)}.</Warning><Button variant="secondary" onClick={onAcceptPrice}>Aceitar novo preço</Button></div>
      )}
      {line.exceedsStock && line.nft && (
        <div className="space-y-2"><Warning>Apenas {line.nft.available} {line.nft.available === 1 ? 'unidade disponível' : 'unidades disponíveis'}.</Warning><Button variant="secondary" onClick={onFitStock}>Ajustar quantidade</Button></div>
      )}
    </li>
  )
}
