import {
  Award,
  BarChart3,
  CircleCheck,
  CircleX,
  Home,
  Lightbulb,
  Radar,
  RotateCcw,
  ScrollText,
  Stethoscope,
  Target,
} from 'lucide-react'
import { paths } from '../../app/paths'
import { ButtonLink } from '../../components/common/ButtonLink'
import { PageHeader } from '../../components/common/PageHeader'
import { Panel } from '../../components/common/Panel'
import { ProgressBar } from '../../components/common/ProgressBar'
import { StatTile } from '../../components/common/StatTile'
import { StatusBadge } from '../../components/common/StatusBadge'
import type { BadgeTone } from '../../components/common/StatusBadge'
import { useMission } from '../../components/layout/useMission'
import { scoreMission } from '../../engine/scoring/scoreMission'
import type { MissionResult } from '../../types/simulation'
import { formatMUsd, formatNumber } from '../../utils/format'
import { useMissionSession } from '../mission-session/missionSessionContext'
import { severityLabel, severityTone } from '../mission-control/statusLabels'

const outcomeBadge: Record<MissionResult, { tone: BadgeTone; label: string }> = {
  success: { tone: 'success', label: 'Mission Success' },
  partial: { tone: 'warning', label: 'Partial Success' },
  failure: { tone: 'critical', label: 'Mission Failure' },
}

export function MissionReportPage() {
  const mission = useMission()
  const { run } = useMissionSession()
  const outcome = run?.state.outcome

  const header = (
    <PageHeader
      eyebrow={`Mission Report · ${mission.name}`}
      title="Mission evaluation"
      description="How your design performed across objectives, engineering, science, efficiency, and risk."
      actions={
        <>
          <ButtonLink to={paths.home} variant="secondary" icon={Home}>
            Main Menu
          </ButtonLink>
          <ButtonLink to={paths.designer(mission.id)} icon={RotateCcw}>
            Redesign Mission
          </ButtonLink>
        </>
      }
    />
  )

  if (!run || !outcome) {
    return (
      <>
        {header}
        <Panel>
          <div className="flex flex-col items-center py-12 text-center">
            <Radar className="size-10 text-cyan-400" aria-hidden />
            <h2 className="mt-4 text-xl font-semibold text-white">No completed mission yet</h2>
            <p className="mt-2 max-w-md text-slate-400">
              {run ? 'The mission is still in progress. Finish it in Mission Control to see the report.' : 'Launch your design in Mission Control to generate a report.'}
            </p>
            <ButtonLink to={paths.control(mission.id)} icon={Radar} className="mt-6">
              Go to Mission Control
            </ButtonLink>
          </div>
        </Panel>
      </>
    )
  }

  const { state, setup } = run
  const score = scoreMission(state, setup)
  const badge = outcomeBadge[outcome.result]
  const recommendations = [...new Set(outcome.diagnosis.map((d) => d.recommendation))]
  const objectives = [
    { label: 'Observatory constructed', met: outcome.objectives.constructionComplete, detail: `${Math.round(state.constructionProgress)}% deployed` },
    { label: `${mission.requiredOperationDays} days of operations`, met: outcome.objectives.operationsDaysMet, detail: `${state.operationsDays} days achieved` },
    { label: `${formatNumber(mission.dataReturnTargetGb)} Gb science data returned`, met: outcome.objectives.dataReturnMet, detail: `${formatNumber(Math.round(state.dataTransmitted))} Gb returned` },
  ]

  return (
    <>
      {header}

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Mission Outcome" icon={Award}>
          <div className="flex flex-col items-center py-2 text-center">
            <div className="grid size-28 place-items-center rounded-full border-2 border-cyan-400/60 bg-cyan-500/10">
              <span className="text-5xl font-semibold text-white">{score.rating}</span>
            </div>
            <p className="mt-4 font-mono text-3xl text-white tabular-nums">
              {score.total}
              <span className="text-base text-slate-500"> / 100</span>
            </p>
            <div className="mt-3">
              <StatusBadge tone={badge.tone} label={badge.label} />
            </div>
            <p className="mt-3 text-sm text-slate-400">{outcome.summary}</p>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <StatTile label="Duration" value={`${state.elapsedTime} d`} />
            <StatTile label="Budget left" value={formatMUsd(state.remainingBudget)} />
          </div>
        </Panel>

        <div className="space-y-6 lg:col-span-2">
          <Panel title="Objective Completion" icon={Target}>
            <ul className="space-y-3">
              {objectives.map((o) => (
                <li key={o.label} className="flex items-center gap-3 rounded-lg border border-space-700 bg-space-800/40 px-4 py-3">
                  {o.met ? (
                    <CircleCheck className="size-5 shrink-0 text-emerald-400" aria-label="Met" />
                  ) : (
                    <CircleX className="size-5 shrink-0 text-rose-400" aria-label="Not met" />
                  )}
                  <span className="flex-1 text-sm text-slate-100">{o.label}</span>
                  <span className="font-mono text-xs text-slate-400">{o.detail}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Performance Breakdown" icon={BarChart3}>
            <ul className="space-y-5">
              {score.categories.map((category) => (
                <li key={category.id}>
                  <ProgressBar
                    label={`${category.label} · ${Math.round(category.weight * 100)}%`}
                    mode="target"
                    value={category.score}
                    max={100}
                    valueLabel={`${category.score} / 100`}
                  />
                  <p className="mt-1 text-xs text-slate-500">{category.note}</p>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[11px] text-slate-500">Scores use simplified gameplay weights, not an official evaluation method.</p>
          </Panel>
        </div>

        <Panel title="Failure Diagnosis" icon={Stethoscope}>
          {outcome.diagnosis.length === 0 ? (
            <p className="text-sm text-slate-400">No significant problems detected.</p>
          ) : (
            <ul className="space-y-4">
              {outcome.diagnosis.map((item) => (
                <li key={item.title} className="text-sm">
                  <p className="text-slate-100">{item.title}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{item.cause}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Redesign Recommendations" icon={Lightbulb}>
          {recommendations.length === 0 ? (
            <p className="text-sm text-slate-400">Try a cheaper or lighter design to improve efficiency.</p>
          ) : (
            <ol className="space-y-3 text-sm text-slate-300">
              {recommendations.map((item, index) => (
                <li key={item} className="flex gap-3">
                  <span className="font-mono text-cyan-400">{String(index + 1).padStart(2, '0')}</span>
                  {item}
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel title="Mission Events" icon={ScrollText}>
          {state.eventLog.length === 0 ? (
            <p className="text-sm text-slate-400">No events recorded.</p>
          ) : (
            <ul className="space-y-2.5">
              {state.eventLog.map((event, index) => (
                <li key={`${event.eventId}-${index}`} className="flex items-start gap-2 text-xs">
                  <span className="w-12 shrink-0 font-mono text-slate-500">D+{event.day}</span>
                  <StatusBadge tone={severityTone[event.severity]} label={severityLabel[event.severity]} />
                  <span className="text-slate-300">{event.title}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  )
}
