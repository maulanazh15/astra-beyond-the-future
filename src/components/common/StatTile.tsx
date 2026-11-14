import type { LucideIcon } from 'lucide-react'

type StatTileProps = {
  label: string
  value: string
  hint?: string
  icon?: LucideIcon
  tone?: 'default' | 'warning' | 'critical'
}

const hintTone = {
  default: 'text-slate-400',
  warning: 'text-amber-300',
  critical: 'text-rose-300',
}

export function StatTile({ label, value, hint, icon: Icon, tone = 'default' }: StatTileProps) {
  return (
    <div className="rounded-lg border border-space-700 bg-space-800/60 px-4 py-3">
      <p className="flex items-center gap-1.5 text-[11px] font-medium tracking-[0.16em] text-slate-400 uppercase">
        {Icon && <Icon className="size-3.5 text-cyan-400" aria-hidden />}
        {label}
      </p>
      <p className="mt-1 font-mono text-xl text-white tabular-nums">{value}</p>
      {hint && <p className={`mt-0.5 text-xs ${hintTone[tone]}`}>{hint}</p>}
    </div>
  )
}
