import { Button } from '@/components/ui/button'

export function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
  return (
    <nav aria-label="Paginação" className="flex flex-wrap items-center justify-center gap-2">
      <Button variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>Anterior</Button>
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-2">
          {i > 0 && p - pages[i - 1] > 1 && <span aria-hidden>…</span>}
          <Button variant={p === page ? 'primary' : 'ghost'} aria-current={p === page ? 'page' : undefined} aria-label={`Página ${p}`} onClick={() => onPage(p)}>{p}</Button>
        </span>
      ))}
      <Button variant="secondary" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Próxima</Button>
    </nav>
  )
}
