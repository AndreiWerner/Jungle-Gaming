export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type FieldErrors<K extends string> = Partial<Record<K, string>>

export function validateLogin(v: { email: string; password: string }): FieldErrors<'email' | 'password'> {
  const e: FieldErrors<'email' | 'password'> = {}
  if (!v.email.trim()) e.email = 'Informe seu e-mail.'
  else if (!EMAIL.test(v.email.trim())) e.email = 'Informe um e-mail válido.'
  if (!v.password) e.password = 'Informe sua senha.'
  return e
}

export function validateRegister(v: { name: string; email: string; password: string }): FieldErrors<'name' | 'email' | 'password'> {
  const e: FieldErrors<'name' | 'email' | 'password'> = {}
  if (!v.name.trim()) e.name = 'Informe seu nome.'
  if (!v.email.trim()) e.email = 'Informe seu e-mail.'
  else if (!EMAIL.test(v.email.trim())) e.email = 'Informe um e-mail válido.'
  if (!v.password) e.password = 'Crie uma senha.'
  else if (v.password.length < 8) e.password = 'A senha precisa ter pelo menos 8 caracteres.'
  return e
}
