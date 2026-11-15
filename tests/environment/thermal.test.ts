import { describe, expect, it } from 'vitest'
import {
  componentCatalog,
  gameplayAssumptions,
  getMission,
  getSite,
  getThermalProfile,
  launchVehicles,
  orbitProfiles,
  simulationConfig,
  thermalProfiles,
} from '../../src/data'
import {
  effectiveHeatRejectionW,
  kelvinToCelsius,
  nightHeatNeedW,
  radiatorFactor,
} from '../../src/engine/environment/thermal'
import { summarizeDesign } from '../../src/engine/resources/summarizeDesign'
import { createSimulation, prepareSimulation, runToCompletion } from '../../src/engine/simulation'
import type { ThermalProfile } from '../../src/types/environment'

const REFERENCE = ['bus-small', 'prp-throttle', 'pwr-solar-std', 'bat-rfc', 'com-xband', 'pay-dipole', 'lnd-legs', 'thm-passive', 'rob-winch']
const equatorial = thermalProfiles.find((p) => p.id === 'thermal-equatorial')!
const withTemps = (dayMaxK: number, nightMinK: number): ThermalProfile => ({
  ...equatorial,
  dayMaxK: { ...equatorial.dayMaxK, value: dayMaxK },
  nightMinK: { ...equatorial.nightMinK, value: nightMinK },
})

describe('thermal model', () => {
  it('derates radiators linearly above the reference temperature, with a floor', () => {
    expect(radiatorFactor(withTemps(300, 95), gameplayAssumptions)).toBe(1)
    expect(radiatorFactor(withTemps(400, 95), gameplayAssumptions)).toBeCloseTo(0.85)
    expect(radiatorFactor(withTemps(900, 95), gameplayAssumptions)).toBe(0.5)
  })

  it('adds the structure baseline to rated rejection', () => {
    expect(effectiveHeatRejectionW(20, undefined, gameplayAssumptions)).toBe(120)
    expect(effectiveHeatRejectionW(20, equatorial, gameplayAssumptions)).toBeCloseTo(120 * (1 - 0.0015 * 92))
  })

  it('needs more night heat at colder sites and less with insulation', () => {
    const bare = summarizeDesign([{ componentId: 'bus-small', quantity: 1 }], componentCatalog)
    const insulated = summarizeDesign([{ componentId: 'bus-small', quantity: 1 }, { componentId: 'thm-passive', quantity: 1 }], componentCatalog)
    expect(nightHeatNeedW(bare, equatorial, gameplayAssumptions)).toBeCloseTo(0.5 * (233 - 95))
    expect(nightHeatNeedW(bare, withTemps(392, 60), gameplayAssumptions)).toBeGreaterThan(nightHeatNeedW(bare, equatorial, gameplayAssumptions))
    expect(nightHeatNeedW(insulated, equatorial, gameplayAssumptions)).toBeLessThan(nightHeatNeedW(bare, equatorial, gameplayAssumptions))
  })

  it('converts kelvin to celsius', () => {
    expect(kelvinToCelsius(392)).toBe(119)
    expect(kelvinToCelsius(95)).toBe(-178)
  })
})

describe('site thermal conditions in the simulation', () => {
  const mission = getMission('lunar-echo')!
  const setupFor = (ids: string[], thermal?: ThermalProfile) =>
    prepareSimulation({
      mission,
      entries: ids.map((componentId) => ({ componentId, quantity: 1 })),
      catalog: componentCatalog,
      launchVehicle: launchVehicles.find((lv) => lv.id === 'lv-heavy'),
      orbit: orbitProfiles.find((o) => o.id === 'orb-phasing'),
      assumptions: gameplayAssumptions,
      config: simulationConfig,
      thermal,
    })

  it('derates heat rejection at hotter sites', () => {
    expect(setupFor(REFERENCE, withTemps(450, 95)).heatRejectionW).toBeLessThan(setupFor(REFERENCE, equatorial).heatRejectionW)
  })

  it('still lets the reference design succeed at the default site', () => {
    const setup = setupFor(REFERENCE, getThermalProfile(getSite(mission.site.defaultSiteId)))
    expect(runToCompletion(createSimulation(setup), setup).outcome?.result).toBe('success')
  })

  it('overheats the payload at an extreme hot site', () => {
    const setup = setupFor(REFERENCE, withTemps(600, 95))
    const state = runToCompletion(createSimulation(setup), setup)
    expect(state.eventLog.map((e) => e.eventId)).toContain('instrumentOverheating')
  })
})
