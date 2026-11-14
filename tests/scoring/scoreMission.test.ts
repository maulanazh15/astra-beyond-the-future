import { describe, expect, it } from 'vitest'
import { componentCatalog, gameplayAssumptions, getMission, launchVehicles, orbitProfiles, simulationConfig } from '../../src/data'
import { ratingFor, scoreMission, scoreWeights } from '../../src/engine/scoring/scoreMission'
import { activeConditions, createSimulation, prepareSimulation, runToCompletion, sampleTelemetry } from '../../src/engine/simulation'
import type { SimulationState } from '../../src/types/simulation'

const REFERENCE = ['bus-small', 'prp-throttle', 'pwr-solar-std', 'bat-rfc', 'com-xband', 'pay-dipole', 'lnd-legs', 'thm-passive', 'rob-winch']

function setupFor(ids: string[]) {
  return prepareSimulation({
    mission: getMission('lunar-echo')!,
    entries: ids.map((componentId) => ({ componentId, quantity: 1 })),
    catalog: componentCatalog,
    launchVehicle: launchVehicles.find((lv) => lv.id === 'lv-heavy'),
    orbit: orbitProfiles.find((o) => o.id === 'orb-phasing'),
    assumptions: gameplayAssumptions,
    config: simulationConfig,
  })
}

function finish(ids: string[]) {
  const setup = setupFor(ids)
  return { setup, state: runToCompletion(createSimulation(setup), setup) }
}

describe('scoreMission', () => {
  it('weights sum to 1', () => {
    expect(Object.values(scoreWeights).reduce((a, b) => a + b, 0)).toBeCloseTo(1)
  })

  it('maps totals to ratings', () => {
    expect(ratingFor(95)).toBe('S')
    expect(ratingFor(80)).toBe('A')
    expect(ratingFor(59)).toBe('D')
    expect(ratingFor(10)).toBe('F')
  })

  it('scores a successful mission highly in all five categories', () => {
    const { setup, state } = finish(REFERENCE)
    const score = scoreMission(state, setup)
    expect(score.categories.map((c) => c.id)).toEqual(['objectives', 'engineering', 'science', 'efficiency', 'risk'])
    expect(score.categories.find((c) => c.id === 'objectives')?.score).toBe(100)
    expect(score.total).toBeGreaterThanOrEqual(70)
    for (const c of score.categories) expect(c.score).toBeGreaterThanOrEqual(0)
  })

  it('caps a failed mission below a passing score', () => {
    const { setup, state } = finish(REFERENCE.map((id) => (id === 'bat-rfc' ? 'bat-liion' : id)))
    expect(state.runStatus).toBe('failed')
    const score = scoreMission(state, setup)
    expect(score.total).toBeLessThan(45)
    expect(score.rating).toBe('F')
  })

  it('is deterministic', () => {
    const { setup, state } = finish(REFERENCE)
    expect(scoreMission(state, setup)).toEqual(scoreMission(state, setup))
  })
})

describe('telemetry and active conditions', () => {
  const setup = setupFor(REFERENCE)

  it('samples state into chart-ready numbers', () => {
    const sample = sampleTelemetry({ ...createSimulation(setup), remainingEnergy: -5, dataStored: 12.6 })
    expect(sample).toMatchObject({ day: 0, phase: 'launch', energyWh: 0, dataStoredGb: 13 })
  })

  it('lists ongoing effects of events', () => {
    const base = createSimulation(setup)
    const affected: SimulationState = {
      ...base,
      elapsedTime: 10,
      modifiers: { ...base.modifiers, commBlackoutUntilDay: 12, solarGenerationFactor: 0.7, instrumentHealth: 0.7 },
    }
    expect(activeConditions(affected, setup).map((c) => c.id)).toEqual(['blackout', 'solar', 'instrument'])
    expect(activeConditions(base, setup)).toEqual([])
  })
})
