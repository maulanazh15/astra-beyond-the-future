import { createContext, useCallback, useContext } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { SimulationRun } from './missionSessionContext'

export type SimulationRunStore = {
  runs: Partial<Record<string, SimulationRun | null>>
  setRuns: Dispatch<SetStateAction<Partial<Record<string, SimulationRun | null>>>>
}

/** App-wide, in-memory runs keyed by mission id, so a run survives leaving the mission screens. */
export const SimulationRunStoreContext = createContext<SimulationRunStore | null>(null)

/** The run for one mission, with a setter that behaves like useState's. */
export function useMissionRun(missionId: string): [SimulationRun | null, Dispatch<SetStateAction<SimulationRun | null>>] {
  const store = useContext(SimulationRunStoreContext)
  if (!store) throw new Error('useMissionRun must be used inside SimulationRunStoreProvider')
  const { runs, setRuns } = store
  const setRun = useCallback(
    (action: SetStateAction<SimulationRun | null>) =>
      setRuns((prev) => {
        const current = prev[missionId] ?? null
        const next = typeof action === 'function' ? action(current) : action
        return next === current ? prev : { ...prev, [missionId]: next }
      }),
    [missionId, setRuns],
  )
  return [runs[missionId] ?? null, setRun]
}
