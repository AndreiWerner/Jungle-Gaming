import { Link } from '@tanstack/react-router'
import type { Cart, Quote } from '@/types'
import { Button } from '@/components/ui/button'
import { formatEth, mul } from '@/lib/money'

interface Props { cart: Cart; quote: Quote; onAcceptPrice: (nftId: string, price: string) => void }

export function ReviewLines({ cart, quote, onAcceptPrice }: Props) {
  return (
    <ul aria-label="Itens do pedido" className="space-y-3">
      {cart.items.map((item) => {
        const line = quote.lines.find((l) => l.nftId === item.nftId)
        if (!line) return null
        const name = line.nft?.name ?? 'NFT indisponível'
        return (
          <li key={item.nftId} className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex items-center gap-3">
              {line.nft && <img src={line.nft.images[0]} alt={`Arte do NFT ${name}`} width={56} height={56} className="size-14 rounded-md object-cover" />}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{name}</p>
                <p className="text-sm text-muted">{item.quantity} × {formatEth(line.currentPrice)}</p>
              </div>
              <p className="font-semibold">{formatEth(mul(line.currentPrice, item.quantity))}</p>
            </div>
            {line.unavailable && <p className="text-sm text-warning">Este NFT está esgotado ou indisponível. <Link to="/cart" className="underline">Ajustar no carrinho</Link></p>}
            {line.exceedsStock && line.nft && <p className="text-sm text-warning">Apenas {line.nft.available} em estoque. <Link to="/cart" className="underline">Ajustar no carrinho</Link></p>}
            {line.priceChanged && !line.unavailable && (
              <div className="space-y-2">
                <p className="text-sm text-warning">O preço mudou de {formatEth(item.unitPrice)} para {formatEth(line.currentPrice)}.</p>
                <Button variant="secondary" onClick={() => onAcceptPrice(item.nftId, line.currentPrice)}>Aceitar novo preço</Button>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
