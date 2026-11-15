import { describe, expect, it } from 'vitest'
import { componentCatalog, gameplayAssumptions, getMission, getSite, getThermalProfile, launchVehicles, orbitProfiles, simulationConfig } from '../../src/data'
import { createSimulation, isFinished, prepareSimulation, startSimulation, stepSimulation } from '../../src/engine/simulation'
import { conceptStepStart, conceptVisualState, DESCENT_START_ALTITUDE_M, egressPose, landerPose, MISSION_STEPS, missionStep, telescopeDeployment, TOUCHDOWN_AT, visualStateFromSimulation } from '../../src/features/visualization/animations/missionTimeline'
import type { MissionStageId } from '../../src/features/visualization/animations/missionTimeline'
import type { SimulationState } from '../../src/types/simulation'

const mission = getMission('lunar-echo')!
const REFERENCE = ['bus-small', 'prp-throttle', 'pwr-solar-std', 'bat-rfc', 'com-xband', 'pay-dipole', 'lnd-legs', 'thm-passive', 'rob-winch']

function flyMission(ids: string[], launchVehicleId = 'lv-heavy') {
  const entries = ids.map((componentId) => ({ componentId, quantity: 1 }))
  const setup = prepareSimulation({
    mission,
    entries,
    catalog: componentCatalog,
    launchVehicle: launchVehicles.find((lv) => lv.id === launchVehicleId),
    orbit: orbitProfiles.find((o) => o.id === 'orb-phasing'),
    assumptions: gameplayAssumptions,
    config: simulationConfig,
    thermal: getThermalProfile(getSite(mission.site.defaultSiteId)),
  })
  const context = {
    landingStartDay: setup.phaseDays.launch + setup.phaseDays.transit + setup.phaseDays.orbitalArrival,
    landingDays: setup.phaseDays.landing,
    hasRover: ids.includes('rob-rover'),
    hasRobotics: setup.constructionPercentPerDay > 0,
  }
  const states: SimulationState[] = []
  let state = startSimulation(createSimulation(setup))
  states.push(state)
  while (!isFinished(state) && states.length < 5000) {
    state = stepSimulation(state, setup)
    states.push(state)
  }
  return { setup, states, visuals: states.map((s) => visualStateFromSimulation(s, context)), context }
}

const ORDER: MissionStageId[] = ['inTransit', 'descent', 'surface', 'construction', 'operational']
const nonDecreasing = (values: number[]) => values.every((v, i) => i === 0 || v >= values[i - 1] - 1e-9)

describe('lander animation curve', () => {
  it('starts high with legs folded and ends landed with the engine off', () => {
    const start = landerPose(0)
    expect(start.altitudeM).toBe(DESCENT_START_ALTITUDE_M)
    expect(start.legDeploy).toBe(0)
    expect(start.throttle).toBeGreaterThan(0.5)
    const end = landerPose(1)
    expect(end).toMatchObject({ altitudeM: 0, legDeploy: 1, throttle: 0, touchedDown: true, dust: 0 })
  })

  it('locks the legs down before touchdown and descends monotonically', () => {
    const samples = Array.from({ length: 101 }, (_, i) => landerPose(i / 100))
    expect(nonDecreasing(samples.map((p) => -p.altitudeM))).toBe(true)
    expect(landerPose(TOUCHDOWN_AT - 0.01).legDeploy).toBe(1)
    expect(landerPose(TOUCHDOWN_AT).altitudeM).toBeCloseTo(0)
    // Engine still running at touchdown, shut down shortly after.
    expect(landerPose(TOUCHDOWN_AT).throttle).toBeGreaterThan(0)
    expect(landerPose(0.9).throttle).toBe(0)
  })

  it('kicks up dust only near the ground with the engine running', () => {
    expect(landerPose(0.1).dust).toBe(0)
    expect(landerPose(TOUCHDOWN_AT - 0.03).dust).toBeGreaterThan(0)
  })

  it('opens the ramp before the rover drives', () => {
    expect(egressPose(0)).toEqual({ clampsReleased: false, ramp: 0, drive: 0 })
    expect(egressPose(0.3).drive).toBe(0)
    expect(egressPose(0.34).ramp).toBe(1)
    expect(egressPose(1)).toEqual({ clampsReleased: true, ramp: 1, drive: 1 })
  })
})

describe('telescope deployment steps', () => {
  it('runs anchors → towers → cables → reflector → receiver, each 0…1', () => {
    const samples = Array.from({ length: 201 }, (_, i) => telescopeDeployment(i / 200))
    for (const key of ['anchors', 'towers', 'cables', 'reflector', 'receiver'] as const) {
      expect(nonDecreasing(samples.map((s) => s[key]))).toBe(true)
    }
    expect(telescopeDeployment(0)).toEqual({ anchors: 0, towers: 0, cables: 0, reflector: 0, receiver: 0 })
    expect(telescopeDeployment(1)).toEqual({ anchors: 1, towers: 1, cables: 1, reflector: 1, receiver: 1 })
    // The receiver is hoisted only once the reflector is nearly unfurled.
    const firstReceiver = samples.find((s) => s.receiver > 0)!
    expect(firstReceiver.reflector).toBeGreaterThan(0.85)
  })
})

describe('concept playback', () => {
  it('moves through the stages in order and ends operational', () => {
    const stages = Array.from({ length: 101 }, (_, i) => conceptVisualState(i / 100).stage)
    const indices = stages.map((s) => ORDER.indexOf(s))
    expect(nonDecreasing(indices)).toBe(true)
    expect(stages[0]).toBe('descent')
    expect(stages[100]).toBe('operational')
    expect(conceptVisualState(1)).toMatchObject({ receiverActive: true, telescope: 1, roverEgress: 1, landing: 1 })
  })

  it('delivers the telescope only after touchdown', () => {
    expect(conceptVisualState(0.1).telescopeVisible).toBe(false)
    expect(conceptVisualState(0.25).telescopeVisible).toBe(true)
  })
})

describe('mission sequence (nine steps)', () => {
  it('plays all nine steps in order through the concept playback', () => {
    const seen: string[] = []
    for (let i = 0; i <= 2000; i += 1) {
      const step = missionStep(conceptVisualState(i / 2000))
      if (step && seen[seen.length - 1] !== step) seen.push(step)
    }
    expect(seen).toEqual(MISSION_STEPS.map((s) => s.id))
  })

  it('never captions egress once the step bar has moved on to the anchors', () => {
    for (let i = 0; i <= 2000; i += 1) {
      const v = conceptVisualState(i / 2000)
      if (missionStep(v) === 'anchors') expect(v.caption).not.toMatch(/egress/)
    }
  })

  it('jumps land inside the chosen step', () => {
    for (const { id } of MISSION_STEPS) expect(missionStep(conceptVisualState(conceptStepStart(id)))).toBe(id)
  })

  it('shows no step before the lander arrives or when it is lost before the landing burn', () => {
    const lost = { ...conceptVisualState(0), stage: 'lost' as const, landing: 0, failed: true }
    expect(missionStep(lost)).toBeNull()
    expect(missionStep({ ...conceptVisualState(0), stage: 'inTransit' })).toBeNull()
  })

  it('reaches operations only with the receiver on in the concept playback', () => {
    const end = conceptVisualState(1)
    expect(missionStep(end)).toBe('operations')
    expect(end.receiverActive).toBe(true)
    expect(conceptVisualState(conceptStepStart('receiver')).receiverActive).toBe(false)
  })
})

describe('visual state from the simulation', () => {
  it('follows a successful run: transit, descent, construction, operations', () => {
    const { visuals, states } = flyMission([...REFERENCE, 'rob-rover'])
    expect(states[states.length - 1].runStatus).toBe('completed')
    expect(nonDecreasing(visuals.map((v) => ORDER.indexOf(v.stage)))).toBe(true)
    for (const stage of ['inTransit', 'descent', 'construction', 'operational'] as const) expect(visuals.some((v) => v.stage === stage)).toBe(true)
    expect(nonDecreasing(visuals.map((v) => v.landing))).toBe(true)
    expect(nonDecreasing(visuals.map((v) => v.telescope))).toBe(true)
    // The lander is never shown before the landing phase.
    states.forEach((s, i) => {
      if (s.phase === 'launch' || s.phase === 'transit' || s.phase === 'orbitalArrival') expect(visuals[i].landerVisible).toBe(false)
    })
  })

  it('takes construction progress straight from the engine', () => {
    const { visuals, states } = flyMission([...REFERENCE, 'rob-rover'])
    states.forEach((s, i) => expect(visuals[i].telescope).toBeCloseTo(s.constructionProgress / 100))
  })

  it('switches the receiver on exactly while the instrument observes', () => {
    const { visuals, states } = flyMission([...REFERENCE, 'rob-rover'])
    states.forEach((s, i) => {
      const observing = s.runStatus !== 'failed' && (s.instrumentStatus === 'operating' || s.instrumentStatus === 'degraded')
      expect(visuals[i].receiverActive).toBe(observing)
    })
    expect(visuals.some((v) => v.receiverActive)).toBe(true)
  })

  it('parks the rover at night and works by day during construction', () => {
    const { visuals, states } = flyMission([...REFERENCE, 'rob-rover'])
    states.forEach((s, i) => {
      if (s.phase !== 'construction' || s.runStatus === 'failed') return
      const stalled = s.elapsedTime < s.modifiers.constructionStallUntilDay
      expect(visuals[i].roverActivity).toBe(s.isLunarNight || stalled ? 'parked' : 'working')
    })
  })

  it('leaves the rover out of designs without one', () => {
    const { visuals } = flyMission(REFERENCE)
    expect(visuals.every((v) => !v.roverPresent && v.roverEgress === 0)).toBe(true)
  })

  it('shows nothing on the surface when the mission is lost at launch', () => {
    const { visuals, states } = flyMission(REFERENCE, 'lv-medium')
    const last = visuals[visuals.length - 1]
    expect(states[states.length - 1].runStatus).toBe('failed')
    expect(last).toMatchObject({ stage: 'lost', failed: true, landerVisible: false, telescopeVisible: false })
  })

  it('keeps the telescope stowed when no robotics can build it', () => {
    const { visuals, states } = flyMission(REFERENCE.filter((id) => id !== 'rob-winch'))
    const last = visuals[visuals.length - 1]
    expect(states[states.length - 1].failureReason).toBe('noConstructionCapability')
    expect(last).toMatchObject({ failed: true, landerVisible: true, telescope: 0 })
    expect(last.caption).toMatch(/robotics/i)
  })

  it('reads the state without changing it', () => {
    const { states, context } = flyMission([...REFERENCE, 'rob-rover'])
    const state = states[Math.floor(states.length / 2)]
    const frozen = structuredClone(state)
    visualStateFromSimulation(Object.freeze(state), context)
    expect(state).toEqual(frozen)
  })

})
