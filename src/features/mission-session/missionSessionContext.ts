import { createContext, useContext } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { SimulationSetup, TelemetrySample } from '../../engine/simulation'
import type { DesignEntry, DesignSelection } from '../../types/component'
import type { SimulationState } from '../../types/simulation'

export const SIMULATION_SPEEDS = [1, 5, 15, 30] as const
export type SimulationSpeed = (typeof SIMULATION_SPEEDS)[number]

export type SimulationRun = {
  /** The design this run was launched with. */
  design: DesignSelection
  setup: SimulationSetup
  state: SimulationState
  history: TelemetrySample[]
}

export type MissionSession = {
  entries: DesignEntry[]
  setEntries: Dispatch<SetStateAction<DesignEntry[]>>
  launchVehicleId: string
  setLaunchVehicleId: (id: string) => void
  orbitId: string
  setOrbitId: (id: string) => void
  siteId: string
  setSiteId: (id: string) => void
  /** Saved selections that no longer exist and were replaced on load; shown until dismissed. */
  loadNotices: string[]
  dismissLoadNotices: () => void

  run: SimulationRun | null
  /** Simulated days per real second. */
  speed: SimulationSpeed
  setSpeed: (speed: SimulationSpeed) => void
  launch: () => void
  pause: () => void
  resume: () => void
  restart: () => void
  skipToEnd: () => void
  /** Discards the current run and its saved report. */
  clearRun: () => void
}

export const MissionSessionContext = createContext<MissionSession | null>(null)

export function useMissionSession(): MissionSession {
  const session = useContext(MissionSessionContext)
  if (!session) throw new Error('useMissionSession must be used inside MissionSessionProvider')
  return session
}
