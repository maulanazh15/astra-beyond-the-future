import { useEffect, useMemo, useRef, useState } from 'react'
import { Outlet } from 'react-router'
import { missions } from '../../data'
import { clearRun, loadRun } from '../../services/persistence/runStorage'
import type { SimulationRunStore } from './simulationRunStore'
import { SimulationRunStoreContext } from './simulationRunStore'
import { restoreRun, syncSavedRuns } from './simulationRuns'

type Runs = SimulationRunStore['runs']

/** Rebuilds the finished runs saved for each available mission. */
function restoreSavedRuns(): Runs {
  const runs: Runs = {}
  for (const mission of missions) {
    if (mission.status !== 'available') continue
    const stored = loadRun(mission.id)
    const run = stored && restoreRun(mission, stored)
    if (run) runs[mission.id] = run
    else if (stored) clearRun(mission.id) // Outdated: the current data no longer reproduces it.
  }
  return runs
}

/**
 * Root route element: holds simulation runs for the whole app session.
 * Finished runs are saved per mission; unfinished runs live only in memory.
 */
export function SimulationRunStoreProvider() {
  const [runs, setRuns] = useState<Runs>(restoreSavedRuns)
  // What storage currently holds per mission, so ticks of a running mission never write.
  const persisted = useRef<Runs>(runs)

  useEffect(() => {
    syncSavedRuns(runs, persisted.current)
  }, [runs])

  const value = useMemo(() => ({ runs, setRuns }), [runs])
  return (
    <SimulationRunStoreContext.Provider value={value}>
      <Outlet />
    </SimulationRunStoreContext.Provider>
  )
}
