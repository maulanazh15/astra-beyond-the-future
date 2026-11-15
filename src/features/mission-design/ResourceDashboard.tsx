import { CircleCheck, CircleX, Gauge, Info } from 'lucide-react'
import { Panel } from '../../components/common/Panel'
import { ProgressBar } from '../../components/common/ProgressBar'
import { componentDisclaimer } from '../../data'
import type { Mission } from '../../types/mission'
import { formatMUsd, formatNumber, formatPercent, formatSignedWatts } from '../../utils/format'
import type { SpacecraftDesign } from './useSpacecraftDesign'

type ResourceDashboardProps = {
  mission: Mission
  design: SpacecraftDesign
}

export function ResourceDashboard({ mission, design }: ResourceDashboardProps) {
  const { summary, launchVehicle, requirementStatus, launchMassKg } = design
  const launchCost = launchVehicle?.costMUsd ?? 0
  const totalCost = summary.costMUsd + launchCost
  const capacityKg = launchVehicle?.payloadCapacityKg ?? 0
  const energyTarget = mission.requirements.find((r) => r.kind === 'minEnergyStorageWh')
  const metCount = requirementStatus.filter((s) => s.met).length
  const reliability = summary.reliability * (launchVehicle?.reliability ?? 1)

  return (
    <Panel title="Live Resource Dashboard" icon={Gauge}>
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <Metric label="Dry mass" value={`${formatNumber(summary.massKg)} kg`} />
          <Metric label="Total cost" value={formatMUsd(totalCost)} hint={`${formatMUsd(summary.costMUsd)} parts + ${formatMUsd(launchCost)} launch`} />
        </div>

        <ProgressBar
          label="Budget used"
          value={totalCost}
          max={mission.budgetMUsd}
          valueLabel={`${formatMUsd(totalCost)} / ${formatMUsd(mission.budgetMUsd)}`}
        />
        <ProgressBar
          label="Launch mass (incl. propellant)"
          value={launchMassKg}
          max={capacityKg}
          valueLabel={`${formatNumber(Math.round(launchMassKg))} / ${formatNumber(capacityKg)} kg`}
        />
        <ProgressBar
          label="Power demand vs generation"
          value={summary.powerDemandW}
          max={summary.powerGenerationW}
          valueLabel={`${formatNumber(summary.powerDemandW)} / ${formatNumber(summary.powerGenerationW)} W`}
        />
        {energyTarget?.kind === 'minEnergyStorageWh' && (
          <ProgressBar
            label="Energy storage"
            mode="target"
            value={summary.energyStorageWh}
            max={energyTarget.target}
            valueLabel={`${formatNumber(summary.energyStorageWh)} / ${formatNumber(energyTarget.target)} Wh`}
          />
        )}

        <dl className="space-y-2 border-t border-space-700 pt-4 text-sm">
          <Row label="Net power (lunar day)" value={formatSignedWatts(summary.netPowerW)} warn={summary.unitCount > 0 && summary.netPowerW < 0} />
          <Row label="Est. reliability" value={summary.unitCount ? formatPercent(reliability, 1) : '—'} />
          <Row label="Installed units" value={String(summary.unitCount)} />
        </dl>

        <div className="border-t border-space-700 pt-4">
          <p className="mb-2 flex justify-between text-xs font-medium tracking-[0.14em] text-slate-400 uppercase">
            Requirements
            <span className="font-mono tracking-normal text-slate-500">
              {metCount}/{requirementStatus.length}
            </span>
          </p>
          <ul className="space-y-2">
            {requirementStatus.map(({ requirement, met, detail }) => (
              <li key={requirement.id} className="flex gap-2 text-xs">
                {met ? (
                  <CircleCheck className="mt-px size-4 shrink-0 text-emerald-400" aria-label="Met" />
                ) : (
                  <CircleX className="mt-px size-4 shrink-0 text-amber-400" aria-label="Not met" />
                )}
                <span>
                  <span className="text-slate-200">{requirement.label}</span>
                  <span className="block font-mono text-slate-500">{detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="flex gap-2 rounded-md border border-space-700 bg-space-800/50 p-3 text-[11px] leading-relaxed text-slate-400">
          <Info className="mt-px size-3.5 shrink-0 text-cyan-400" aria-hidden />
          {componentDisclaimer.note}
        </p>
      </div>
    </Panel>
  )
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-space-700 bg-space-800/60 px-3 py-2.5">
      <p className="text-[11px] tracking-[0.14em] text-slate-400 uppercase">{label}</p>
      <p className="mt-0.5 font-mono text-lg text-white tabular-nums">{value}</p>
      {hint && <p className="text-[10px] text-slate-500">{hint}</p>}
    </div>
  )
}

function Row({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-400">{label}</dt>
      <dd className={`font-mono tabular-nums ${warn ? 'text-rose-300' : 'text-slate-100'}`}>{value}</dd>
    </div>
  )
}
