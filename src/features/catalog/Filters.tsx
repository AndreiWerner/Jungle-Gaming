import { useEffect, useId, useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import type { CatalogFacets, Category, SortKey } from '@/types'
import type { HomeSearch } from '@/app/router'
import { Button } from '@/components/ui/button'

const CATEGORY_LABEL: Record<Category, string> = { art: 'Arte', music: 'Música', gaming: 'Games', collectibles: 'Colecionáveis', photography: 'Fotografia' }
const SORT_LABEL: Record<SortKey, string> = { recent: 'Mais recentes', 'price-asc': 'Menor preço', 'price-desc': 'Maior preço', name: 'Nome (A–Z)' }

interface Props { value: HomeSearch; facets?: CatalogFacets; onChange: (patch: Partial<HomeSearch>) => void; onClear: () => void }

const selectCls = 'min-h-10 w-full rounded-lg border border-border bg-surface px-3 text-fg'

export function Filters({ value, facets, onChange, onClear }: Props) {
  const [text, setText] = useState(value.search ?? '')
  const [open, setOpen] = useState(false)
  const ids = { search: useId(), cat: useId(), col: useId(), sort: useId() }

  // URL -> campo (voltar/avançar, limpar filtros), ignorando valores que nós mesmos enviamos
  const [seen, setSeen] = useState(value.search)
  const [sent, setSent] = useState(value.search)
  if (seen !== value.search) {
    setSeen(value.search)
    if (value.search !== sent) setText(value.search ?? '')
  }
  // campo -> URL com debounce; reseta a página via onChange
  useEffect(() => {
    const t = text.trim()
    if (t === (value.search ?? '')) return
    const id = setTimeout(() => { setSent(t || undefined); onChange({ search: t || undefined }) }, 350)
    return () => clearTimeout(id)
  }, [text, value.search, onChange])

  const active = [value.search, value.category, value.collection].filter(Boolean).length

  return (
    <form role="search" aria-label="Buscar e filtrar NFTs" onSubmit={(e) => { e.preventDefault(); setSent(text.trim() || undefined); onChange({ search: text.trim() || undefined }) }} className="space-y-3">
      <div className="flex gap-2">
        <div className="flex-1">
          <label htmlFor={ids.search} className="sr-only">Buscar NFTs</label>
          <input id={ids.search} type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Buscar por nome ou coleção"
            className="min-h-10 w-full rounded-lg border border-border bg-surface px-3 text-fg placeholder:text-muted" />
        </div>
        <Button variant="secondary" className="md:hidden" aria-expanded={open} aria-controls="catalog-filters" onClick={() => setOpen((v) => !v)}>
          <SlidersHorizontal size={16} aria-hidden /> Filtros{active ? ` (${active})` : ''}
        </Button>
      </div>
      <div id="catalog-filters" className={`${open ? 'grid' : 'hidden'} grid-cols-1 gap-3 sm:grid-cols-3 md:grid`}>
        <div>
          <label htmlFor={ids.cat} className="mb-1 block text-sm text-muted">Categoria</label>
          <select id={ids.cat} className={selectCls} value={value.category ?? ''} onChange={(e) => onChange({ category: (e.target.value || undefined) as Category | undefined })}>
            <option value="">Todas</option>
            {facets?.categories.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={ids.col} className="mb-1 block text-sm text-muted">Coleção</label>
          <select id={ids.col} className={selectCls} value={value.collection ?? ''} onChange={(e) => onChange({ collection: e.target.value || undefined })}>
            <option value="">Todas</option>
            {facets?.collections.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={ids.sort} className="mb-1 block text-sm text-muted">Ordenar por</label>
          <select id={ids.sort} className={selectCls} value={value.sort ?? 'recent'} onChange={(e) => onChange({ sort: e.target.value === 'recent' ? undefined : (e.target.value as SortKey) })}>
            {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => <option key={k} value={k}>{SORT_LABEL[k]}</option>)}
          </select>
        </div>
      </div>
      {active > 0 && <Button variant="ghost" onClick={onClear} className="px-2">Limpar filtros</Button>}
    </form>
  )
}
