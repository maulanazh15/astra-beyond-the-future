import { describe, expect, it } from 'vitest'
import {
  componentCatalog,
  gameplayAssumptions,
  getMission,
  getThermalProfile,
  launchVehicles,
  lunarSites,
  orbitProfiles,
  simulationConfig,
  thermalProfiles,
} from '../../src/data'
import { nightThermalBalance } from '../../src/engine/environment/thermal'
import { summarizeDesign } from '../../src/engine/resources/summarizeDesign'
import { createSimulation, prepareSimulation, runToCompletion } from '../../src/engine/simulation'
import type { SimulationSetup } from '../../src/engine/simulation'
import { surfaceDay } from '../../src/engine/simulation/resources'
import { nightLoadW } from '../../src/engine/validation/derivedMetrics'
import { validateThermalEnvironment } from '../../src/engine/validation/validators'
import type { ThermalProfile } from '../../src/types/environment'

const mission = getMission('lunar-echo')!
const launchVehicle = launchVehicles.find((lv) => lv.id === 'lv-heavy')
const orbit = orbitProfiles.find((o) => o.id === 'orb-phasing')
const equatorial = thermalProfiles.find((p) => p.id === 'thermal-equatorial')!
/** Reference design without its thermal parts; tests add thermal options on top. */
const BASE = ['bus-small', 'prp-throttle', 'pwr-solar-std', 'bat-rfc', 'com-xband', 'pay-dipole', 'lnd-legs', 'rob-winch']

function evaluate(thermalIds: string[], thermal: ThermalProfile | undefined) {
  const entries = [...BASE, ...thermalIds].map((componentId) => ({ componentId, quantity: 1 }))
  const summary = summarizeDesign(entries, componentCatalog)
  const input = { mission, summary, launchVehicle, orbit, assumptions: gameplayAssumptions, thermal }
  const setup = prepareSimulation({ mission, entries, catalog: componentCatalog, launchVehicle, orbit, assumptions: gameplayAssumptions, config: simulationConfig, thermal })
  return { summary, input, setup, end: runToCompletion(createSimulation(setup), setup), check: thermal && validateThermalEnvironment(input) }
}

describe('shared night survival requirement', () => {
  it('feeds the same heat need and supply to validation and simulation', () => {
    const { summary, input, setup } = evaluate(['thm-passive'], equatorial)
    const balance = nightThermalBalance(summary, equatorial, gameplayAssumptions, nightLoadW(input))
    expect(setup.nightHeatNeedW).toBe(balance.needW)
    expect(setup.nightHeatSupplyW).toBe(balance.supplyW)
    // 0.5 W/K × (233 − 95) K × (1 − 0.65 MLI); supply = 40 W bus × 0.5 + 10 W fuel cell.
    expect(balance.needW).toBeCloseTo(24.15)
    expect(balance.supplyW).toBe(30)
  })

  it('skips the check when no site thermal profile is known', () => {
    const { setup, end } = evaluate([], undefined)
    expect(setup.nightHeatNeedW).toBe(0)
    expect(end.failureReason).not.toBe('electronicsFrozen')
  })
})

describe('night thermal failure', () => {
  it('loses an uninsulated lander on its first lunar night, matching a critical validation', () => {
    const { check, end, setup } = evaluate([], equatorial)
    expect(check?.status).toBe('critical')
    expect(check?.message).toMatch(/^Night/)
    expect(end.runStatus).toBe('failed')
    expect(end.failureReason).toBe('electronicsFrozen')
    expect(end.isLunarNight).toBe(true)
    // Fails during the step that began on the first night day (halfway through the first lunar day).
    expect(surfaceDay(end, setup) - simulationConfig.timeStepDays).toBe(Math.ceil(simulationConfig.lunarDayLengthDays / 2))
  })

  it('diagnoses the shortfall with numbers and a redesign recommendation', () => {
    const { end } = evaluate([], equatorial)
    const diagnosis = end.outcome?.diagnosis[0]
    expect(end.outcome?.result).toBe('failure')
    expect(diagnosis?.subsystem).toBe('thermal')
    expect(diagnosis?.cause).toContain('30 W')
    expect(diagnosis?.cause).toContain('69 W')
    expect(diagnosis?.recommendation).toMatch(/insulation|heater/)
  })

  it('survives the night when supply exactly meets the need (warning, not critical)', () => {
    const { setup } = evaluate([], equatorial)
    const exact: SimulationSetup = { ...setup, nightHeatSupplyW: setup.nightHeatNeedW }
    expect(runToCompletion(createSimulation(exact), exact).failureReason).not.toBe('electronicsFrozen')
  })

  it.each([['thm-passive'], ['thm-rhu'], ['thm-heaters']])('%s keeps the electronics warm at the equator', (part) => {
    expect(evaluate([part], equatorial).end.failureReason).not.toBe('electronicsFrozen')
  })

  it('keeps daytime overheating as degradation, not a failure', () => {
    const hot = { ...equatorial, dayMaxK: { ...equatorial.dayMaxK, value: 600 } }
    const { end } = evaluate(['thm-passive'], hot)
    expect(end.eventLog.map((e) => e.eventId)).toContain('instrumentOverheating')
    expect(end.failureReason).toBeUndefined()
  })
})

describe('validation ↔ simulation consistency across sites', () => {
  const options = [[], ['thm-passive'], ['thm-rhu'], ['thm-heaters'], ['thm-radiator'], ['thm-passive', 'thm-rhu']]
  const cases = lunarSites.flatMap((site) => options.map((ids) => [site.id, ids.join('+') || 'none', ids] as const))

  it.each(cases)('%s with %s: critical night check ⇔ electronics freeze', (siteId, _label, ids) => {
    const thermal = getThermalProfile(lunarSites.find((s) => s.id === siteId))
    const { check, end } = evaluate([...ids], thermal)
    const nightCritical = check?.status === 'critical' && check.message.startsWith('Night')
    expect(end.failureReason === 'electronicsFrozen').toBe(nightCritical)
  })
})
