import { ClipboardList, FileBarChart, Radar, Wrench } from 'lucide-react'
import { NavLink } from 'react-router'
import { paths } from '../../app/paths'

type MissionStepperProps = {
  missionId: string
}

const steps = [
  { label: 'Briefing', icon: ClipboardList, to: paths.briefing },
  { label: 'Designer', icon: Wrench, to: paths.designer },
  { label: 'Mission Control', icon: Radar, to: paths.control },
  { label: 'Report', icon: FileBarChart, to: paths.report },
]

/** Lifecycle navigation shown on every mission screen. */
export function MissionStepper({ missionId }: MissionStepperProps) {
  return (
    <nav aria-label="Mission lifecycle" className="mb-8 overflow-x-auto">
      <ol className="flex min-w-max items-center gap-2">
        {steps.map((step, index) => (
          <li key={step.label} className="flex items-center gap-2">
            {index > 0 && <span className="h-px w-6 bg-space-600" aria-hidden />}
            <NavLink
              to={step.to(missionId)}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                  isActive
                    ? 'border-cyan-400/70 bg-cyan-500/10 text-cyan-200'
                    : 'border-space-700 text-slate-400 hover:border-space-600 hover:text-white'
                }`
              }
            >
              <span className="font-mono text-xs text-slate-500">0{index + 1}</span>
              <step.icon className="size-4" aria-hidden />
              {step.label}
            </NavLink>
          </li>
        ))}
      </ol>
    </nav>
  )
}
