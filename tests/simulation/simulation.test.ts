import { describe, expect, it } from 'vitest'
import {
  componentCatalog,
  gameplayAssumptions,
  getMission,
  launchVehicles,
  orbitProfiles,
  simulationConfig,
} from '../../src/data'
import {
  createSimulation,
  pauseSimulation,
  prepareSimulation,
  restartSimulation,
  resumeSimulation,
  runToCompletion,
  startSimulation,
  stepSimulation,
} from '../../src/engine/simulation'
import type { SimulationSetup } from '../../src/engine/simulation'
import {
  energyDeltaWh,
  isLunarNightAt,
  phaseGenerationW,
  phaseLoadW,
  propellantBurnKg,
} from '../../src/engine/simulation/resources'
import type { SimPhaseId, SimulationState } from '../../src/types/simulation'

const REFERENCE = ['bus-small', 'prp-throttle', 'pwr-solar-std', 'bat-rfc', 'com-xband', 'pay-dipole', 'lnd-legs', 'thm-passive', 'rob-winch']

function swap(ids: string[], from: string, to: string) {
  return ids.map((id) => (id === from ? to : id))
}

function makeSetup(ids: string[], options: { launchVehicleId?: string; orbitId?: string } = {}): SimulationSetup {
  return prepareSimulation({
    mission: getMission('lunar-echo')!,
    entries: ids.map((componentId) => ({ componentId, quantity: 1 })),
    catalog: componentCatalog,
    launchVehicle: launchVehicles.find((lv) => lv.id === (options.launchVehicleId ?? 'lv-heavy')),
    orbit: orbitProfiles.find((o) => o.id === (options.orbitId ?? 'orb-phasing')),
    assumptions: gameplayAssumptions,
    config: simulationConfig,
  })
}

function run(setup: SimulationSetup) {
  return runToCompletion(createSimulation(setup), setup)
}

function fired(state: SimulationState) {
  return state.eventLog.map((e) => e.eventId)
}

const reference = makeSetup(REFERENCE)
const noModifiers = createSimulation(reference)

describe('core calculations', () => {
  it('alternates lunar day and night from landing at dawn', () => {
    expect(isLunarNightAt(-1, reference)).toBe(false)
    expect(isLunarNightAt(0, reference)).toBe(false)
    expect(isLunarNightAt(14, reference)).toBe(false)
    expect(isLunarNightAt(15, reference)).toBe(true)
    expect(isLunarNightAt(29, reference)).toBe(true)
    expect(isLunarNightAt(30, reference)).toBe(false)
  })

  it('uses survival load at night on the surface', () => {
    // Compact bus 40 W × 0.5 + RFC 10 W, passive thermal 0 W.
    expect(phaseLoadW('operations', true, reference)).toBe(30)
    // Day: bus 40 + battery 10 + X-band 120 + dipole 90.
    expect(phaseLoadW('operations', false, reference)).toBe(260)
  })

  it('has no generation during launch or at night without a night-capable source', () => {
    expect(phaseGenerationW('launch', false, noModifiers, reference)).toBe(0)
    expect(phaseGenerationW('operations', true, noModifiers, reference)).toBe(0)
    expect(phaseGenerationW('operations', false, noModifiers, reference)).toBe(900)
  })

  it('computes daily energy change in Wh', () => {
    expect(energyDeltaWh('operations', false, noModifiers, reference)).toBe((900 - 260) * 24)
    expect(energyDeltaWh('operations', true, noModifiers, reference)).toBe(-30 * 24)
  })

  it('spends exactly the required propellant across transit, arrival, and landing', () => {
    const { phaseDays, propellantRequiredKg } = reference
    const total =
      propellantBurnKg('transit', reference) * phaseDays.transit +
      propellantBurnKg('orbitalArrival', reference) * phaseDays.orbitalArrival +
      propellantBurnKg('landing', reference) * phaseDays.landing
    expect(total).toBeCloseTo(propellantRequiredKg)
    expect(propellantBurnKg('operations', reference)).toBe(0)
  })

  it('starts with budget after design and launch costs', () => {
    // $600M − $307M parts − $150M heavy launcher.
    expect(reference.startingBudgetMUsd).toBe(143)
    expect(noModifiers.remainingBudget).toBe(143)
  })
})

describe('run controls', () => {
  it('only advances while running', () => {
    const ready = createSimulation(reference)
    expect(stepSimulation(ready, reference)).toBe(ready)

    const running = startSimulation(ready)
    const advanced = stepSimulation(running, reference)
    expect(advanced.elapsedTime).toBe(1)

    const paused = pauseSimulation(advanced)
    expect(paused.runStatus).toBe('paused')
    expect(stepSimulation(paused, reference)).toBe(paused)

    const resumed = resumeSimulation(paused)
    expect(stepSimulation(resumed, reference).elapsedTime).toBe(2)
  })

  it('restart returns to the initial state', () => {
    const midway = runToCompletion(createSimulation(reference), reference, 50)
    expect(midway.elapsedTime).toBe(50)
    expect(restartSimulation(reference)).toEqual(createSimulation(reference))
  })

  it('does not step or resume a finished mission', () => {
    const done = run(reference)
    expect(resumeSimulation(done)).toBe(done)
    expect(stepSimulation(done, reference)).toBe(done)
  })

  it('is deterministic', () => {
    expect(run(reference)).toEqual(run(reference))
  })
})

describe('phase transitions', () => {
  it('moves through every phase in order on predefined durations', () => {
    const entered: Partial<Record<SimPhaseId, number>> = {}
    let state = startSimulation(createSimulation(reference))
    entered.launch = 0
    while (state.runStatus === 'running') {
      const before = state.phase
      state = stepSimulation(state, reference)
      if (state.phase !== before) entered[state.phase] = state.elapsedTime
    }
    // Launch 1 day, phasing transfer 21 days, arrival 2 days, landing 3 days.
    expect(entered).toMatchObject({ launch: 0, transit: 1, orbitalArrival: 22, landing: 24, construction: 27 })
    expect(entered.operations).toBeGreaterThan(27)
    expect(entered.completion).toBe(365)
    expect(state.runStatus).toBe('completed')
  })

  it('enters operations only when construction reaches 100%', () => {
    let state = startSimulation(createSimulation(reference))
    while (state.phase !== 'operations' && state.runStatus === 'running') state = stepSimulation(state, reference)
    expect(state.constructionProgress).toBe(100)
  })

  it('pauses construction at night', () => {
    let state = startSimulation(createSimulation(reference))
    while (!(state.phase === 'construction' && state.isLunarNight)) state = stepSimulation(state, reference)
    const progress = state.constructionProgress
    expect(stepSimulation(state, reference).constructionProgress).toBe(progress)
  })
})

describe('events', () => {
  it('triggers solar deployment failure only for low-reliability arrays', () => {
    const highEfficiency = run(makeSetup(swap(REFERENCE, 'pwr-solar-std', 'pwr-solar-hi')))
    expect(fired(highEfficiency)).toContain('solarDeploymentFailure')
    expect(highEfficiency.modifiers.solarGenerationFactor).toBeCloseTo(0.7)
    expect(fired(run(reference))).not.toContain('solarDeploymentFailure')
  })

  it('schedules a communication blackout, longer for a less reliable link', () => {
    const normal = run(reference).eventLog.find((e) => e.eventId === 'communicationBlackout')
    const optical = run(makeSetup(swap(REFERENCE, 'com-xband', 'com-optical'))).eventLog.find((e) => e.eventId === 'communicationBlackout')
    expect(normal?.detail).toContain('3 days')
    expect(optical?.detail).toContain('6 days')
  })

  it('degrades the battery after a deep night discharge', () => {
    const state = run(makeSetup(swap(REFERENCE, 'bat-rfc', 'bat-liion-hc')))
    expect(fired(state)).toContain('batteryDegradation')
    expect(state.modifiers.batteryHealth).toBeLessThan(1)
  })

  it('overheats instruments when payload heat exceeds thermal rejection', () => {
    const hot = swap(REFERENCE, 'pay-dipole', 'pay-mesh')
    expect(fired(run(makeSetup(hot)))).toContain('instrumentOverheating')
    expect(fired(run(makeSetup(swap(hot, 'thm-passive', 'thm-radiator'))))).not.toContain('instrumentOverheating')
  })

  it('delays construction with less reliable robots', () => {
    const rover = run(makeSetup(swap(REFERENCE, 'rob-winch', 'rob-arm')))
    expect(fired(rover)).toContain('roboticConstructionDelay')
    expect(fired(run(reference))).not.toContain('roboticConstructionDelay')
  })

  it('logs successful scientific observations', () => {
    const events = fired(run(reference))
    expect(events).toContain('firstLight')
    expect(events).toContain('scienceTargetReached')
  })
})

describe('outcomes and diagnosis', () => {
  it('succeeds with the reference design', () => {
    const end = run(reference)
    expect(end.outcome?.result).toBe('success')
    expect(end.outcome?.objectives).toEqual({ constructionComplete: true, operationsDaysMet: true, dataReturnMet: true })
  })

  it('fails when propellant runs out before landing', () => {
    const end = run(makeSetup(swap(REFERENCE, 'prp-throttle', 'prp-biprop')))
    expect(end.runStatus).toBe('failed')
    expect(end.failureReason).toBe('propellantDepleted')
    expect(end.outcome?.diagnosis[0].subsystem).toBe('propulsion')
  })

  it('fails when the batteries empty during the lunar night', () => {
    const end = run(makeSetup(swap(REFERENCE, 'bat-rfc', 'bat-liion')))
    expect(end.failureReason).toBe('powerDepleted')
    expect(end.isLunarNight).toBe(true)
    expect(end.outcome?.diagnosis[0].subsystem).toBe('battery')
  })

  it('fails when the budget is exhausted', () => {
    const end = run({ ...reference, startingBudgetMUsd: 5 })
    expect(end.failureReason).toBe('budgetExhausted')
  })

  it('fails at construction without robotic units', () => {
    const end = run(makeSetup(REFERENCE.filter((id) => id !== 'rob-winch')))
    expect(end.failureReason).toBe('noConstructionCapability')
    expect(end.phase).toBe('construction')
  })

  it('reports partial success and diagnoses a downlink bottleneck', () => {
    const end = run(makeSetup(swap(REFERENCE, 'com-xband', 'com-sband')))
    expect(end.outcome?.result).toBe('partial')
    expect(end.outcome?.objectives.dataReturnMet).toBe(false)
    expect(end.outcome?.diagnosis.map((d) => d.subsystem)).toContain('communication')
  })
})
