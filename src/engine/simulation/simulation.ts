import type {
  CommunicationStatus,
  InstrumentStatus,
  SimPhaseId,
  SimulationState,
} from '../../types/simulation'
import { applyEvents } from './events'
import { detectFailure, evaluateOutcome } from './outcome'
import {
  batteryCapacityWh,
  energyDeltaWh,
  isLunarNightAt,
  propellantBurnKg,
  surfaceDay,
} from './resources'
import type { SimulationSetup } from './setup'

export function createSimulation(setup: SimulationSetup): SimulationState {
  return {
    runStatus: 'ready',
    phase: 'launch',
    elapsedTime: 0,
    daysInPhase: 0,
    operationsDays: 0,
    isLunarNight: false,
    remainingBudget: setup.startingBudgetMUsd,
    remainingEnergy: setup.usableBatteryWh,
    remainingPropellant: setup.propellantLoadedKg,
    dataGenerated: 0,
    dataStored: 0,
    dataTransmitted: 0,
    dataLost: 0,
    communicationStatus: setup.hasCommunication ? 'standby' : 'offline',
    instrumentStatus: setup.hasPayload ? 'stowed' : 'offline',
    constructionProgress: 0,
    missionRisk: Math.min(100, Math.max(0, setup.baseRiskPercent)),
    modifiers: {
      solarGenerationFactor: 1,
      batteryHealth: 1,
      instrumentHealth: 1,
      commBlackoutUntilDay: -1,
      constructionStallUntilDay: -1,
      lastBatteryDegradationNight: -1,
    },
    firedEvents: [],
    eventLog: [],
  }
}

// ── Run controls ─────────────────────────────────────────────

export function startSimulation(state: SimulationState): SimulationState {
  return state.runStatus === 'ready' || state.runStatus === 'paused' ? { ...state, runStatus: 'running' } : state
}

export const resumeSimulation = startSimulation

export function pauseSimulation(state: SimulationState): SimulationState {
  return state.runStatus === 'running' ? { ...state, runStatus: 'paused' } : state
}

/** Restart discards progress and rebuilds the initial state from the same setup. */
export function restartSimulation(setup: SimulationSetup): SimulationState {
  return createSimulation(setup)
}

export function isFinished(state: SimulationState) {
  return state.runStatus === 'completed' || state.runStatus === 'failed'
}

// ── Phase transitions ────────────────────────────────────────

/** Returns the next phase if the current one is complete, otherwise the current phase. */
export function nextPhase(state: SimulationState, setup: SimulationSetup): SimPhaseId {
  const { phaseDays, mission } = setup
  const missionOver = state.elapsedTime >= mission.durationDays
  switch (state.phase) {
    case 'launch':
    case 'transit':
    case 'orbitalArrival':
    case 'landing':
      if (missionOver) return 'completion'
      if (state.daysInPhase < phaseDays[state.phase]) return state.phase
      return state.phase === 'launch' ? 'transit'
        : state.phase === 'transit' ? 'orbitalArrival'
        : state.phase === 'orbitalArrival' ? 'landing'
        : 'construction'
    case 'construction':
      if (state.constructionProgress >= 100) return missionOver ? 'completion' : 'operations'
      return missionOver ? 'completion' : 'construction'
    case 'operations':
      return missionOver ? 'completion' : 'operations'
    case 'completion':
      return 'completion'
  }
}

// ── Step ─────────────────────────────────────────────────────

function communicationStatusFor(state: SimulationState, setup: SimulationSetup, night: boolean): CommunicationStatus {
  if (!setup.hasCommunication) return 'offline'
  if (state.elapsedTime < state.modifiers.commBlackoutUntilDay) return 'blackout'
  if (state.phase === 'launch' || (night && state.phase !== 'transit')) return 'standby'
  return 'nominal'
}

function instrumentStatusFor(state: SimulationState, setup: SimulationSetup, night: boolean): InstrumentStatus {
  if (!setup.hasPayload || state.modifiers.instrumentHealth <= 0) return 'offline'
  if (state.phase !== 'operations') return 'stowed'
  if (night) return 'standby'
  return state.modifiers.instrumentHealth < 1 ? 'degraded' : 'operating'
}

/**
 * Advances the simulation by one time step (config.timeStepDays).
 * Pure: returns a new state. Does nothing unless the run status is 'running'.
 */
export function stepSimulation(state: SimulationState, setup: SimulationSetup): SimulationState {
  if (state.runStatus !== 'running') return state
  const dt = setup.config.timeStepDays
  const { phase } = state
  const night = isLunarNightAt(surfaceDay(state, setup), setup)

  // Energy
  const capacity = batteryCapacityWh(state, setup)
  const rawEnergy = state.remainingEnergy + energyDeltaWh(phase, night, state, setup)
  const remainingEnergy = rawEnergy < 0 ? rawEnergy : Math.min(capacity, rawEnergy)

  // Propellant
  const remainingPropellant = state.remainingPropellant - propellantBurnKg(phase, setup)

  // Construction: robots work in daylight unless stalled by an event.
  const stalled = state.elapsedTime < state.modifiers.constructionStallUntilDay
  const building = phase === 'construction' && !night && !stalled
  const constructionProgress = Math.min(
    100,
    state.constructionProgress + (building ? setup.constructionPercentPerDay * dt : 0),
  )

  // Science data
  const communicationStatus = communicationStatusFor(state, setup, night)
  const instrumentStatus = instrumentStatusFor(state, setup, night)
  const observing = instrumentStatus === 'operating' || instrumentStatus === 'degraded'
  const generated = observing ? setup.payloadDataGbPerDay * state.modifiers.instrumentHealth * dt : 0
  const buffered = state.dataStored + generated
  const transmitted = communicationStatus === 'nominal' ? Math.min(buffered, setup.downlinkGbPerDay * dt) : 0
  const afterDownlink = buffered - transmitted
  const lost = Math.max(0, afterDownlink - setup.dataStorageGb)

  let next: SimulationState = {
    ...state,
    elapsedTime: state.elapsedTime + dt,
    daysInPhase: state.daysInPhase + dt,
    operationsDays: state.operationsDays + (phase === 'operations' ? dt : 0),
    isLunarNight: night,
    remainingBudget: state.remainingBudget - setup.config.opsCostMUsdPerDay * dt,
    remainingEnergy,
    remainingPropellant,
    constructionProgress,
    dataGenerated: state.dataGenerated + generated,
    dataStored: afterDownlink - lost,
    dataTransmitted: state.dataTransmitted + transmitted,
    dataLost: state.dataLost + lost,
    communicationStatus,
    instrumentStatus,
  }

  next = applyEvents(next, setup)

  const failureReason = detectFailure(next, setup)
  if (failureReason) {
    next = { ...next, runStatus: 'failed', failureReason }
    return { ...next, outcome: evaluateOutcome(next, setup) }
  }

  const upcoming = nextPhase(next, setup)
  if (upcoming !== next.phase) {
    next = { ...next, phase: upcoming, daysInPhase: 0 }
    if (upcoming === 'construction' && setup.constructionPercentPerDay === 0) {
      next = { ...next, runStatus: 'failed', failureReason: 'noConstructionCapability' }
      return { ...next, outcome: evaluateOutcome(next, setup) }
    }
  }
  if (next.phase === 'completion') {
    next = { ...next, runStatus: 'completed' }
    return { ...next, outcome: evaluateOutcome(next, setup) }
  }
  return next
}

/** Runs from the current state until the mission ends (or maxSteps). Useful for fast-forward and tests. */
export function runToCompletion(state: SimulationState, setup: SimulationSetup, maxSteps = 10_000): SimulationState {
  let current = startSimulation(state)
  for (let i = 0; i < maxSteps && !isFinished(current); i += 1) {
    current = stepSimulation(current, setup)
  }
  return current
}
