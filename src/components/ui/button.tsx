import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

const button = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none min-h-10 px-4',
  {
    variants: {
      variant: {
        primary: 'bg-brand text-brand-fg hover:bg-violet-500',
        secondary: 'bg-surface-2 text-fg border border-border hover:bg-border',
        ghost: 'text-fg hover:bg-surface-2',
        danger: 'bg-danger text-black hover:opacity-90',
      },
    },
    defaultVariants: { variant: 'primary' },
  },
)
export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof button>
export function Button({ className, variant, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={cn(button({ variant }), className)} {...props} />
}
