import type { AffectedSubsystem } from '../../types/validation'
import type { SimEventSeverity, SimPhaseId, SimulationState } from '../../types/simulation'
import { batteryCapacityWh } from './resources'
import type { SimulationSetup } from './setup'

/** One point of history for charts. Units: Wh, kg, Gb, MUSD, %. */
export type TelemetrySample = {
  day: number
  phase: SimPhaseId
  energyWh: number
  propellantKg: number
  dataStoredGb: number
  dataTransmittedGb: number
  budgetMUsd: number
  riskPercent: number
}

export function sampleTelemetry(state: SimulationState): TelemetrySample {
  return {
    day: state.elapsedTime,
    phase: state.phase,
    energyWh: Math.max(0, Math.round(state.remainingEnergy)),
    propellantKg: Math.max(0, Math.round(state.remainingPropellant)),
    dataStoredGb: Math.round(state.dataStored),
    dataTransmittedGb: Math.round(state.dataTransmitted),
    budgetMUsd: Math.round(state.remainingBudget * 10) / 10,
    riskPercent: Math.round(state.missionRisk * 10) / 10,
  }
}

export type ActiveCondition = {
  id: string
  title: string
  detail: string
  severity: SimEventSeverity
  subsystem: AffectedSubsystem
}

/** Ongoing effects of past events, for an "active events" display. */
export function activeConditions(state: SimulationState, setup: SimulationSetup): ActiveCondition[] {
  const { modifiers, elapsedTime } = state
  const list: ActiveCondition[] = []
  if (elapsedTime < modifiers.commBlackoutUntilDay) {
    list.push({ id: 'blackout', title: 'Communication blackout', detail: `Link restored on day ${modifiers.commBlackoutUntilDay}.`, severity: 'warning', subsystem: 'communication' })
  }
  if (elapsedTime < modifiers.constructionStallUntilDay) {
    list.push({ id: 'stall', title: 'Construction paused', detail: `Robots resume on day ${modifiers.constructionStallUntilDay}.`, severity: 'warning', subsystem: 'robotics' })
  }
  if (modifiers.solarGenerationFactor < 1) {
    list.push({ id: 'solar', title: 'Reduced solar output', detail: `Arrays at ${Math.round(modifiers.solarGenerationFactor * 100)}% capacity.`, severity: 'critical', subsystem: 'power' })
  }
  if (modifiers.batteryHealth < 1) {
    list.push({ id: 'battery', title: 'Degraded battery', detail: `Capacity ${Math.round(batteryCapacityWh(state, setup)).toLocaleString('en-US')} Wh (${Math.round(modifiers.batteryHealth * 100)}%).`, severity: 'warning', subsystem: 'battery' })
  }
  if (modifiers.instrumentHealth < 1) {
    list.push({ id: 'instrument', title: 'Instrument degraded', detail: `Performance at ${Math.round(modifiers.instrumentHealth * 100)}%.`, severity: 'critical', subsystem: 'payload' })
  }
  if (state.isLunarNight && (state.phase === 'construction' || state.phase === 'operations')) {
    list.push({ id: 'night', title: 'Lunar night', detail: 'Survival mode: robots and instruments are idle.', severity: 'info', subsystem: 'battery' })
  }
  return list
}
