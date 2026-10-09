import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import type { NFT } from '@/types'
import { Button } from '@/components/ui/button'
import { QuantityStepper } from './QuantityStepper'
import { quantityOf } from './cartOps'
import { useCartActions } from './queries'

/** Quantidade e botão de compra do detalhe; respeita o estoque já descontando o que está no carrinho. */
export function AddToCart({ nft }: { nft: NFT }) {
  const { cart, ready, add } = useCartActions()
  const [wanted, setWanted] = useState(1)
  const [added, setAdded] = useState(false)

  if (nft.available <= 0) return null // a indisponibilidade já é informada no painel de preço

  const remaining = nft.available - (cart ? quantityOf(cart, nft.id) : 0)
  if (ready && remaining <= 0) {
    return (
      <p role="status" className="text-sm text-muted">
        {added && <span className="text-success">Adicionado ao carrinho. </span>}
        Você já tem todas as unidades disponíveis no carrinho. <Link to="/cart" className="text-brand underline">Ver carrinho</Link>
      </p>
    )
  }
  const quantity = Math.min(wanted, Math.max(remaining, 1))

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <QuantityStepper value={quantity} max={remaining} name={nft.name} onChange={(q) => { setAdded(false); setWanted(q) }} />
        <span className="text-sm text-muted">Máx. {remaining}</span>
      </div>
      <Button className="w-full" aria-disabled={!ready} onClick={() => { if (ready) add(nft, quantity, { onSuccess: () => { setAdded(true); setWanted(1) } }) }}>
        Adicionar ao carrinho
      </Button>
      {added && <p role="status" className="text-sm text-success">Adicionado ao carrinho. <Link to="/cart" className="text-brand underline">Ver carrinho</Link></p>}
    </div>
  )
}
