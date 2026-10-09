import type { HomeSearch } from '@/app/router'

const KEY = 'nftm:catalog-search'

/** Guarda (por aba) os parâmetros do catálogo para o link "Voltar ao catálogo" do detalhe. */
export function saveLastSearch(search: HomeSearch) {
  try { sessionStorage.setItem(KEY, JSON.stringify(search)) } catch { /* modo privado */ }
}
export function readLastSearch(): HomeSearch {
  try { return (JSON.parse(sessionStorage.getItem(KEY) ?? '{}') as HomeSearch) ?? {} } catch { return {} }
}
