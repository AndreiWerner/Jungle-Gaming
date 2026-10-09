import { useRef, useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link, useSearch } from '@tanstack/react-router'
import { useSession } from '@/app/session'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/input'
import { AuthCard, FormError } from '@/features/auth/AuthCard'
import { useAuthRedirect } from '@/features/auth/useAuthRedirect'
import { validateLogin, type FieldErrors } from '@/features/auth/validation'
import { toApiError } from '@/lib/errors'

export function Login() {
  const { redirect } = useSearch({ from: '/login' })
  const { login, expired } = useSession()
  const go = useAuthRedirect(redirect)
  const formRef = useRef<HTMLFormElement>(null)
  const [values, setValues] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState<FieldErrors<'email' | 'password'>>({})

  const mutation = useMutation({
    mutationFn: () => login(values.email.trim(), values.password),
    onSuccess: go,
  })

  const submit = (ev: FormEvent) => {
    ev.preventDefault()
    if (mutation.isPending) return // evita envio duplicado
    const found = validateLogin(values)
    setErrors(found)
    const first = (['email', 'password'] as const).find((k) => found[k])
    if (first) { formRef.current?.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus(); return }
    mutation.mutate()
  }

  const apiError = mutation.error ? toApiError(mutation.error) : null
  const message = apiError && (apiError.status === 401 ? 'E-mail ou senha inválidos.' : apiError.message)

  return (
    <AuthCard title="Entrar" subtitle="Acesse sua conta para favoritar e comprar NFTs."
      footer={<>Ainda não tem conta? <Link to="/register" search={{ redirect }} className="text-brand underline">Criar conta</Link></>}>
      <form ref={formRef} onSubmit={submit} noValidate className="space-y-4" aria-busy={mutation.isPending}>
        {expired && !mutation.isPending && <p role="status" className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">Sua sessão expirou. Entre novamente para continuar.</p>}
        <FormError message={message} />
        <Field label="E-mail" name="email" type="email" autoComplete="email" value={values.email} error={errors.email}
          onChange={(e) => setValues({ ...values, email: e.target.value })} />
        <Field label="Senha" name="password" type="password" autoComplete="current-password" value={values.password} error={errors.password}
          onChange={(e) => setValues({ ...values, password: e.target.value })} />
        <Button type="submit" className="w-full" disabled={mutation.isPending}>{mutation.isPending ? 'Entrando…' : 'Entrar'}</Button>
      </form>
    </AuthCard>
  )
}
