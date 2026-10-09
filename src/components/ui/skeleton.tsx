import { cn } from '@/lib/cn'
/** Dimensões vêm do className do consumidor para evitar layout shift. */
export const Skeleton = ({ className }: { className?: string }) => <div aria-hidden="true" className={cn('skeleton', className)} />
