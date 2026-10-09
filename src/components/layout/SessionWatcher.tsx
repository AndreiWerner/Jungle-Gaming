import { useEffect } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useSession } from '@/app/session'

/**
 * Reavalia os guardas de rota sempre que a sessão muda (logout, expiração, troca de usuário).
 * Sem isto, os guardas só rodam em navegações e uma página privada continuaria aberta sem sessão.
 */
export function SessionWatcher() {
  const { session } = useSession()
  const router = useRouter()
  useEffect(() => { void router.invalidate() }, [session, router])
  return null
}
