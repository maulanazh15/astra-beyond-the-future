import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode, SetStateAction } from 'react'
import { componentCatalog, getSite, launchVehicles, orbitProfiles } from '../../data'
import { createSimulation, pauseSimulation, resumeSimulation, sampleTelemetry, startSimulation, stepSimulation } from '../../engine/simulation'
import { findDesignIssues } from '../../engine/design/designEntries'
import { loadDesign, saveDesign } from '../../services/persistence/designStorage'
import type { DesignEntry, DesignSelection } from '../../types/component'
import type { Mission } from '../../types/mission'
import { MissionSessionContext } from './missionSessionContext'
import type { MissionSession, SimulationRun, SimulationSpeed } from './missionSessionContext'
import { useMissionRun } from './simulationRunStore'
import { designKey, finishRun, launchRun, withState } from './simulationRuns'

/**
 * Reads the saved design. Entries are kept as saved (even if they no longer fit the data) so the
 * designer can show and repair them. Selections that no longer exist fall back, with a notice.
 */
function initialDesign(mission: Mission): { design: DesignSelection; notices: string[] } {
  const saved = loadDesign(mission.id)
  const notices: string[] = []
  const launchVehicle = launchVehicles.find((lv) => lv.id === saved?.launchVehicleId) ?? launchVehicles[0]
  if (saved && launchVehicle.id !== saved.launchVehicleId) {
    notices.push(`Saved launch vehicle "${saved.launchVehicleId}" is no longer available; switched to ${launchVehicle.name}.`)
  }
  // A fresh design defaults to a transfer the launcher can fly and that serves this mission.
  const orbit =
    orbitProfiles.find((o) => o.id === saved?.orbitId) ??
    orbitProfiles.find((o) => o.compatibleMissionIds.includes(mission.id) && launchVehicle.compatibleOrbitIds.includes(o.id)) ??
    orbitProfiles[0]
  if (saved && orbit.id !== saved.orbitId) {
    notices.push(`Saved transfer orbit "${saved.orbitId}" is no longer available; switched to ${orbit.name}.`)
  }
  const site = getSite(saved?.siteId) ?? getSite(mission.site.defaultSiteId)
  if (saved?.siteId && site?.id !== saved.siteId) {
    notices.push(`Saved landing site "${saved.siteId}" is no longer available; switched to ${site?.name ?? 'the default site'}.`)
  }
  return {
    design: {
      entries: saved?.entries ?? [],
      launchVehicleId: launchVehicle.id,
      orbitId: orbit.id,
      siteId: site?.id ?? mission.site.defaultSiteId,
    },
    notices,
  }
}

/** Holds the design and the simulation run for one mission, shared by its screens. */
export function MissionSessionProvider({ mission, children }: { mission: Mission; children: ReactNode }) {
  const [initial] = useState(() => initialDesign(mission))
  const [entries, setEntriesState] = useState<DesignEntry[]>(initial.design.entries)
  const [launchVehicleId, setLaunchVehicleIdState] = useState(initial.design.launchVehicleId)
  const [orbitId, setOrbitIdState] = useState(initial.design.orbitId)
  const [siteId, setSiteIdState] = useState(initial.design.siteId)
  const [loadNotices, setLoadNotices] = useState(initial.notices)
  const [storedRun, setRun] = useMissionRun(mission.id)
  const [speed, setSpeed] = useState<SimulationSpeed>(5)

  const design = useMemo<DesignSelection>(() => ({ entries, launchVehicleId, orbitId, siteId }), [entries, launchVehicleId, orbitId, siteId])
  // A run only belongs to the exact design it was launched with (also after a reload).
  const run = storedRun && designKey(storedRun.design) === designKey(design) ? storedRun : null

  useEffect(() => {
    saveDesign(mission.id, design)
  }, [mission.id, design])

  useEffect(() => {
    if (storedRun && !run) setRun(null)
  }, [storedRun, run, setRun])

  // Any design change invalidates a previous run.
  const setEntries = useCallback((action: SetStateAction<DesignEntry[]>) => {
    setEntriesState(action)
    setRun(null)
  }, [setRun])
  const setLaunchVehicleId = useCallback((id: string) => {
    setLaunchVehicleIdState(id)
    setRun(null)
  }, [setRun])
  const setOrbitId = useCallback((id: string) => {
    setOrbitIdState(id)
    setRun(null)
  }, [setRun])
  const setSiteId = useCallback((id: string) => {
    setSiteIdState(id)
    setRun(null)
  }, [setRun])
  const dismissLoadNotices = useCallback(() => setLoadNotices([]), [])

  const launch = useCallback(() => {
    // A design that no longer fits the component data must be repaired first.
    if (findDesignIssues(design.entries, componentCatalog).length > 0) return
    setRun(launchRun(mission, design))
  }, [mission, design, setRun])

  const update = useCallback((fn: (run: SimulationRun) => SimulationRun) => {
    setRun((prev) => (prev ? fn(prev) : prev))
  }, [setRun])

  const pause = useCallback(() => update((r) => withState(r, pauseSimulation(r.state))), [update])
  const resume = useCallback(() => update((r) => withState(r, resumeSimulation(r.state))), [update])
  const restart = useCallback(() => update((r) => {
    const state = startSimulation(createSimulation(r.setup))
    return { ...r, state, history: [sampleTelemetry(state)] }
  }), [update])
  const skipToEnd = useCallback(() => update(finishRun), [update])
  const clearRun = useCallback(() => setRun(null), [setRun])

  // Ticker: one simulated day per tick while running.
  const running = run?.state.runStatus === 'running'
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => update((r) => withState(r, stepSimulation(r.state, r.setup))), 1000 / speed)
    return () => clearInterval(id)
  }, [running, speed, update])

  const value = useMemo<MissionSession>(
    () => ({ entries, setEntries, launchVehicleId, setLaunchVehicleId, orbitId, setOrbitId, siteId, setSiteId, loadNotices, dismissLoadNotices, run, speed, setSpeed, launch, pause, resume, restart, skipToEnd, clearRun }),
    [entries, setEntries, launchVehicleId, setLaunchVehicleId, orbitId, setOrbitId, siteId, setSiteId, loadNotices, dismissLoadNotices, run, speed, launch, pause, resume, restart, skipToEnd, clearRun],
  )

  return <MissionSessionContext.Provider value={value}>{children}</MissionSessionContext.Provider>
}
