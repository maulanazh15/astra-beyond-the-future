import {
  ArrowLeft,
  BookOpen,
  CalendarClock,
  ChevronRight,
  Coins,
  ClipboardCheck,
  Gauge,
  Info,
  MapPin,
  ShieldAlert,
  Target,
  Trophy,
} from 'lucide-react'
import { paths } from '../../app/paths'
import { ButtonLink } from '../../components/common/ButtonLink'
import { PageHeader } from '../../components/common/PageHeader'
import { Panel } from '../../components/common/Panel'
import { StatTile } from '../../components/common/StatTile'
import { useMission } from '../../components/layout/useMission'
import { missionDisclaimer } from '../../data'
import { formatDuration, formatMUsd } from '../../utils/format'

export function MissionBriefingPage() {
  const mission = useMission()

  return (
    <>
      <PageHeader
        eyebrow={`Mission Briefing · ${mission.name}`}
        title={mission.subtitle}
        description={mission.description}
        actions={
          <>
            <ButtonLink to={paths.missions} variant="secondary" icon={ArrowLeft}>
              All Missions
            </ButtonLink>
            <ButtonLink to={paths.designer(mission.id)} icon={ChevronRight} iconPosition="end">
              Start Designing
            </ButtonLink>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Destination" value={mission.destination} icon={MapPin} />
        <StatTile label="Budget" value={formatMUsd(mission.budgetMUsd)} icon={Coins} />
        <StatTile label="Duration" value={formatDuration(mission.durationDays)} icon={CalendarClock} />
        <StatTile label="Difficulty" value={mission.difficulty} icon={Gauge} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel title="Mission Background" icon={BookOpen}>
            <p className="leading-relaxed text-slate-300">{mission.background}</p>
          </Panel>
          <Panel title="Scientific Objectives" icon={Target}>
            <ol className="space-y-3">
              {mission.objectives.map((objective, index) => (
                <li
                  key={objective.id}
                  className="flex items-start gap-4 rounded-lg border border-space-700 bg-space-800/50 p-4"
                >
                  <span className="font-mono text-sm text-cyan-400">0{index + 1}</span>
                  <div>
                    <p className="text-slate-100">{objective.label}</p>
                    <p className="mt-0.5 font-mono text-xs text-slate-400">{objective.metric}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
          <Panel title="Design Requirements" icon={ClipboardCheck}>
            <ul className="space-y-2.5 text-sm text-slate-300">
              {mission.requirements.map((requirement) => (
                <li key={requirement.id} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-cyan-400" aria-hidden />
                  {requirement.label}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-slate-500">
              These are checked live in the Mission Designer.
            </p>
          </Panel>
          <p className="flex gap-2 text-xs leading-relaxed text-slate-500">
            <Info className="mt-px size-3.5 shrink-0 text-cyan-400" aria-hidden />
            {missionDisclaimer.note}
          </p>
        </div>

        <div className="space-y-6">
          <Panel title="Engineering Constraints" icon={ShieldAlert}>
            <ul className="space-y-2.5 text-sm text-slate-300">
              {mission.constraints.map((constraint) => (
                <li key={constraint} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-amber-400" aria-hidden />
                  {constraint}
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Success Criteria" icon={Trophy}>
            <ul className="space-y-2.5 text-sm text-slate-300">
              {mission.successCriteria.map((criterion) => (
                <li key={criterion} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-cyan-400" aria-hidden />
                  {criterion}
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="NASA References">
            <ul className="space-y-1.5 text-xs text-slate-400">
              {mission.sources.map((source) => (
                <li key={source}>{source}</li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  )
}
