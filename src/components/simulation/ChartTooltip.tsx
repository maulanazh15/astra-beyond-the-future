type TooltipEntry = {
  name?: string | number
  value?: number | string | readonly (number | string)[]
  color?: string
}

type ChartTooltipProps = {
  active?: boolean
  label?: string | number
  payload?: readonly TooltipEntry[]
  unit: string
}

/** Shared tooltip for Recharts: series swatch carries identity, text stays in ink colors. */
export function ChartTooltip({ active, label, payload, unit }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-space-600 bg-space-950/95 px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-mono text-slate-400">Day {label}</p>
      {payload.map((entry) => (
        <p key={String(entry.name)} className="flex items-center gap-2 text-slate-200">
          <span className="size-2 rounded-full" style={{ backgroundColor: entry.color }} aria-hidden />
          <span className="text-slate-400">{entry.name}</span>
          <span className="ml-auto font-mono tabular-nums">
            {typeof entry.value === 'number' ? entry.value.toLocaleString('en-US') : String(entry.value)} {unit}
          </span>
        </p>
      ))}
    </div>
  )
}
