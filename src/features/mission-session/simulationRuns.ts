import {
  componentCatalog,
  gameplayAssumptions,
  getSite,
  getThermalProfile,
  launchVehicles,
  orbitProfiles,
  simulationConfig,
} from '../../data'
import { createSimulation, isFinished, prepareSimulation, sampleTelemetry, startSimulation, stepSimulation } from '../../engine/simulation'
import { clearRun, saveRun } from '../../services/persistence/runStorage'
import type { StoredRun } from '../../services/persistence/runStorage'
import type { DesignSelection } from '../../types/component'
import type { Mission } from '../../types/mission'
import type { SimulationState } from '../../types/simulation'
import type { SimulationRun } from './missionSessionContext'

/** Identity of a design: a run belongs to exactly the design it was launched with. */
export function designKey(design: DesignSelection): string {
  return JSON.stringify([design.entries.map((e) => [e.componentId, e.quantity]), design.launchVehicleId, design.orbitId, design.siteId])
}

/** Moves a run to a new state, recording one telemetry sample per simulated day. */
export function withState(run: SimulationRun, state: SimulationState): SimulationRun {
  if (state === run.state) return run
  const last = run.history[run.history.length - 1]
  const history = last && last.day === state.elapsedTime ? run.history : [...run.history, sampleTelemetry(state)]
  return { ...run, state, history }
}

/** Prepares and starts a run of the design against the current game data. */
export function launchRun(mission: Mission, design: DesignSelection): SimulationRun {
  const setup = prepareSimulation({
    mission,
    entries: design.entries,
    catalog: componentCatalog,
    launchVehicle: launchVehicles.find((lv) => lv.id === design.launchVehicleId),
    orbit: orbitProfiles.find((o) => o.id === design.orbitId),
    assumptions: gameplayAssumptions,
    config: simulationConfig,
    thermal: getThermalProfile(getSite(design.siteId)),
  })
  const state = startSimulation(createSimulation(setup))
  return { design, setup, state, history: [sampleTelemetry(state)] }
}

/** Steps a run to the end one day at a time so the chart history stays complete. */
export function finishRun(run: SimulationRun): SimulationRun {
  let current = run
  let state = startSimulation(run.state)
  while (!isFinished(state)) {
    state = stepSimulation(state, run.setup)
    current = withState(current, state)
  }
  return current
}

export function toStoredRun(run: SimulationRun): Omit<StoredRun, 'version' | 'missionId'> | undefined {
  const { state } = run
  if ((state.runStatus !== 'completed' && state.runStatus !== 'failed') || !state.outcome) return undefined
  return { design: run.design, result: { runStatus: state.runStatus, outcome: state.outcome.result, elapsedDays: state.elapsedTime } }
}

/** Rebuilds a saved run by replaying its design. Undefined when the game data changed the result. */
export function restoreRun(mission: Mission, stored: StoredRun): SimulationRun | undefined {
  try {
    const run = finishRun(launchRun(mission, stored.design))
    const replayed = toStoredRun(run)?.result
    const same =
      replayed?.runStatus === stored.result.runStatus &&
      replayed.outcome === stored.result.outcome &&
      replayed.elapsedDays === stored.result.elapsedDays
    return same ? run : undefined
  } catch {
    return undefined
  }
}

type Runs = Partial<Record<string, SimulationRun | null>>

/**
 * Brings storage in line with the in-memory runs. `persisted` is what storage holds per mission;
 * it is updated in place. Finished runs are written once; unfinished runs never write, and a
 * cleared, restarted, or invalidated run removes its saved report.
 */
export function syncSavedRuns(runs: Runs, persisted: Runs): void {
  for (const [missionId, run] of Object.entries(runs)) {
    if (persisted[missionId] === run) continue
    const stored = run ? toStoredRun(run) : undefined
    if (run && stored) {
      saveRun(missionId, stored)
      persisted[missionId] = run
    } else if (persisted[missionId]) {
      clearRun(missionId)
      persisted[missionId] = null
    }
  }
}
