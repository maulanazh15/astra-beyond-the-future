import { renderToString } from 'react-dom/server'
import { createMemoryRouter, RouterProvider } from 'react-router'
import type { RouteObject } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { routes } from '../../src/app/routes'
import {
  componentCatalog,
  gameplayAssumptions,
  getMission,
  getSite,
  getThermalProfile,
  launchVehicles,
  orbitProfiles,
  simulationConfig,
} from '../../src/data'
import { createSimulation, prepareSimulation, runToCompletion } from '../../src/engine/simulation'
import { summarizeDesign } from '../../src/engine/resources/summarizeDesign'
import { scoreMission } from '../../src/engine/scoring/scoreMission'
import { launchMassKg } from '../../src/engine/validation/derivedMetrics'
import { validateDesign } from '../../src/engine/validation/validators'
import type { SimulationRun } from '../../src/features/mission-session/missionSessionContext'
import { SimulationRunStoreContext } from '../../src/features/mission-session/simulationRunStore'
import { finishRun, launchRun } from '../../src/features/mission-session/simulationRuns'
import { saveDesign } from '../../src/services/persistence/designStorage'
import { installMemoryStorage, removeMemoryStorage } from '../helpers/memoryStorage'

const mission = getMission('lunar-echo')!
const site = getSite(mission.site.defaultSiteId)
const thermal = getThermalProfile(site)
const REFERENCE = ['bus-small', 'prp-throttle', 'pwr-solar-std', 'bat-rfc', 'com-xband', 'pay-dipole', 'lnd-legs', 'thm-passive', 'rob-winch']
const entries = REFERENCE.map((componentId) => ({ componentId, quantity: 1 }))

/** Same inputs the designer (validation) and mission control (simulation) build from the session. */
function evaluate(launchVehicleId: string, orbitId: string) {
  const launchVehicle = launchVehicles.find((lv) => lv.id === launchVehicleId)
  const orbit = orbitProfiles.find((o) => o.id === orbitId)
  const summary = summarizeDesign(entries, componentCatalog)
  const validation = validateDesign({ mission, summary, launchVehicle, orbit, assumptions: gameplayAssumptions, site, thermal })
  const setup = prepareSimulation({ mission, entries, catalog: componentCatalog, launchVehicle, orbit, assumptions: gameplayAssumptions, config: simulationConfig, thermal })
  const massKg = launchMassKg({ mission, summary, launchVehicle, orbit, assumptions: gameplayAssumptions })
  const end = runToCompletion(createSimulation(setup), setup)
  return { validation, setup, massKg, end, status: (id: string) => validation.find((v) => v.id === id)?.status }
}

describe('designer → validation → simulation consistency', () => {
  it('uses the same launch mass (dry + loaded propellant) in validation and simulation', () => {
    const { setup, massKg } = evaluate('lv-heavy', 'orb-phasing')
    expect(setup.launchMassKg).toBeCloseTo(massKg)
    expect(setup.launchMassKg).toBeCloseTo(summarizeDesign(entries, componentCatalog).massKg + setup.propellantLoadedKg)
  })

  it.each(launchVehicles.flatMap((lv) => orbitProfiles.map((o) => [lv.id, o.id] as const)))(
    'a critical mass or launcher-compatibility check ends %s / %s at launch',
    (lvId, orbitId) => {
      const { status, end } = evaluate(lvId, orbitId)
      const launchBlocked = status('mass') === 'critical' || status('launchVehicle') === 'critical'
      const failedAtLaunch = end.failureReason === 'launchOverCapacity' || end.failureReason === 'launchVehicleIncompatible'
      expect(failedAtLaunch).toBe(launchBlocked)
    },
  )

  it('fails an overweight spacecraft on launch day with a diagnosis and capped score', () => {
    const { end, setup } = evaluate('lv-medium', 'orb-phasing')
    expect(end.runStatus).toBe('failed')
    expect(end.failureReason).toBe('launchOverCapacity')
    expect(end.elapsedTime).toBe(1)
    expect(end.outcome?.result).toBe('failure')
    expect(end.outcome?.diagnosis[0].subsystem).toBe('launchVehicle')
    expect(scoreMission(end, setup).total).toBeLessThanOrEqual(44)
  })

  it('fails when the launcher cannot fly the selected transfer', () => {
    const { end } = evaluate('lv-super', 'orb-low-energy')
    expect(end.failureReason).toBe('launchVehicleIncompatible')
  })
})

describe('launch → simulation → completion → report → redesign', () => {
  it('flies a valid design to completion and scores it', () => {
    const { validation, setup, end } = evaluate('lv-heavy', 'orb-phasing')
    expect(validation.filter((v) => v.status === 'critical')).toEqual([])
    expect(end.runStatus).toBe('completed')
    expect(end.phase).toBe('completion')
    expect(end.elapsedTime).toBe(mission.durationDays)
    expect(end.outcome?.result).toBe('success')
    expect(end.eventLog.some((e) => e.eventId === 'firstLight')).toBe(true)
    const score = scoreMission(end, setup)
    expect(score.total).toBeGreaterThan(44)
    expect(score.categories.reduce((sum, c) => sum + c.weight, 0)).toBeCloseTo(1)
  })

  it('reproduces the same result when the same design is relaunched', () => {
    const first = evaluate('lv-heavy', 'orb-phasing')
    const second = evaluate('lv-heavy', 'orb-phasing')
    expect(second.end).toEqual(first.end)
  })
})

// ── Screen-level integration (server render, no DOM) ─────────

/** Renders a path with a pre-filled app-level run store, as if a mission had been flown earlier. */
function render(path: string, runs: Record<string, SimulationRun> = {}) {
  const appRoutes = routes[0].children as RouteObject[]
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] })
  return renderToString(
    <SimulationRunStoreContext.Provider value={{ runs, setRuns: () => {} }}>
      <RouterProvider router={router} />
    </SimulationRunStoreContext.Provider>,
  )
}

const flownDesign = { entries, launchVehicleId: 'lv-heavy', orbitId: 'orb-phasing', siteId: mission.site.defaultSiteId }

/** A finished run of `flownDesign`; the session only shows it while that design is loaded. */
function completedRun(): SimulationRun {
  saveDesign('lunar-echo', flownDesign)
  return finishRun(launchRun(mission, flownDesign))
}

describe('screens share session state', () => {
  beforeEach(() => {
    installMemoryStorage()
  })
  afterEach(() => {
    removeMemoryStorage()
  })

  it('starts a fresh design with a launcher and transfer that are compatible', () => {
    const html = render('/missions/lunar-echo/design')
    expect(html).not.toContain('cannot fly the')
  })

  it('loads a saved design into the designer and mission control', () => {
    saveDesign('lunar-echo', flownDesign)
    expect(render('/missions/lunar-echo/design')).toContain('Heavy-Lift Launcher supports the selected transfer.')
    const control = render('/missions/lunar-echo/control')
    expect(control).toContain('Launch Readiness')
    expect(control).not.toContain('No spacecraft designed yet')
  })

  it('shows the report of a mission flown earlier in the session', () => {
    const run = completedRun()
    const html = render('/missions/lunar-echo/report', { 'lunar-echo': run })
    expect(html).not.toContain('No completed mission yet')
    expect(html).toContain('Mission Success')
    expect(html).toContain(`/missions/lunar-echo/design`) // Redesign Mission
  })

  it('shows the finished run in mission control', () => {
    const html = render('/missions/lunar-echo/control', { 'lunar-echo': completedRun() })
    expect(html).toContain('View Mission Report')
  })

  it('explains an empty report before any launch', () => {
    expect(render('/missions/lunar-echo/report')).toContain('No completed mission yet')
  })
})
