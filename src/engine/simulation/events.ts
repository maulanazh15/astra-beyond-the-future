import type { SimEventId, SimEventLogEntry, SimulationState } from '../../types/simulation'
import { batteryCapacityWh, surfaceDay } from './resources'
import type { SimulationSetup } from './setup'

type EventEffect = {
  state: Partial<SimulationState>
  riskDelta: number
  log: Omit<SimEventLogEntry, 'eventId' | 'day' | 'phase'>
}

export type SimEventRule = {
  id: SimEventId
  /** Repeatable events may fire more than once; others fire at most once. */
  repeatable?: boolean
  when: (state: SimulationState, setup: SimulationSetup) => boolean
  effect: (state: SimulationState, setup: SimulationSetup) => EventEffect
}

/** Index of the current lunar night since landing. */
function nightIndex(state: SimulationState, setup: SimulationSetup) {
  return Math.floor(surfaceDay(state, setup) / setup.config.lunarDayLengthDays)
}

export const eventRules: SimEventRule[] = [
  {
    id: 'solarDeploymentFailure',
    when: (s, setup) =>
      s.phase === 'transit' &&
      s.daysInPhase === 1 &&
      setup.solarGenerationW > 0 &&
      setup.solarReliability < setup.config.solarDeploymentReliabilityThreshold,
    effect: (s, setup) => {
      const loss = setup.config.solarDeploymentLossFraction
      return {
        state: { modifiers: { ...s.modifiers, solarGenerationFactor: s.modifiers.solarGenerationFactor * (1 - loss) } },
        riskDelta: 8,
        log: {
          severity: 'critical',
          title: 'Solar panel deployment failure',
          detail: `One array wing failed to latch. Solar output reduced by ${loss * 100}%.`,
          subsystem: 'power',
        },
      }
    },
  },
  {
    id: 'communicationBlackout',
    when: (s, setup) =>
      s.phase === 'operations' && s.operationsDays === setup.config.commBlackoutOpsDay && setup.hasCommunication,
    effect: (s, setup) => {
      const { config } = setup
      const weakLink = (setup.minReliability.communication ?? 1) < config.commReliabilityThreshold
      const days = weakLink ? config.commBlackoutLongDays : config.commBlackoutDays
      return {
        state: { modifiers: { ...s.modifiers, commBlackoutUntilDay: s.elapsedTime + days } },
        riskDelta: weakLink ? 5 : 2,
        log: {
          severity: 'warning',
          title: 'Communication blackout',
          detail: `Relay orbiter link lost for ${days} days${weakLink ? ' (terminal re-acquisition problems)' : ''}. Data is buffered onboard.`,
          subsystem: 'communication',
        },
      }
    },
  },
  {
    id: 'batteryDegradation',
    repeatable: true,
    when: (s, setup) =>
      s.isLunarNight &&
      nightIndex(s, setup) !== s.modifiers.lastBatteryDegradationNight &&
      s.remainingEnergy < batteryCapacityWh(s, setup) * setup.config.batteryLowChargeFraction,
    effect: (s, setup) => {
      const fraction = setup.config.batteryDegradationFraction
      const batteryHealth = s.modifiers.batteryHealth * (1 - fraction)
      return {
        state: {
          modifiers: { ...s.modifiers, batteryHealth, lastBatteryDegradationNight: nightIndex(s, setup) },
          remainingEnergy: Math.min(s.remainingEnergy, setup.usableBatteryWh * batteryHealth),
        },
        riskDelta: 4,
        log: {
          severity: 'warning',
          title: 'Battery degradation',
          detail: `Deep discharge during lunar night. Battery capacity reduced to ${Math.round(batteryHealth * 100)}%.`,
          subsystem: 'battery',
        },
      }
    },
  },
  {
    id: 'instrumentOverheating',
    when: (s, setup) =>
      s.phase === 'operations' &&
      !s.isLunarNight &&
      setup.hasPayload &&
      (setup.demandW.payload ?? 0) > setup.heatRejectionW,
    effect: (s, setup) => {
      const instrumentHealth = Math.max(0, s.modifiers.instrumentHealth - setup.config.overheatingHealthLoss)
      return {
        state: { modifiers: { ...s.modifiers, instrumentHealth } },
        riskDelta: 8,
        log: {
          severity: 'critical',
          title: 'Instrument overheating',
          detail: `Payload heat (${setup.demandW.payload ?? 0} W) exceeds thermal rejection (${setup.heatRejectionW} W). Instrument performance down to ${Math.round(instrumentHealth * 100)}%.`,
          subsystem: 'thermal',
        },
      }
    },
  },
  {
    id: 'roboticConstructionDelay',
    when: (s, setup) =>
      s.phase === 'construction' &&
      s.daysInPhase === setup.config.roboticDelayDay &&
      (setup.minReliability.robotics ?? 1) < setup.config.robotReliabilityThreshold,
    effect: (s, setup) => {
      const days = setup.config.roboticDelayDays
      return {
        state: { modifiers: { ...s.modifiers, constructionStallUntilDay: s.elapsedTime + days } },
        riskDelta: 5,
        log: {
          severity: 'warning',
          title: 'Robotic construction delay',
          detail: `A robot became stuck in loose regolith. Construction paused for ${days} days.`,
          subsystem: 'robotics',
        },
      }
    },
  },
  {
    id: 'firstLight',
    when: (s) => s.phase === 'operations' && s.dataGenerated > 0,
    effect: () => ({
      state: {},
      riskDelta: 0,
      log: {
        severity: 'success',
        title: 'Successful scientific observation',
        detail: 'First light: the observatory recorded its first low-frequency sky data.',
        subsystem: 'payload',
      },
    }),
  },
  {
    id: 'scienceTargetReached',
    when: (s, setup) => s.dataTransmitted >= setup.mission.dataReturnTargetGb,
    effect: (_s, setup) => ({
      state: {},
      riskDelta: -5,
      log: {
        severity: 'success',
        title: 'Science data target reached',
        detail: `${setup.mission.dataReturnTargetGb.toLocaleString('en-US')} Gb of science data returned to Earth.`,
        subsystem: 'payload',
      },
    }),
  },
]

function clampRisk(value: number) {
  return Math.min(100, Math.max(0, value))
}

/** Applies every rule whose condition holds, in rule order. */
export function applyEvents(state: SimulationState, setup: SimulationSetup, rules = eventRules): SimulationState {
  let next = state
  for (const rule of rules) {
    if (!rule.repeatable && next.firedEvents.includes(rule.id)) continue
    if (!rule.when(next, setup)) continue
    const { state: patch, riskDelta, log } = rule.effect(next, setup)
    next = {
      ...next,
      ...patch,
      missionRisk: clampRisk(next.missionRisk + riskDelta),
      firedEvents: next.firedEvents.includes(rule.id) ? next.firedEvents : [...next.firedEvents, rule.id],
      eventLog: [...next.eventLog, { eventId: rule.id, day: next.elapsedTime, phase: next.phase, ...log }],
    }
  }
  return next
}
