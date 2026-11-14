import type { SimPhaseId, SimulationState } from '../../types/simulation'
import type { SimulationSetup } from './setup'

const HOURS_PER_DAY = 24

export function isSurfacePhase(phase: SimPhaseId) {
  return phase === 'landing' || phase === 'construction' || phase === 'operations'
}

/** Days since the landing phase began, or -1 before landing. */
export function surfaceDay(state: Pick<SimulationState, 'elapsedTime'>, setup: SimulationSetup): number {
  const { launch, transit, orbitalArrival } = setup.phaseDays
  return state.elapsedTime - (launch + transit + orbitalArrival)
}

/** Landing happens at local dawn; the first half of each lunar day is daylight. */
export function isLunarNightAt(day: number, setup: SimulationSetup): boolean {
  if (day < 0) return false
  const cycle = setup.config.lunarDayLengthDays
  return day % cycle >= cycle / 2
}

/** Electrical demand (W) of the systems active in a phase. */
export function phaseLoadW(phase: SimPhaseId, night: boolean, setup: SimulationSetup): number {
  const d = setup.demandW
  const bus = d.bus ?? 0
  const thermal = d.thermal ?? 0
  const battery = d.battery ?? 0
  const comms = d.communication ?? 0
  if (night && isSurfacePhase(phase)) {
    return bus * setup.assumptions.survivalBusLoadFraction + thermal + battery
  }
  switch (phase) {
    case 'launch':
      return bus
    case 'transit':
    case 'orbitalArrival':
      return bus + thermal + battery + comms + (d.propulsion ?? 0)
    case 'landing':
      return bus + thermal + battery + comms + (d.propulsion ?? 0) + (d.landing ?? 0)
    case 'construction':
      return bus + thermal + battery + comms + (d.robotics ?? 0)
    case 'operations':
      return bus + thermal + battery + comms + (d.payload ?? 0)
    case 'completion':
      return 0
  }
}

/** Generation (W): arrays are stowed during launch; solar is unavailable at night. */
export function phaseGenerationW(
  phase: SimPhaseId,
  night: boolean,
  state: Pick<SimulationState, 'modifiers'>,
  setup: SimulationSetup,
): number {
  if (phase === 'launch' || phase === 'completion') return 0
  const solar = night ? 0 : setup.solarGenerationW * state.modifiers.solarGenerationFactor
  return solar + setup.nightGenerationW
}

export function batteryCapacityWh(state: Pick<SimulationState, 'modifiers'>, setup: SimulationSetup) {
  return setup.usableBatteryWh * state.modifiers.batteryHealth
}

/** Net battery change over one step (Wh), before clamping to capacity. */
export function energyDeltaWh(
  phase: SimPhaseId,
  night: boolean,
  state: Pick<SimulationState, 'modifiers'>,
  setup: SimulationSetup,
): number {
  const net = phaseGenerationW(phase, night, state, setup) - phaseLoadW(phase, night, setup)
  return net * HOURS_PER_DAY * setup.config.timeStepDays
}

/** Propellant burned per step (kg) in a phase. Spread evenly over the phase's days. */
export function propellantBurnKg(phase: SimPhaseId, setup: SimulationSetup): number {
  const { config, propellantRequiredKg, phaseDays } = setup
  const share: Partial<Record<SimPhaseId, [number, number]>> = {
    transit: [config.propellantShareTransit, phaseDays.transit],
    orbitalArrival: [config.propellantShareArrival, phaseDays.orbitalArrival],
    landing: [config.propellantShareLanding, phaseDays.landing],
  }
  const entry = share[phase]
  if (!entry || entry[1] <= 0) return 0
  return (propellantRequiredKg * entry[0] * config.timeStepDays) / entry[1]
}
