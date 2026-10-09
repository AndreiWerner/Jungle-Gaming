import { useEffect } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useSession } from '@/app/session'

/** Destino pós-autenticação: rota originalmente solicitada ou a home. */
export function useAuthRedirect(redirect: string | undefined) {
  const router = useRouter()
  const { session } = useSession()
  const target = redirect ?? '/'
  const go = () => router.history.replace(target)
  // quem já está autenticado não deve ver login/cadastro
  useEffect(() => { if (session) router.history.replace(target) }, [session, router, target])
  return go
}
