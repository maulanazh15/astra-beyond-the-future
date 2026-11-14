import { Circle, CircleCheck, CircleDot, CircleX, ListChecks } from 'lucide-react'
import { Panel } from '../../components/common/Panel'
import { phaseLabels, phaseOrder } from '../../engine/simulation'
import type { TelemetrySample } from '../../engine/simulation'
import type { SimulationState } from '../../types/simulation'

type PhaseTimelineProps = {
  state: SimulationState
  history: TelemetrySample[]
}

export function PhaseTimeline({ state, history }: PhaseTimelineProps) {
  const currentIndex = phaseOrder.indexOf(state.phase)
  const enteredDay = (phase: string) => history.find((s) => s.phase === phase)?.day

  return (
    <Panel title="Mission Timeline" icon={ListChecks} className="mb-6">
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
        {phaseOrder.map((phase, index) => {
          const done = index < currentIndex || (phase === 'completion' && state.runStatus === 'completed')
          const active = index === currentIndex && !done
          const lost = active && state.runStatus === 'failed'
          const Icon = lost ? CircleX : done ? CircleCheck : active ? CircleDot : Circle
          const day = enteredDay(phase)
          return (
            <li
              key={phase}
              className={`rounded-lg border px-3 py-2 text-xs ${
                lost
                  ? 'border-rose-500/60 bg-rose-500/10 text-rose-200'
                  : active
                    ? 'border-cyan-400/70 bg-cyan-500/10 text-cyan-200'
                    : done
                      ? 'border-space-700 text-slate-300'
                      : 'border-space-700 text-slate-500'
              }`}
            >
              <span className="flex items-center gap-2">
                <Icon className="size-4 shrink-0" aria-hidden />
                {phaseLabels[phase]}
              </span>
              <span className="mt-0.5 block pl-6 font-mono text-[11px] text-slate-500">
                {day !== undefined ? `Day ${day}` : '—'}
              </span>
              <span className="sr-only">{lost ? '(mission lost)' : done ? '(complete)' : active ? '(active)' : '(pending)'}</span>
            </li>
          )
        })}
      </ol>
    </Panel>
  )
}
