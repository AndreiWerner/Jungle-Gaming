import { useState } from 'react'
import { cn } from '@/lib/cn'

/** Galeria baseada em `nft.images`. Com uma única imagem, não exibe miniaturas. */
export function Gallery({ name, images }: { name: string; images: string[] }) {
  const [index, setIndex] = useState(0)
  const current = images[index] ?? images[0]
  return (
    <div className="space-y-3">
      <div className="aspect-square overflow-hidden rounded-2xl border border-border bg-surface-2">
        <img src={current} alt={`${name} — imagem ${index + 1} de ${images.length}`} width={800} height={800} className="h-full w-full object-cover" />
      </div>
      {images.length > 1 && (
        <ul aria-label="Imagens do NFT" className="grid grid-cols-4 gap-2 sm:gap-3">
          {images.map((src, i) => (
            <li key={src}>
              <button type="button" onClick={() => setIndex(i)} aria-pressed={i === index} aria-label={`Mostrar imagem ${i + 1} de ${images.length}`}
                className={cn('block aspect-square w-full overflow-hidden rounded-lg border-2 bg-surface-2', i === index ? 'border-brand' : 'border-border hover:border-muted')}>
                <img src={src} alt="" width={200} height={200} className="h-full w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
