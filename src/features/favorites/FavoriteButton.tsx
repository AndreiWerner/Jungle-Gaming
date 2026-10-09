import { useRouter } from '@tanstack/react-router'
import { Heart } from 'lucide-react'
import { useSession } from '@/app/session'
import { cn } from '@/lib/cn'
import { useFavoriteIds, useToggleFavorite } from './queries'

interface Props { nftId: string; name: string; variant: 'icon' | 'full'; className?: string }

export function FavoriteButton({ nftId, name, variant, className }: Props) {
  const { session } = useSession()
  const router = useRouter()
  const ids = useFavoriteIds()
  const toggle = useToggleFavorite()

  const favorite = !!ids.data?.includes(nftId)
  // sem sessão o botão fica ativo (leva ao login); com sessão, aguarda a lista carregar
  const busy = toggle.isPending || (!!session && !ids.data)
  const verb = favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'

  const onClick = () => {
    if (!session) {
      // ação privada: exige autenticação e volta para esta página depois
      void router.navigate({ to: '/login', search: { redirect: router.state.location.href } })
      return
    }
    if (busy) return
    toggle.mutate({ nftId, favorite: !favorite })
  }

  return (
    <button
      type="button"
      onClick={onClick}
      // aria-disabled (e não disabled) mantém o foco do teclado durante a requisição
      aria-disabled={busy}
      aria-label={`${verb}: ${name}`}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors aria-disabled:opacity-60',
        variant === 'icon'
          ? 'size-10 bg-black/60 text-white hover:bg-black/80'
          : 'min-h-10 w-full border border-border bg-surface-2 px-4 hover:bg-border',
        favorite && variant === 'full' && 'border-brand',
        className,
      )}
    >
      <Heart size={18} aria-hidden fill={favorite ? 'currentColor' : 'none'} className={favorite ? 'text-brand' : undefined} />
      {variant === 'full' && <span aria-hidden>{verb}</span>}
    </button>
  )
}
