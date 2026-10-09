import type { ReactNode } from 'react'

export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer: ReactNode }) {
  return (
    <section className="mx-auto w-full max-w-md px-4 py-10 sm:py-16">
      <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
      <p className="mt-4 text-center text-sm text-muted">{footer}</p>
    </section>
  )
}

/** Mensagem de erro geral do formulário (não ligada a um campo). */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm">{message}</p>
}
