import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

type PanelProps = {
  title?: string
  icon?: LucideIcon
  action?: ReactNode
  className?: string
  children: ReactNode
}

export function Panel({ title, icon: Icon, action, className = '', children }: PanelProps) {
  return (
    <section
      className={`rounded-xl border border-space-700 bg-space-900/80 shadow-lg shadow-black/20 backdrop-blur ${className}`}
    >
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-space-700 px-5 py-3">
          <h2 className="flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-slate-300 uppercase">
            {Icon && <Icon className="size-4 text-cyan-400" aria-hidden />}
            {title}
          </h2>
          {action}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  )
}
