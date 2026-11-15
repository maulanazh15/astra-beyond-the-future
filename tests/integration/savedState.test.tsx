import { renderToString } from 'react-dom/server'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { routes } from '../../src/app/routes'
import { getMission } from '../../src/data'
import type { SimulationRun } from '../../src/features/mission-session/missionSessionContext'
import { finishRun, launchRun, restoreRun, syncSavedRuns, toStoredRun } from '../../src/features/mission-session/simulationRuns'
import { saveDesign } from '../../src/services/persistence/designStorage'
import { loadRun, saveRun } from '../../src/services/persistence/runStorage'
import { installMemoryStorage, removeMemoryStorage } from '../helpers/memoryStorage'
import type { MemoryStorage } from '../helpers/memoryStorage'

const mission = getMission('lunar-echo')!
const REFERENCE = ['bus-small', 'prp-throttle', 'pwr-solar-std', 'bat-rfc', 'com-xband', 'pay-dipole', 'lnd-legs', 'thm-passive', 'rob-winch']
const design = {
  entries: REFERENCE.map((componentId) => ({ componentId, quantity: 1 })),
  launchVehicleId: 'lv-heavy',
  orbitId: 'orb-phasing',
  siteId: mission.site.defaultSiteId,
}

/** A fresh app load: real routes, empty in-memory store, state only from localStorage. */
function reload(path: string) {
  return renderToString(<RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />)
}

function flyAndSave() {
  const run = finishRun(launchRun(mission, design))
  saveDesign(mission.id, design)
  saveRun(mission.id, toStoredRun(run)!)
  return run
}

let storage: MemoryStorage
beforeEach(() => {
  storage = installMemoryStorage()
})
afterEach(removeMemoryStorage)

describe('completed report persistence', () => {
  it('shows the completed report after a reload', () => {
    flyAndSave()
    const html = reload('/missions/lunar-echo/report')
    expect(html).not.toContain('No completed mission yet')
    expect(html).toContain('Mission Success')
    expect(html).toContain('Clear Report')
  })

  it('rebuilds the exact run that was flown', () => {
    const run = flyAndSave()
    const restored = restoreRun(mission, loadRun(mission.id)!)
    expect(restored?.state).toEqual(run.state)
    expect(restored?.history).toEqual(run.history)
  })

  it('also restores a failed mission report', () => {
    const failing = { ...design, launchVehicleId: 'lv-medium' }
    const run = finishRun(launchRun(mission, failing))
    saveDesign(mission.id, failing)
    saveRun(mission.id, toStoredRun(run)!)
    expect(reload('/missions/lunar-echo/report')).toContain('Mission Failure')
  })

  it('does not show a saved run once the design has changed', () => {
    flyAndSave()
    saveDesign(mission.id, { ...design, orbitId: 'orb-low-energy' })
    expect(reload('/missions/lunar-echo/report')).toContain('No completed mission yet')
  })

  it('discards an outdated run the current data no longer reproduces', () => {
    const run = flyAndSave()
    saveRun(mission.id, { ...toStoredRun(run)!, result: { runStatus: 'completed', outcome: 'success', elapsedDays: 999 } })
    expect(reload('/missions/lunar-echo/report')).toContain('No completed mission yet')
    expect(loadRun(mission.id)).toBeUndefined()
  })

  it('ignores corrupt run data', () => {
    saveDesign(mission.id, design)
    storage.setItem('astra.run.lunar-echo', '{"version":1,"missionId":"lunar-echo","design":42}')
    expect(reload('/missions/lunar-echo/report')).toContain('No completed mission yet')
  })
})

describe('saving runs from the in-memory store', () => {
  it('writes only finished runs, once, and clears them when the run is discarded', () => {
    const running = launchRun(mission, design)
    const finished = finishRun(running)
    const persisted: Partial<Record<string, SimulationRun | null>> = {}

    syncSavedRuns({ 'lunar-echo': running }, persisted)
    expect(storage.writes).toBe(0)

    syncSavedRuns({ 'lunar-echo': finished }, persisted)
    syncSavedRuns({ 'lunar-echo': finished }, persisted)
    expect(storage.writes).toBe(1)
    expect(loadRun('lunar-echo')?.result.outcome).toBe('success')

    syncSavedRuns({ 'lunar-echo': null }, persisted) // design changed or report cleared
    expect(loadRun('lunar-echo')).toBeUndefined()
  })

  it('keeps each mission’s saved run separate', () => {
    const finished = finishRun(launchRun(mission, design))
    const persisted: Partial<Record<string, SimulationRun | null>> = {}
    syncSavedRuns({ 'lunar-echo': finished, 'other-mission': finished }, persisted)
    syncSavedRuns({ 'lunar-echo': finished, 'other-mission': null }, persisted)
    expect(loadRun('lunar-echo')).toBeDefined()
    expect(loadRun('other-mission')).toBeUndefined()
  })
})

describe('invalid saved design quantities', () => {
  const overLimit = {
    ...design,
    entries: [...design.entries, { componentId: 'thm-radiator', quantity: 3 }, { componentId: 'retired-part', quantity: 1 }],
  }

  it('loads the design unchanged and explains what is invalid in the designer', () => {
    saveDesign(mission.id, overLimit)
    const html = reload('/missions/lunar-echo/design')
    expect(html).toContain('Saved design no longer fits the current component limits')
    expect(html).toContain('Thermal Control: 4 units installed (Multi-Layer Insulation ×1, Deployable Radiator Panels ×3), but the limit is 3.')
    expect(html).toContain('&quot;retired-part&quot; ×1 is no longer in the component library.')
    expect(html).toContain('Repair design')
  })

  it('blocks launch in mission control until the design is repaired', () => {
    saveDesign(mission.id, overLimit)
    const html = reload('/missions/lunar-echo/control')
    expect(html).toContain('Repair in Designer')
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>.*?Launch Mission/s)
  })

  it('tells the player when a saved selection was replaced', () => {
    saveDesign(mission.id, { ...design, launchVehicleId: 'lv-retired' })
    expect(reload('/missions/lunar-echo/design')).toContain('Saved launch vehicle &quot;lv-retired&quot; is no longer available')
  })

  it('shows no notice for a valid saved design', () => {
    saveDesign(mission.id, design)
    expect(reload('/missions/lunar-echo/design')).not.toContain('role="alert"')
  })
})
