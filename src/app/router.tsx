import { createRootRouteWithContext, createRoute, createRouter, Outlet, redirect } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { Header } from '@/components/layout/Header'
import { KEYS, storage } from '@/lib/storage'
import type { Category, Session, SortKey } from '@/types'
import { Home } from '@/routes/Home'
import { NftDetail } from '@/routes/NftDetail'
import { Cart } from '@/routes/Cart'
import { Checkout } from '@/routes/Checkout'
import { Order } from '@/routes/Order'
import { Login } from '@/routes/Login'
import { Register } from '@/routes/Register'
import { Profile } from '@/routes/Profile'
import { Wallets } from '@/routes/Wallets'
import { ErrorState } from '@/components/ui/states'

interface RouterContext { queryClient: QueryClient }

const CATEGORIES: Category[] = ['art', 'music', 'gaming', 'collectibles', 'photography']
const SORTS: SortKey[] = ['recent', 'price-asc', 'price-desc', 'name']

export interface HomeSearch { search?: string; category?: Category; collection?: string; sort?: SortKey; page?: number }

const root = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <>
      <a href="#main" className="sr-only-focusable rounded bg-brand px-3 py-2">Pular para o conteúdo</a>
      <Header />
      <main id="main"><Outlet /></main>
    </>
  ),
  notFoundComponent: () => <div className="mx-auto max-w-3xl px-4 py-16"><ErrorState error={{ message: 'Página não encontrada.' }} /></div>,
})

/** Guarda de rota privada: preserva o destino em `redirect`. */
const requireAuth = ({ location }: { location: { href: string } }) => {
  const s = storage.get<Session>(KEYS.session)
  if (!s || new Date(s.expiresAt) <= new Date()) throw redirect({ to: '/login', search: { redirect: location.href } })
}

const index = createRoute({
  getParentRoute: () => root, path: '/', component: Home,
  validateSearch: (s: Record<string, unknown>): HomeSearch => ({
    search: typeof s.search === 'string' && s.search ? s.search : undefined,
    category: CATEGORIES.includes(s.category as Category) ? (s.category as Category) : undefined,
    collection: typeof s.collection === 'string' && s.collection ? s.collection : undefined,
    sort: SORTS.includes(s.sort as SortKey) ? (s.sort as SortKey) : undefined,
    page: Number(s.page) > 1 ? Math.floor(Number(s.page)) : undefined,
  }),
})
const nft = createRoute({ getParentRoute: () => root, path: '/nft/$id', component: NftDetail })
const cart = createRoute({ getParentRoute: () => root, path: '/cart', component: Cart })
const checkout = createRoute({ getParentRoute: () => root, path: '/checkout', beforeLoad: requireAuth, component: Checkout })
const order = createRoute({ getParentRoute: () => root, path: '/order/$id', beforeLoad: requireAuth, component: Order })
const profile = createRoute({ getParentRoute: () => root, path: '/profile', beforeLoad: requireAuth, component: Profile })
const wallets = createRoute({ getParentRoute: () => root, path: '/wallets', beforeLoad: requireAuth, component: Wallets })
const authSearch = (s: Record<string, unknown>): { redirect?: string } => ({ redirect: typeof s.redirect === 'string' && s.redirect.startsWith('/') ? s.redirect : undefined })
const login = createRoute({ getParentRoute: () => root, path: '/login', validateSearch: authSearch, component: Login })
const register = createRoute({ getParentRoute: () => root, path: '/register', validateSearch: authSearch, component: Register })

const routeTree = root.addChildren([index, nft, cart, checkout, order, profile, wallets, login, register])

export const createAppRouter = (queryClient: QueryClient) =>
  createRouter({ routeTree, context: { queryClient }, defaultPreload: 'intent', scrollRestoration: true })

declare module '@tanstack/react-router' {
  interface Register { router: ReturnType<typeof createAppRouter> }
}
