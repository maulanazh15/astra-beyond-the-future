import { CircleCheck, Info, OctagonAlert, ShieldCheck, TriangleAlert } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Panel } from '../../components/common/Panel'
import { assumptionDescriptions, assumptionDisclaimer } from '../../data'
import type { ValidationResult, ValidationStatus } from '../../types/validation'

const statusStyle: Record<ValidationStatus, { icon: LucideIcon; label: string; color: string }> = {
  valid: { icon: CircleCheck, label: 'Valid', color: 'text-emerald-400' },
  warning: { icon: TriangleAlert, label: 'Warning', color: 'text-amber-400' },
  critical: { icon: OctagonAlert, label: 'Critical', color: 'text-rose-400' },
}

const subsystemLabel: Record<ValidationResult['subsystem'], string> = {
  bus: 'Spacecraft Bus',
  propulsion: 'Propulsion',
  power: 'Power System',
  battery: 'Battery',
  communication: 'Communication',
  payload: 'Scientific Payload',
  landing: 'Landing System',
  thermal: 'Thermal Control',
  robotics: 'Robotic Construction',
  launchVehicle: 'Launch Vehicle',
  trajectory: 'Trajectory',
  mission: 'Mission',
}

const order: Record<ValidationStatus, number> = { critical: 0, warning: 1, valid: 2 }

export function ValidationPanel({ results }: { results: ValidationResult[] }) {
  const sorted = [...results].sort((a, b) => order[a.status] - order[b.status])
  const counts = { valid: 0, warning: 0, critical: 0 }
  for (const r of results) counts[r.status] += 1

  return (
    <Panel
      title="Engineering Validation"
      icon={ShieldCheck}
      action={
        <span className="flex gap-2 font-mono text-[11px] tabular-nums">
          <span className="text-rose-300">{counts.critical} crit</span>
          <span className="text-amber-300">{counts.warning} warn</span>
          <span className="text-emerald-300">{counts.valid} ok</span>
        </span>
      }
    >
      <ul className="space-y-3">
        {sorted.map((result) => {
          const style = statusStyle[result.status]
          return (
            <li key={result.id} className="rounded-lg border border-space-700 bg-space-800/40 p-3">
              <div className="flex items-start gap-2">
                <style.icon className={`mt-px size-4 shrink-0 ${style.color}`} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-baseline justify-between gap-x-2 text-sm text-slate-100">
                    {result.label}
                    <span className={`text-[11px] font-medium ${style.color}`}>{style.label}</span>
                  </p>
                  <p className="text-[11px] text-slate-500">{subsystemLabel[result.subsystem]}</p>
                  <p className="mt-1.5 text-xs text-slate-300">{result.message}</p>
                  {result.suggestion && (
                    <p className="mt-1 text-xs text-cyan-300">→ {result.suggestion}</p>
                  )}
                  {result.assumptions.length > 0 && (
                    <details className="mt-1.5 text-[11px] text-slate-500">
                      <summary className="cursor-pointer select-none hover:text-slate-300">Gameplay assumptions</summary>
                      <ul className="mt-1 list-disc space-y-0.5 pl-4">
                        {result.assumptions.map((key) => (
                          <li key={key}>{assumptionDescriptions[key]}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
      <p className="mt-4 flex gap-2 text-[11px] leading-relaxed text-slate-500">
        <Info className="mt-px size-3.5 shrink-0 text-cyan-400" aria-hidden />
        {assumptionDisclaimer.note}
      </p>
    </Panel>
  )
}
