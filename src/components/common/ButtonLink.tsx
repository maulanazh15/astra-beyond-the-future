import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost'

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-cyan-500 text-space-950 hover:bg-cyan-400 shadow-md shadow-cyan-500/20 font-semibold',
  secondary:
    'border border-space-600 bg-space-800 text-slate-100 hover:border-cyan-500/60 hover:bg-space-700',
  ghost: 'text-slate-300 hover:bg-space-800 hover:text-white',
}

function buttonClasses(variant: ButtonVariant = 'primary', className = '') {
  return `inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm transition-colors ${variantClasses[variant]} ${className}`
}

type ButtonLinkProps = {
  to: string
  variant?: ButtonVariant
  icon?: LucideIcon
  iconPosition?: 'start' | 'end'
  className?: string
  children: ReactNode
}

export function ButtonLink({
  to,
  variant = 'primary',
  icon: Icon,
  iconPosition = 'start',
  className,
  children,
}: ButtonLinkProps) {
  return (
    <Link to={to} className={buttonClasses(variant, className)}>
      {Icon && iconPosition === 'start' && <Icon className="size-4" aria-hidden />}
      {children}
      {Icon && iconPosition === 'end' && <Icon className="size-4" aria-hidden />}
    </Link>
  )
}
