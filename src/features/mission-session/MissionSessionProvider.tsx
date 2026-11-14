import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode, SetStateAction } from 'react'
import { componentCatalog, gameplayAssumptions, launchVehicles, orbitProfiles, simulationConfig } from '../../data'
import {
  createSimulation,
  isFinished,
  pauseSimulation,
  prepareSimulation,
  resumeSimulation,
  sampleTelemetry,
  startSimulation,
  stepSimulation,
} from '../../engine/simulation'
import { loadDesign, saveDesign } from '../../services/persistence/designStorage'
import type { DesignEntry } from '../../types/component'
import type { Mission } from '../../types/mission'
import type { SimulationState } from '../../types/simulation'
import { MissionSessionContext } from './missionSessionContext'
import type { MissionSession, SimulationRun, SimulationSpeed } from './missionSessionContext'

function withState(run: SimulationRun, state: SimulationState): SimulationRun {
  if (state === run.state) return run
  const last = run.history[run.history.length - 1]
  const history = last && last.day === state.elapsedTime ? run.history : [...run.history, sampleTelemetry(state)]
  return { ...run, state, history }
}

/** Holds the design and the simulation run for one mission, shared by its screens. */
export function MissionSessionProvider({ mission, children }: { mission: Mission; children: ReactNode }) {
  const [saved] = useState(() => loadDesign(mission.id))
  const [entries, setEntriesState] = useState<DesignEntry[]>(saved?.entries ?? [])
  const [launchVehicleId, setLaunchVehicleIdState] = useState(saved?.launchVehicleId ?? launchVehicles[0].id)
  const [orbitId, setOrbitIdState] = useState(saved?.orbitId ?? orbitProfiles[0].id)
  const [run, setRun] = useState<SimulationRun | null>(null)
  const [speed, setSpeed] = useState<SimulationSpeed>(5)

  useEffect(() => {
    saveDesign(mission.id, { entries, launchVehicleId, orbitId })
  }, [mission.id, entries, launchVehicleId, orbitId])

  // Any design change invalidates a previous run.
  const setEntries = useCallback((action: SetStateAction<DesignEntry[]>) => {
    setEntriesState(action)
    setRun(null)
  }, [])
  const setLaunchVehicleId = useCallback((id: string) => {
    setLaunchVehicleIdState(id)
    setRun(null)
  }, [])
  const setOrbitId = useCallback((id: string) => {
    setOrbitIdState(id)
    setRun(null)
  }, [])

  const launch = useCallback(() => {
    const setup = prepareSimulation({
      mission,
      entries,
      catalog: componentCatalog,
      launchVehicle: launchVehicles.find((lv) => lv.id === launchVehicleId),
      orbit: orbitProfiles.find((o) => o.id === orbitId),
      assumptions: gameplayAssumptions,
      config: simulationConfig,
    })
    const state = startSimulation(createSimulation(setup))
    setRun({ setup, state, history: [sampleTelemetry(state)] })
  }, [mission, entries, launchVehicleId, orbitId])

  const update = useCallback((fn: (run: SimulationRun) => SimulationRun) => {
    setRun((prev) => (prev ? fn(prev) : prev))
  }, [])

  const pause = useCallback(() => update((r) => withState(r, pauseSimulation(r.state))), [update])
  const resume = useCallback(() => update((r) => withState(r, resumeSimulation(r.state))), [update])
  const restart = useCallback(() => update((r) => {
    const state = startSimulation(createSimulation(r.setup))
    return { ...r, state, history: [sampleTelemetry(state)] }
  }), [update])
  const skipToEnd = useCallback(() => update((r) => {
    // Step one day at a time so the chart history stays complete.
    let current = r
    let state = startSimulation(r.state)
    while (!isFinished(state)) {
      state = stepSimulation(state, r.setup)
      current = withState(current, state)
    }
    return current
  }), [update])

  // Ticker: one simulated day per tick while running.
  const running = run?.state.runStatus === 'running'
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => update((r) => withState(r, stepSimulation(r.state, r.setup))), 1000 / speed)
    return () => clearInterval(id)
  }, [running, speed, update])

  const value = useMemo<MissionSession>(
    () => ({ entries, setEntries, launchVehicleId, setLaunchVehicleId, orbitId, setOrbitId, run, speed, setSpeed, launch, pause, resume, restart, skipToEnd }),
    [entries, setEntries, launchVehicleId, setLaunchVehicleId, orbitId, setOrbitId, run, speed, launch, pause, resume, restart, skipToEnd],
  )

  return <MissionSessionContext.Provider value={value}>{children}</MissionSessionContext.Provider>
}

