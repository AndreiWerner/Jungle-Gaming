import { useRef, useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link, useSearch } from '@tanstack/react-router'
import { useSession } from '@/app/session'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/input'
import { AuthCard, FormError } from '@/features/auth/AuthCard'
import { useAuthRedirect } from '@/features/auth/useAuthRedirect'
import { validateRegister, type FieldErrors } from '@/features/auth/validation'
import { toApiError } from '@/lib/errors'

type Key = 'name' | 'email' | 'password'

export function Register() {
  const { redirect } = useSearch({ from: '/register' })
  const { register } = useSession()
  const go = useAuthRedirect(redirect)
  const formRef = useRef<HTMLFormElement>(null)
  const [values, setValues] = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState<FieldErrors<Key>>({})

  const mutation = useMutation({
    mutationFn: () => register(values.name.trim(), values.email.trim(), values.password),
    onSuccess: go, // a API já devolve uma sessão válida; não há etapa extra de login
  })

  const submit = (ev: FormEvent) => {
    ev.preventDefault()
    if (mutation.isPending) return
    const found = validateRegister(values)
    setErrors(found)
    const first = (['name', 'email', 'password'] as const).find((k) => found[k])
    if (first) { formRef.current?.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus(); return }
    mutation.mutate()
  }

  const apiError = mutation.error ? toApiError(mutation.error) : null
  const conflict = apiError?.status === 409
  const generalMessage = apiError && !conflict ? apiError.message : null

  return (
    <AuthCard title="Criar conta" subtitle="Cadastre-se para começar a colecionar."
      footer={<>Já tem conta? <Link to="/login" search={{ redirect }} className="text-brand underline">Entrar</Link></>}>
      <form ref={formRef} onSubmit={submit} noValidate className="space-y-4" aria-busy={mutation.isPending}>
        <FormError message={generalMessage} />
        <Field label="Nome" name="name" autoComplete="name" value={values.name} error={errors.name}
          onChange={(e) => setValues({ ...values, name: e.target.value })} />
        <Field label="E-mail" name="email" type="email" autoComplete="email" value={values.email}
          error={errors.email ?? (conflict ? 'Este e-mail já está cadastrado.' : undefined)}
          onChange={(e) => { setValues({ ...values, email: e.target.value }); if (conflict) mutation.reset() }} />
        <Field label="Senha (mínimo 8 caracteres)" name="password" type="password" autoComplete="new-password" value={values.password} error={errors.password}
          onChange={(e) => setValues({ ...values, password: e.target.value })} />
        <Button type="submit" className="w-full" disabled={mutation.isPending}>{mutation.isPending ? 'Criando conta…' : 'Criar conta'}</Button>
      </form>
    </AuthCard>
  )
}
