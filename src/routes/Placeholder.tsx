/** Página provisória: será substituída na fase indicada. */
export function Placeholder({ title, phase }: { title: string; phase: number }) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-muted">Implementação prevista na Fase {phase}.</p>
    </section>
  )
}
