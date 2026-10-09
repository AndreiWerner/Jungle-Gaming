/** Mesmas proporções do conteúdo real, para evitar layout shift. */
export function DetailSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Carregando NFT" className="grid gap-8 md:grid-cols-2">
      <div className="space-y-3">
        <div className="skeleton aspect-square rounded-2xl" />
        <div className="grid grid-cols-4 gap-2 sm:gap-3">{Array.from({ length: 3 }, (_, i) => <div key={i} className="skeleton aspect-square" />)}</div>
      </div>
      <div className="space-y-4">
        <div className="skeleton h-4 w-1/3" /><div className="skeleton h-9 w-4/5" /><div className="skeleton h-4 w-1/4" />
        <div className="skeleton h-20 w-full" /><div className="skeleton h-32 w-full rounded-2xl" />
      </div>
    </div>
  )
}
