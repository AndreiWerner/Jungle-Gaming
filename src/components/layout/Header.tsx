import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Menu, ShoppingCart, X } from 'lucide-react'
import { useSession } from '@/app/session'
import { Button } from '@/components/ui/button'

const privateLinks = [
  { to: '/profile', label: 'Perfil' },
  { to: '/wallets', label: 'Carteiras' },
] as const

export function Header() {
  const { session, logout } = useSession()
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
        <Link to="/" className="text-lg font-bold" onClick={close}>NFT<span className="text-brand">Market</span></Link>
        <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
          <Link to="/" className="rounded-lg px-3 py-2 text-sm hover:bg-surface-2">Explorar</Link>
          {session && privateLinks.map((l) => <Link key={l.to} to={l.to} className="rounded-lg px-3 py-2 text-sm hover:bg-surface-2">{l.label}</Link>)}
          <Link to="/cart" aria-label="Carrinho" className="rounded-lg p-2 hover:bg-surface-2"><ShoppingCart size={20} aria-hidden /></Link>
          {session
            ? <Button variant="secondary" onClick={() => void logout()}>Sair</Button>
            : <Link to="/login" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium">Entrar</Link>}
        </nav>
        <button className="rounded-lg p-2 hover:bg-surface-2 md:hidden" aria-label={open ? 'Fechar menu' : 'Abrir menu'} aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen((v) => !v)}>
          {open ? <X aria-hidden /> : <Menu aria-hidden />}
        </button>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Principal (mobile)" className="flex flex-col gap-1 border-t border-border p-3 md:hidden">
          <Link to="/" onClick={close} className="rounded-lg px-3 py-3 hover:bg-surface-2">Explorar</Link>
          <Link to="/cart" onClick={close} className="rounded-lg px-3 py-3 hover:bg-surface-2">Carrinho</Link>
          {session && privateLinks.map((l) => <Link key={l.to} to={l.to} onClick={close} className="rounded-lg px-3 py-3 hover:bg-surface-2">{l.label}</Link>)}
          {session
            ? <button className="rounded-lg px-3 py-3 text-left hover:bg-surface-2" onClick={() => { close(); void logout() }}>Sair</button>
            : <Link to="/login" onClick={close} className="rounded-lg px-3 py-3 hover:bg-surface-2">Entrar</Link>}
        </nav>
      )}
    </header>
  )
}
