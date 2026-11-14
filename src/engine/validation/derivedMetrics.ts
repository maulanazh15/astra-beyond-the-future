import type { DesignSummary } from '../../types/component'
import type { LaunchVehicle, Mission, OrbitProfile } from '../../types/mission'
import type { GameplayAssumptions } from '../../types/validation'

export type ValidationInput = {
  mission: Mission
  summary: DesignSummary
  launchVehicle: LaunchVehicle | undefined
  orbit: OrbitProfile | undefined
  assumptions: GameplayAssumptions
}

/** Propellant the selected transfer needs for the current dry mass (kg). */
export function requiredPropellantKg({ summary, orbit }: ValidationInput): number {
  if (!orbit) return 0
  return (summary.massKg / 1000) * orbit.propellantKgPerTonneDry
}

/** Dry mass plus the propellant actually loaded (needed, capped by tank capacity) (kg). */
export function launchMassKg(input: ValidationInput): number {
  const loaded = Math.min(requiredPropellantKg(input), input.summary.propellantCapacityKg)
  return input.summary.massKg + loaded
}

/** Night survival load (W): partial bus load plus thermal and battery loads. */
export function nightLoadW({ summary, assumptions }: ValidationInput): number {
  const demand = summary.powerDemandByCategoryW
  return (
    (demand.bus ?? 0) * assumptions.survivalBusLoadFraction + (demand.thermal ?? 0) + (demand.battery ?? 0)
  )
}

/** Energy the batteries must supply across one lunar night (Wh). */
export function nightEnergyNeedWh(input: ValidationInput): number {
  const deficitW = Math.max(0, nightLoadW(input) - input.summary.nightGenerationW)
  return deficitW * input.assumptions.lunarNightHours
}

export function usableStorageWh({ summary, assumptions }: ValidationInput): number {
  return summary.energyStorageWh * assumptions.batteryUsableFraction
}

/** Data the relay link can move per day (gigabits). Mbps × seconds ÷ 1000. */
export function dailyDownlinkGb({ summary, assumptions }: ValidationInput): number {
  return (summary.dataRateMbps * assumptions.relayContactHoursPerDay * 3600) / 1000
}

/** Days needed to deploy the observatory with the installed robotic units. */
export function constructionDays({ summary, assumptions }: ValidationInput): number {
  const robots = summary.unitsByCategory.robotics ?? 0
  return robots > 0 ? Math.ceil(assumptions.constructionWorkDays / robots) : Infinity
}
