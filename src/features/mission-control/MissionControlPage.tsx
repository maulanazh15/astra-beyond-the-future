import {
  Activity,
  ArrowLeft,
  BatteryMedium,
  Coins,
  Database,
  FileBarChart,
  Flame,
  HardDriveDownload,
  Radio,
  Rocket,
  ScrollText,
  ShieldAlert,
  Telescope,
  TrendingUp,
  Wrench,
} from 'lucide-react'
import { paths } from '../../app/paths'
import { ButtonLink } from '../../components/common/ButtonLink'
import { PageHeader } from '../../components/common/PageHeader'
import { Panel } from '../../components/common/Panel'
import { ProgressBar } from '../../components/common/ProgressBar'
import { StatTile } from '../../components/common/StatTile'
import { StatusBadge } from '../../components/common/StatusBadge'
import { useMission } from '../../components/layout/useMission'
import { chartTheme } from '../../components/simulation/chartTheme'
import { TimeSeriesChart } from '../../components/simulation/TimeSeriesChart'
import { simulationDisclaimer } from '../../data'
import { activeConditions, batteryCapacityWh, phaseLabels } from '../../engine/simulation'
import type { Mission } from '../../types/mission'
import { formatMUsd, formatNumber } from '../../utils/format'
import { useSpacecraftDesign } from '../mission-design/useSpacecraftDesign'
import { useMissionSession } from '../mission-session/missionSessionContext'
import type { MissionSession, SimulationRun } from '../mission-session/missionSessionContext'
import { EventToasts } from './EventToasts'
import { PhaseTimeline } from './PhaseTimeline'
import { SimulationControls } from './SimulationControls'
import { communicationBadge, instrumentBadge, severityLabel, severityTone } from './statusLabels'

export function MissionControlPage() {
  const mission = useMission()
  const session = useMissionSession()
  const { run } = session
  const finished = run && (run.state.runStatus === 'completed' || run.state.runStatus === 'failed')

  return (
    <>
      <PageHeader
        eyebrow={`Mission Control · ${mission.name}`}
        title="Mission operations"
        description="Launch your design and monitor the mission day by day."
        actions={
          <>
            <ButtonLink to={paths.designer(mission.id)} variant="secondary" icon={ArrowLeft}>
              Designer
            </ButtonLink>
            <ButtonLink to={paths.report(mission.id)} variant={finished ? 'primary' : 'secondary'} icon={FileBarChart}>
              Mission Report
            </ButtonLink>
          </>
        }
      />
      {run ? <LiveMission mission={mission} run={run} session={session} /> : <PreLaunch mission={mission} session={session} />}
    </>
  )
}

function PreLaunch({ mission, session }: { mission: Mission; session: MissionSession }) {
  const design = useSpacecraftDesign(mission)
  const critical = design.validation.filter((v) => v.status === 'critical')
  const warnings = design.validation.filter((v) => v.status === 'warning').length

  if (session.entries.length === 0) {
    return (
      <Panel>
        <div className="flex flex-col items-center py-12 text-center">
          <Wrench className="size-10 text-cyan-400" aria-hidden />
          <h2 className="mt-4 text-xl font-semibold text-white">No spacecraft designed yet</h2>
          <p className="mt-2 max-w-md text-slate-400">Build your spacecraft in the Mission Designer before launch.</p>
          <ButtonLink to={paths.designer(mission.id)} icon={Wrench} className="mt-6">
            Open Mission Designer
          </ButtonLink>
        </div>
      </Panel>
    )
  }

  return (
    <Panel title="Launch Readiness" icon={Rocket}>
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div className="grid flex-1 grid-cols-2 gap-4 md:grid-cols-4">
          <StatTile label="Components" value={String(design.summary.unitCount)} />
          <StatTile label="Dry mass" value={`${formatNumber(design.summary.massKg)} kg`} />
          <StatTile label="Launch vehicle" value={design.launchVehicle?.name ?? '—'} />
          <StatTile
            label="Validation"
            value={`${critical.length} critical`}
            hint={`${warnings} warnings`}
            tone={critical.length > 0 ? 'critical' : warnings > 0 ? 'warning' : 'default'}
          />
        </div>
        <button
          type="button"
          onClick={session.launch}
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-6 py-3 font-semibold text-space-950 shadow-md shadow-cyan-500/20 transition-colors hover:bg-cyan-400"
        >
          <Rocket className="size-5" aria-hidden />
          Launch Mission
        </button>
      </div>
      {critical.length > 0 && (
        <div className="mt-5 rounded-lg border border-rose-500/30 bg-rose-500/5 p-4 text-sm">
          <p className="flex items-center gap-2 text-rose-200">
            <ShieldAlert className="size-4" aria-hidden />
            Critical issues found. You can still launch, but the mission may fail.
          </p>
          <ul className="mt-2 list-disc space-y-0.5 pl-6 text-xs text-slate-400">
            {critical.map((c) => (
              <li key={c.id}>{c.message}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-5 text-xs text-slate-500">{simulationDisclaimer.note}</p>
    </Panel>
  )
}

function LiveMission({ mission, run, session }: { mission: Mission; run: SimulationRun; session: MissionSession }) {
  const { state, setup, history } = run
  const capacityWh = batteryCapacityWh(state, setup)
  const conditions = activeConditions(state, setup)
  const comm = communicationBadge[state.communicationStatus]
  const instrument = instrumentBadge[state.instrumentStatus]
  const outcome = state.outcome

  return (
    <>
      <SimulationControls run={run} session={session} />

      {outcome && (
        <div
          className={`mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border px-5 py-4 ${
            outcome.result === 'success'
              ? 'border-emerald-500/40 bg-emerald-500/5'
              : outcome.result === 'partial'
                ? 'border-amber-500/40 bg-amber-500/5'
                : 'border-rose-500/40 bg-rose-500/5'
          }`}
        >
          <div>
            <p className="text-lg font-semibold text-white">
              {outcome.result === 'success' ? 'Mission success' : outcome.result === 'partial' ? 'Partial success' : 'Mission failed'}
            </p>
            <p className="text-sm text-slate-300">{outcome.summary}</p>
          </div>
          <ButtonLink to={paths.report(mission.id)} icon={FileBarChart}>
            View Mission Report
          </ButtonLink>
        </div>
      )}

      <PhaseTimeline state={state} history={history} />

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatTile
          label="Energy"
          icon={BatteryMedium}
          value={`${formatNumber(Math.max(0, Math.round(state.remainingEnergy)))} Wh`}
          hint={`${capacityWh > 0 ? Math.round((Math.max(0, state.remainingEnergy) / capacityWh) * 100) : 0}% of ${formatNumber(Math.round(capacityWh))} Wh${state.isLunarNight ? ' · night' : ''}`}
          tone={capacityWh > 0 && state.remainingEnergy / capacityWh < 0.3 ? 'warning' : 'default'}
        />
        <StatTile
          label="Propellant"
          icon={Flame}
          value={`${formatNumber(Math.max(0, Math.round(state.remainingPropellant)))} kg`}
          hint={`of ${formatNumber(Math.round(setup.propellantLoadedKg))} kg loaded`}
        />
        <StatTile label="Data generated" icon={Telescope} value={`${formatNumber(Math.round(state.dataGenerated))} Gb`} />
        <StatTile
          label="Data stored"
          icon={Database}
          value={`${formatNumber(Math.round(state.dataStored))} Gb`}
          hint={`${formatNumber(setup.dataStorageGb)} Gb capacity${state.dataLost > 0 ? ` · ${formatNumber(Math.round(state.dataLost))} Gb lost` : ''}`}
          tone={state.dataLost > 0 ? 'critical' : 'default'}
        />
        <StatTile
          label="Data transmitted"
          icon={HardDriveDownload}
          value={`${formatNumber(Math.round(state.dataTransmitted))} Gb`}
          hint={`target ${formatNumber(mission.dataReturnTargetGb)} Gb`}
        />
        <StatTile label="Budget left" icon={Coins} value={formatMUsd(state.remainingBudget)} hint={`risk ${state.missionRisk.toFixed(1)}%`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Energy Remaining" icon={BatteryMedium}>
              <TimeSeriesChart data={history} unit="Wh" area series={[{ key: 'energyWh', name: 'Energy', color: chartTheme.series.primary }]} />
            </Panel>
            <Panel title="Propellant Remaining" icon={Flame}>
              <TimeSeriesChart data={history} unit="kg" area series={[{ key: 'propellantKg', name: 'Propellant', color: chartTheme.series.primary }]} />
            </Panel>
          </div>
          <Panel title="Science Data" icon={Telescope}>
            <TimeSeriesChart
              data={history}
              unit="Gb"
              series={[
                { key: 'dataTransmittedGb', name: 'Transmitted', color: chartTheme.series.primary },
                { key: 'dataStoredGb', name: 'Stored onboard', color: chartTheme.series.secondary },
              ]}
            />
          </Panel>
          <Panel title="Event Log" icon={ScrollText}>
            {state.eventLog.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-500">No events yet.</p>
            ) : (
              <ul className="divide-y divide-space-700">
                {[...state.eventLog].reverse().map((event, index) => (
                  <li key={`${event.eventId}-${event.day}-${index}`} className="flex flex-wrap items-start gap-x-4 gap-y-1 py-3 first:pt-0 last:pb-0">
                    <span className="w-14 font-mono text-xs text-slate-500">D+{event.day}</span>
                    <StatusBadge tone={severityTone[event.severity]} label={severityLabel[event.severity]} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-100">{event.title}</p>
                      <p className="text-xs text-slate-400">
                        {phaseLabels[event.phase]} · {event.detail}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-6 xl:self-start">
          <Panel title="Systems Status" icon={Radio}>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-slate-400">Communication</dt>
                <dd><StatusBadge tone={comm.tone} label={comm.label} /></dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-400">Instruments</dt>
                <dd><StatusBadge tone={instrument.tone} label={instrument.label} /></dd>
              </div>
            </dl>
          </Panel>
          <Panel title="Mission Progress" icon={TrendingUp}>
            <div className="space-y-4">
              <ProgressBar label="Mission time" mode="target" value={state.elapsedTime} max={mission.durationDays} valueLabel={`${state.elapsedTime} / ${mission.durationDays} d`} />
              <ProgressBar label="Construction" mode="target" value={state.constructionProgress} max={100} valueLabel={`${Math.round(state.constructionProgress)}%`} />
              <ProgressBar label="Operations days" mode="target" value={state.operationsDays} max={mission.requiredOperationDays} valueLabel={`${state.operationsDays} / ${mission.requiredOperationDays} d`} />
              <ProgressBar label="Data return" mode="target" value={state.dataTransmitted} max={mission.dataReturnTargetGb} valueLabel={`${formatNumber(Math.round(state.dataTransmitted))} / ${formatNumber(mission.dataReturnTargetGb)} Gb`} />
            </div>
          </Panel>
          <Panel title="Active Events" icon={Activity}>
            {conditions.length === 0 ? (
              <p className="text-sm text-slate-500">No active conditions.</p>
            ) : (
              <ul className="space-y-3">
                {conditions.map((c) => (
                  <li key={c.id} className="text-sm">
                    <StatusBadge tone={severityTone[c.severity]} label={c.title} />
                    <p className="mt-1 text-xs text-slate-400">{c.detail}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      <EventToasts eventLog={state.eventLog} />
    </>
  )
}
