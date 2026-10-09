import { useSyncExternalStore } from 'react'

export interface Notice { id: number; message: string }

let notices: Notice[] = []
let seq = 0
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }

export function dismiss(id: number) { notices = notices.filter((n) => n.id !== id); emit() }
/** Mensagem curta e acessível (role="alert"), descartada sozinha após 6 s. */
export function notify(message: string) {
  const id = ++seq
  notices = [...notices, { id, message }]
  emit()
  setTimeout(() => dismiss(id), 6000)
}
export const useNotices = () => useSyncExternalStore(subscribe, () => notices)
