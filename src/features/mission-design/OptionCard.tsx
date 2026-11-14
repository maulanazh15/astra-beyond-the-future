import { CheckCircle2 } from 'lucide-react'

type OptionCardProps = {
  name: string
  description?: string
  selected: boolean
  onSelect: () => void
  specs: { label: string; value: string }[]
}

/** Selectable card used for components, launch vehicles, and orbits. */
export function OptionCard({ name, description, selected, onSelect, specs }: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`w-full rounded-lg border p-4 text-left transition-colors ${
        selected
          ? 'border-cyan-400/70 bg-cyan-500/10'
          : 'border-space-700 bg-space-800/40 hover:border-space-600 hover:bg-space-800'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-slate-100">{name}</span>
        {selected && <CheckCircle2 className="size-4 shrink-0 text-cyan-300" aria-label="Selected" />}
      </div>
      {description && <p className="mt-1 text-xs text-slate-400">{description}</p>}
      <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {specs.map((spec) => (
          <div key={spec.label} className="flex gap-1">
            <dt className="text-slate-500">{spec.label}</dt>
            <dd className="font-mono text-slate-200 tabular-nums">{spec.value}</dd>
          </div>
        ))}
      </dl>
    </button>
  )
}
