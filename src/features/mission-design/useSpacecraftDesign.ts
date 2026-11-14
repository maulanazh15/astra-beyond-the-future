import { useCallback, useMemo } from 'react'
import { componentCatalog, gameplayAssumptions, launchVehicles, orbitProfiles } from '../../data'
import {
  addComponent,
  canAddComponent,
  removeAllOf,
  removeComponent,
} from '../../engine/design/designEntries'
import { summarizeDesign } from '../../engine/resources/summarizeDesign'
import { checkRequirements } from '../../engine/validation/checkRequirements'
import { validateDesign } from '../../engine/validation/validators'
import type { Mission } from '../../types/mission'
import { useMissionSession } from '../mission-session/missionSessionContext'

/** Designer view of the mission session. All rules and totals come from the engine. */
export function useSpacecraftDesign(mission: Mission) {
  const { entries, setEntries, launchVehicleId, setLaunchVehicleId, orbitId, setOrbitId } = useMissionSession()

  const launchVehicle = launchVehicles.find((lv) => lv.id === launchVehicleId)
  const orbit = orbitProfiles.find((o) => o.id === orbitId)
  const summary = useMemo(() => summarizeDesign(entries, componentCatalog), [entries])
  const requirementStatus = useMemo(
    () => checkRequirements(mission, summary, launchVehicle),
    [mission, summary, launchVehicle],
  )
  const validation = useMemo(
    () => validateDesign({ mission, summary, launchVehicle, orbit, assumptions: gameplayAssumptions }),
    [mission, summary, launchVehicle, orbit],
  )

  return {
    entries,
    summary,
    requirementStatus,
    validation,
    launchVehicle,
    launchVehicleId,
    orbitId,
    setLaunchVehicleId,
    setOrbitId,
    canAdd: useCallback((id: string) => canAddComponent(entries, id, componentCatalog), [entries]),
    add: useCallback((id: string) => setEntries((prev) => addComponent(prev, id, componentCatalog)), [setEntries]),
    remove: useCallback((id: string) => setEntries((prev) => removeComponent(prev, id)), [setEntries]),
    removeAll: useCallback((id: string) => setEntries((prev) => removeAllOf(prev, id)), [setEntries]),
    clear: useCallback(() => setEntries([]), [setEntries]),
  }
}

export type SpacecraftDesign = ReturnType<typeof useSpacecraftDesign>
