type ProgressBarProps = {
  label: string
  value: number
  max?: number
  valueLabel?: string
  /**
   * `limit`: staying under max is good (amber above 90%, rose when exceeded).
   * `target`: reaching max is good (amber until the target is met).
   */
  mode?: 'limit' | 'target'
}

function barColor(ratio: number, mode: 'limit' | 'target') {
  if (mode === 'target') return ratio >= 1 ? 'bg-cyan-400' : 'bg-amber-400'
  if (ratio > 1) return 'bg-rose-400'
  if (ratio > 0.9) return 'bg-amber-400'
  return 'bg-cyan-400'
}

export function ProgressBar({ label, value, max = 100, valueLabel, mode = 'limit' }: ProgressBarProps) {
  const ratio = max > 0 ? value / max : 0
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs">
        <span className="text-slate-300">{label}</span>
        <span className="font-mono text-slate-400 tabular-nums">
          {valueLabel ?? `${Math.round(ratio * 100)}%`}
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-space-700"
        role="meter"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={`h-full rounded-full ${barColor(ratio, mode)}`}
          style={{ width: `${Math.max(0, Math.min(ratio, 1)) * 100}%` }}
        />
      </div>
    </div>
  )
}
