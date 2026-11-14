import { AlertTriangle, CheckCircle2, Info, Lock, OctagonAlert } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type BadgeTone = 'info' | 'success' | 'warning' | 'critical' | 'neutral'

const toneConfig: Record<BadgeTone, { classes: string; icon: LucideIcon }> = {
  info: { classes: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300', icon: Info },
  success: { classes: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300', icon: CheckCircle2 },
  warning: { classes: 'border-amber-500/40 bg-amber-500/10 text-amber-300', icon: AlertTriangle },
  critical: { classes: 'border-rose-500/40 bg-rose-500/10 text-rose-300', icon: OctagonAlert },
  neutral: { classes: 'border-space-600 bg-space-800 text-slate-400', icon: Lock },
}

type StatusBadgeProps = {
  tone: BadgeTone
  label: string
}

export function StatusBadge({ tone, label }: StatusBadgeProps) {
  const { classes, icon: Icon } = toneConfig[tone]
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${classes}`}
    >
      <Icon className="size-3.5" aria-hidden />
      {label}
    </span>
  )
}
