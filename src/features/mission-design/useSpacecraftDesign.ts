import { useCallback, useMemo } from 'react'
import { componentCatalog, gameplayAssumptions, getSite, getThermalProfile, launchVehicles, orbitProfiles } from '../../data'
import {
  addComponent,
  canAddComponent,
  findDesignIssues,
  removeAllOf,
  removeComponent,
  repairDesign,
} from '../../engine/design/designEntries'
import { summarizeDesign } from '../../engine/resources/summarizeDesign'
import { checkRequirements } from '../../engine/validation/checkRequirements'
import { launchMassKg } from '../../engine/validation/derivedMetrics'
import { validateDesign } from '../../engine/validation/validators'
import type { Mission } from '../../types/mission'
import { useMissionSession } from '../mission-session/missionSessionContext'

/** Designer view of the mission session. All rules and totals come from the engine. */
export function useSpacecraftDesign(mission: Mission) {
  const { entries, setEntries, launchVehicleId, setLaunchVehicleId, orbitId, setOrbitId, siteId, setSiteId, loadNotices, dismissLoadNotices } = useMissionSession()

  const launchVehicle = launchVehicles.find((lv) => lv.id === launchVehicleId)
  const orbit = orbitProfiles.find((o) => o.id === orbitId)
  const site = getSite(siteId)
  const thermal = getThermalProfile(site)
  const summary = useMemo(() => summarizeDesign(entries, componentCatalog), [entries])
  /** Ways the design no longer fits the component data (e.g. a saved design after a data update). */
  const issues = useMemo(() => findDesignIssues(entries, componentCatalog), [entries])
  const massKg = useMemo(
    () => launchMassKg({ mission, summary, launchVehicle, orbit, assumptions: gameplayAssumptions }),
    [mission, summary, launchVehicle, orbit],
  )
  const requirementStatus = useMemo(
    () => checkRequirements(mission, summary, launchVehicle, { site, launchMassKg: massKg }),
    [mission, summary, launchVehicle, site, massKg],
  )
  const validation = useMemo(
    () => validateDesign({ mission, summary, launchVehicle, orbit, assumptions: gameplayAssumptions, site, thermal }),
    [mission, summary, launchVehicle, orbit, site, thermal],
  )

  return {
    entries,
    summary,
    /** Dry mass plus loaded propellant (kg). */
    launchMassKg: massKg,
    requirementStatus,
    validation,
    issues,
    loadNotices,
    dismissLoadNotices,
    launchVehicle,
    launchVehicleId,
    orbitId,
    siteId,
    site,
    thermal,
    setLaunchVehicleId,
    setOrbitId,
    setSiteId,
    canAdd: useCallback((id: string) => canAddComponent(entries, id, componentCatalog), [entries]),
    add: useCallback((id: string) => setEntries((prev) => addComponent(prev, id, componentCatalog)), [setEntries]),
    remove: useCallback((id: string) => setEntries((prev) => removeComponent(prev, id)), [setEntries]),
    removeAll: useCallback((id: string) => setEntries((prev) => removeAllOf(prev, id)), [setEntries]),
    clear: useCallback(() => setEntries([]), [setEntries]),
    repair: useCallback(() => setEntries((prev) => repairDesign(prev, componentCatalog)), [setEntries]),
  }
}

export type SpacecraftDesign = ReturnType<typeof useSpacecraftDesign>
