import type { Quote } from '@/types'
import { formatEth } from '@/lib/money'

export function CartSummary({ quote, stale }: { quote: Quote; stale: boolean }) {
  const row = 'flex justify-between gap-4'
  return (
    <div aria-busy={stale} className={stale ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
      <dl className="space-y-2 text-sm">
        <div className={row}><dt className="text-muted">Subtotal</dt><dd>{formatEth(quote.subtotal)}</dd></div>
        {quote.coupon && quote.discount !== '0' && <div className={row}><dt className="text-muted">Desconto ({quote.coupon.code})</dt><dd>−{formatEth(quote.discount)}</dd></div>}
        <div className={row}><dt className="text-muted">Taxa de rede</dt><dd>{formatEth(quote.networkFee)}</dd></div>
        <div className={`${row} border-t border-border pt-3 text-base font-semibold`}><dt>Total</dt><dd>{formatEth(quote.total)}</dd></div>
      </dl>
      {quote.hasIssues && <p className="mt-4 text-sm text-warning">Resolva os avisos nos itens do carrinho para ter o total final.</p>}
    </div>
  )
}
