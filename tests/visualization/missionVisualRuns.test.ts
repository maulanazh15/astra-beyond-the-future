/**
 * The 3D surface view against real simulation runs: each design below is launched and stepped one
 * day at a time by the engine (exactly as Mission Control does), and every state is mapped to what
 * the scene would show. Nothing here changes the simulation.
 */
import { describe, expect, it } from 'vitest'
import { getMission, lunarSites } from '../../src/data'
import { isFinished, stepSimulation } from '../../src/engine/simulation'
import { launchRun } from '../../src/features/mission-session/simulationRuns'
import { MISSION_STEPS, missionStep, missionStepIndex, simulationVisualContext, visualStateFromSimulation } from '../../src/features/visualization/animations/missionTimeline'
import type { MissionVisualState } from '../../src/features/visualization/animations/missionTimeline'
import { buildMissionWorld } from '../../src/features/visualization/utilities/missionWorld'
import { roverMissionPose } from '../../src/features/visualization/utilities/roverMission'
import { sceneSiteFrom } from '../../src/features/visualization/utilities/sceneSite'
import type { SimulationState } from '../../src/types/simulation'

const mission = getMission('lunar-echo')!
const BASE = ['bus-small', 'prp-throttle', 'pwr-solar-std', 'bat-rfc', 'com-xband', 'pay-dipole', 'lnd-legs', 'thm-passive', 'rob-winch', 'rob-rover']
const swap = (from: string, to: string | null) => BASE.flatMap((id) => (id === from ? (to ? [to] : []) : [id]))
const { layout } = buildMissionWorld(sceneSiteFrom(lunarSites[0]))

type Frame = { state: SimulationState; visual: MissionVisualState }

/** Launches a design and records the visual state after every simulated day. */
function replay(ids: string[], launchVehicleId = 'lv-heavy', orbitId = 'orb-phasing'): Frame[] {
  const run = launchRun(mission, { entries: ids.map((componentId) => ({ componentId, quantity: 1 })), launchVehicleId, orbitId, siteId: mission.site.defaultSiteId })
  const context = simulationVisualContext(run.setup, ids)
  const frames: Frame[] = []
  let state = run.state
  frames.push({ state, visual: visualStateFromSimulation(state, context) })
  while (!isFinished(state)) {
    state = stepSimulation(state, run.setup)
    frames.push({ state, visual: visualStateFromSimulation(state, context) })
  }
  return frames
}

const roverPose = (v: MissionVisualState) => roverMissionPose(layout, { landing: v.landing, egress: v.roverEgress, telescope: v.telescope })
const last = (frames: Frame[]) => frames[frames.length - 1]

/** Invariants that hold for every state of every run. */
function expectHonest(frames: Frame[]) {
  let best = -1
  for (const { state, visual } of frames) {
    // Never imply a working observatory that the simulation does not have.
    if (visual.receiverActive) {
      expect(visual.failed).toBe(false)
      expect(visual.telescope).toBeGreaterThanOrEqual(1)
    }
    if (visual.stage === 'operational') expect(state.constructionProgress).toBeGreaterThanOrEqual(100)
    expect(visual.telescope).toBeCloseTo(state.constructionProgress / 100)
    // The sequence never runs backwards.
    const step = missionStep(visual)
    if (step) {
      expect(missionStepIndex(step)).toBeGreaterThanOrEqual(best)
      best = missionStepIndex(step)
    }
  }
}

describe('A. successful mission', () => {
  const frames = replay(BASE)

  it('completes and plays every stage in order up to telescope operations', () => {
    expect(last(frames).state.outcome?.result).toBe('success')
    expectHonest(frames)
    const steps = frames.map((f) => missionStep(f.visual)).filter((s) => s !== null)
    expect(steps[0]).toBe('descent')
    expect(steps[steps.length - 1]).toBe('operations')
    for (const id of ['descent', 'landing', 'anchors', 'reflector', 'receiver', 'operations'] as const) expect(steps).toContain(id)
    expect(frames.some((f) => f.visual.receiverActive)).toBe(true)
    expect(last(frames).visual.telescope).toBe(1)
  })

  it('replays to exactly the same visual sequence', () => {
    expect(replay(BASE).map((f) => f.visual)).toEqual(frames.map((f) => f.visual))
  })

  it('reaches the end of the rover tour: parked at the winch, arm stowed', () => {
    expect(roverPose(last(frames).visual).phase).toBe('parked')
  })
})

describe('B. launch failure', () => {
  const frames = replay(BASE, 'lv-medium')

  it('leaves the lunar site empty: no landing, no construction', () => {
    expect(last(frames).state.failureReason).toBe('launchOverCapacity')
    expectHonest(frames)
    for (const { visual } of frames) {
      expect(visual.landerVisible).toBe(false)
      expect(visual.telescopeVisible).toBe(false)
      expect(visual.roverEgress).toBe(0)
      expect(missionStep(visual)).toBeNull()
    }
    expect(last(frames).visual.caption).toMatch(/Lost at launch/)
  })
})

describe('C. landing failure', () => {
  it('lost during the descent: lander gone, no rover deployment, no telescope', () => {
    const frames = replay(swap('prp-throttle', 'prp-biprop'), 'lv-heavy', 'orb-direct')
    const end = last(frames)
    expect(end.state.failureReason).toBe('propellantDepleted')
    expect(end.state.phase).toBe('landing')
    expectHonest(frames)
    expect(end.visual.stage).toBe('lost')
    expect(end.visual.landerVisible).toBe(false)
    expect(end.visual.telescopeVisible).toBe(false)
    expect(['descent', 'landing']).toContain(missionStep(end.visual))
    expect(frames.every((f) => f.visual.roverEgress === 0 && f.visual.telescope === 0)).toBe(true)
  })

  it('out of propellant on the last landing day: down, but the sequence stops at touchdown', () => {
    const frames = replay(BASE, 'lv-heavy', 'orb-direct')
    const end = last(frames)
    expect(end.state.failureReason).toBe('propellantDepleted')
    expect(end.state.phase).toBe('landing')
    expectHonest(frames)
    expect(missionStep(end.visual)).toBe('touchdown')
    expect(end.visual.roverEgress).toBe(0)
    expect(roverPose(end.visual).phase).toBe('shelf')
    expect(frames.some((f) => f.visual.receiverActive || f.visual.stage === 'operational')).toBe(false)
  })
})

describe('D. construction interrupted', () => {
  for (const [name, ids, reason] of [
    ['power depleted', swap('bat-rfc', 'bat-liion'), 'powerDepleted'],
    ['electronics frozen', swap('bat-rfc', 'bat-liion').filter((id) => id !== 'thm-passive'), 'electronicsFrozen'],
  ] as const) {
    it(`${name}: the telescope stays at its incomplete state and the rover stops where it was`, () => {
      const frames = replay([...ids])
      const end = last(frames)
      expect(end.state.failureReason).toBe(reason)
      expect(end.state.phase).toBe('construction')
      expectHonest(frames)
      const progress = end.state.constructionProgress / 100
      expect(progress).toBeGreaterThan(0)
      expect(progress).toBeLessThan(1)
      expect(end.visual.telescope).toBeCloseTo(progress)
      expect(end.visual.failed).toBe(true)
      expect(end.visual.receiverActive).toBe(false)
      expect(end.visual.roverActivity).toBe('parked')
      expect(missionStep(end.visual)).not.toBe('operations')
      // The rover pose depends only on progress, so it is exactly the pose of the last working day.
      const before = frames[frames.length - 2].visual
      if (before.telescope === end.visual.telescope) expect(roverPose(end.visual)).toEqual(roverPose(before))
    })
  }

  it('no robotics on board: the telescope stays stowed and the failure is named', () => {
    const frames = replay(BASE.filter((id) => !id.startsWith('rob-')))
    const end = last(frames)
    expect(end.state.failureReason).toBe('noConstructionCapability')
    expectHonest(frames)
    expect(end.visual.roverPresent).toBe(false)
    expect(end.visual.telescope).toBe(0)
    expect(end.visual.caption).toMatch(/No robotics/)
  })
})

describe('E. lunar night and robotic delay', () => {
  const frames = replay(BASE)
  const building = frames.filter((f) => f.state.phase === 'construction')

  it('parks the rover and dims the scene through the night, freezing construction', () => {
    const nights = building.filter((f) => f.state.isLunarNight)
    expect(nights.length).toBeGreaterThan(5)
    for (const { visual } of nights) {
      expect(visual.night).toBe(true)
      expect(visual.roverActivity).toBe('parked')
      expect(visual.caption).toMatch(/Lunar night/)
    }
    // A night day after a night day: no progress, so the rover has not moved.
    for (let i = 1; i < building.length; i += 1) {
      const [a, b] = [building[i - 1], building[i]]
      if (a.state.isLunarNight && b.state.isLunarNight) expect(roverPose(b.visual)).toEqual(roverPose(a.visual))
    }
  })

  it('names the robotic construction delay and holds progress while it lasts', () => {
    const stalled = building.filter((f) => f.state.elapsedTime < f.state.modifiers.constructionStallUntilDay && !f.state.isLunarNight)
    expect(stalled.length).toBeGreaterThan(0)
    for (const { visual } of stalled) {
      expect(visual.caption).toMatch(/Robotic construction delay/)
      expect(visual.roverActivity).toBe('parked')
    }
  })

  it('covers the whole nine-step sequence definition', () => {
    expect(MISSION_STEPS.map((s) => s.id)).toEqual(['descent', 'landing', 'touchdown', 'roverDeploy', 'egress', 'anchors', 'reflector', 'receiver', 'operations'])
  })
})
