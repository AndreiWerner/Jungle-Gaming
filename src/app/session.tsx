import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { KEYS, storage } from '@/lib/storage'
import { setSessionExpiredHandler } from '@/lib/http'
import { authApi } from '@/services/auth'
import type { Session } from '@/types'

interface Ctx {
  session: Session | null
  login: (email: string, password: string) => Promise<Session>
  register: (name: string, email: string, password: string) => Promise<Session>
  logout: () => Promise<void>
  /** true quando a sessão foi encerrada por expiração (para exibir aviso no login) */
  expired: boolean
}
const SessionCtx = createContext<Ctx | null>(null)

const readSession = (): Session | null => {
  const s = storage.get<Session>(KEYS.session)
  return s && new Date(s.expiresAt) > new Date() ? s : null
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [session, setSession] = useState<Session | null>(readSession)
  const [expired, setExpired] = useState(false)

  /** Troca/encerra usuário: persiste e limpa TODO o cache privado. */
  const apply = useCallback((next: Session | null) => {
    if (next) storage.set(KEYS.session, next); else storage.remove(KEYS.session)
    qc.clear()
    setSession(next)
  }, [qc])

  useEffect(() => {
    setSessionExpiredHandler(() => { setExpired(true); apply(null) })
    return () => setSessionExpiredHandler(null)
  }, [apply])

  const value = useMemo<Ctx>(() => ({
    session, expired,
    login: async (e, p) => { const s = await authApi.login(e, p); setExpired(false); apply(s); return s },
    register: async (n, e, p) => { const s = await authApi.register(n, e, p); setExpired(false); apply(s); return s },
    logout: async () => { try { await authApi.logout() } finally { apply(null) } },
  }), [session, expired, apply])

  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>
}

export function useSession() {
  const ctx = useContext(SessionCtx)
  if (!ctx) throw new Error('useSession fora do SessionProvider')
  return ctx
}
