import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'

const variantClass: Record<Variant, string> = {
  primary:
    'min-h-touch rounded-xl bg-[var(--color-primary)] px-4 py-3 text-[17px] font-semibold text-white hover:bg-[var(--color-primary-hover)] active:opacity-95 disabled:opacity-50',
  secondary:
    'min-h-touch rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-[17px] font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-primary-light)]',
  ghost: 'min-h-touch rounded-lg px-3 py-2 text-[16px] text-[var(--color-primary)] hover:underline',
}

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  children: ReactNode
}) {
  return (
    <button type="button" className={`${variantClass[variant]} ${className}`} {...rest}>
      {children}
    </button>
  )
}
