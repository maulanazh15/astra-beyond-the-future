import { describe, expect, it } from 'vitest'
import { lcrtReference, lunarSites } from '../../src/data'
import { focusCameraPosition } from '../../src/features/visualization/animations/cameraFocus'
import { conceptVisualState } from '../../src/features/visualization/animations/missionTimeline'
import { approach } from '../../src/features/visualization/animations/curves'
import { LANDER, braceAnchors, deployedFeet, egressPathLocal, legAngleRad, rampFoot } from '../../src/features/visualization/utilities/landerLayout'
import { anchorInstallProgress, cableCount, reflectorPoint, reflectorScale, telescopeRig } from '../../src/features/visualization/utilities/lcrtRig'
import { telescopeDeployment } from '../../src/features/visualization/animations/missionTimeline'
import { missionAssetInfo, missionAssetStatus, presentAssets, resolveSelection, toggleHidden } from '../../src/features/visualization/utilities/missionAssets'
import { defaultMissionSceneConfig, landerToWorld } from '../../src/features/visualization/utilities/missionSceneLayout'
import { buildMissionWorld } from '../../src/features/visualization/utilities/missionWorld'
import { DRILL_SITE_X, STOWED_ARM, armPoseForTool, drillTip, reachArmPose, solveTwoLink } from '../../src/features/visualization/utilities/roverLayout'
import { angleDelta, roverCyclePose, routeLengthM, routePeriodS, routePoseAt, samplePolyline, stepsDurationS } from '../../src/features/visualization/utilities/roverRoute'
import { roverMissionPose } from '../../src/features/visualization/utilities/roverMission'
import { sceneSiteFrom } from '../../src/features/visualization/utilities/sceneSite'
import { scaleRatio, telescopeScale } from '../../src/features/visualization/utilities/sceneScale'

const worlds = lunarSites.map((s) => buildMissionWorld(sceneSiteFrom(s)))
const dist2d = (a: readonly number[], x: number, z: number) => Math.hypot(a[0] - x, a[2] - z)

describe('lander layout', () => {
  it('puts all four footpads on the levelled pad and clear of the payload shelf', () => {
    for (const world of worlds) {
      const { positionM, headingRad } = world.layout.lander
      for (const foot of deployedFeet()) {
        const [x, , z] = landerToWorld(positionM, headingRad, foot)
        expect(Math.abs(world.terrain.heightAt(x, z) - positionM[1])).toBeLessThan(0.01)
        // Feet stay outside the shelf and ramp corridor (|z| ≤ half width).
        expect(Math.abs(foot[2])).toBeGreaterThan(LANDER.shelf.halfWidthM + 0.3)
      }
    }
  })

  it('folds the legs up for launch and the secondary struts reach both positions', () => {
    expect(legAngleRad(0)).toBeGreaterThan(1)
    expect(legAngleRad(1)).toBeLessThan(0)
    expect(braceAnchors(Math.PI / 4)).toHaveLength(2)
  })

  it('runs the egress path from the shelf down the ramp to the ground', () => {
    const path = egressPathLocal()
    expect(path[0][1]).toBe(LANDER.shelf.topY)
    expect(path[path.length - 1][1]).toBe(0)
    expect(rampFoot()[0]).toBeGreaterThan(LANDER.shelf.outerX)
    // The ramp slope stays drivable (< 45°).
    expect(samplePolyline(path, 0.6).pitchRad).toBeGreaterThan(-Math.PI / 4)
  })
})

describe('telescope placement', () => {
  it('keeps the reflector above the crater floor and anchors on the terrain', () => {
    for (const { lcrt, terrain } of worlds) {
      expect(lcrt.clearanceM).toBeGreaterThan(0.5)
      expect(lcrt.anchors).toHaveLength(12)
      for (const a of [...lcrt.anchors, ...lcrt.guyAnchors]) expect(a[1]).toBeCloseTo(terrain.heightAt(a[0], a[2]), 6)
    }
  })

  it('unfurls the reflector as an inner cap of the same paraboloid', () => {
    const { lcrt } = worlds[0]
    const s = reflectorScale(0.5)
    const p = reflectorPoint(lcrt, s, 0.3)
    const r = Math.hypot(p[0] - lcrt.center.x, p[2] - lcrt.center.z)
    expect(p[1] - lcrt.dishVertexY).toBeCloseTo(lcrt.dishSagM * (r / lcrt.dishRadiusM) ** 2)
  })

  it('folds into the canister, then rigs every cable and hangs the receiver at the focus', () => {
    const { lcrt } = worlds[0]
    const folded = telescopeRig(lcrt, telescopeDeployment(0))
    expect(folded.cables).toHaveLength(0)
    expect(folded.reflectorScale).toBeLessThan(0.1)
    const done = telescopeRig(lcrt, telescopeDeployment(1))
    expect(done.cables.length).toBeLessThanOrEqual(cableCount(lcrt))
    expect(done.cables.length).toBeGreaterThan(lcrt.anchors.length * 2)
    done.receiver.forEach((v, i) => expect(v).toBeCloseTo(lcrt.receiver[i]))
    // Suspension cables end exactly on the reflector rim.
    const rimY = lcrt.dishVertexY + lcrt.dishSagM
    expect(done.cables.slice(0, lcrt.anchors.length).every((c) => Math.abs(c.to[1] - rimY) < 1e-9)).toBe(true)
  })
})

/** Rover poses along the whole one-way tour: anchor route, then the drive to the winch. */
function tour(layout: (typeof worlds)[number]['layout'], stepS = 0.5) {
  const poses = []
  for (const [route, steps] of [[layout.route, layout.routeSteps], [layout.service.route, layout.service.steps]] as const) {
    const period = stepsDurationS(steps)
    for (let t = 0; t <= period; t += stepS) poses.push(routePoseAt(route, t, steps))
  }
  return poses
}

describe('rover route', () => {
  it('stays outside the crater rim and clear of the towers', () => {
    for (const { layout, terrain, lcrt } of worlds) {
      const { mainCrater: crater } = terrain.config
      for (const { position } of tour(layout)) {
        expect(dist2d(position, crater.x, crater.z)).toBeGreaterThan(crater.radiusM * 1.05)
        for (const tower of lcrt.towerBases) expect(dist2d(position, tower[0], tower[2])).toBeGreaterThan(3)
      }
    }
  })

  it('starts where the egress path ends and keeps clear of rocks', () => {
    for (const { layout, rocks } of worlds) {
      const exit = layout.egressPath[layout.egressPath.length - 1]
      expect(routePoseAt(layout.route, 0, layout.routeSteps).position[0]).toBeCloseTo(exit[0])
      for (const { position } of tour(layout, 1)) {
        for (const rock of rocks) expect(dist2d(rock.position, position[0], position[2])).toBeGreaterThan(0.9)
      }
    }
    // Dense check over a full-rim tour on every site: allow for slow CI machines.
  }, 30_000)

  it('drills every rim anchor once, facing it, and ends docked beside a tower winch', () => {
    for (const { layout, lcrt } of worlds) {
      const toolStops = new Set<number>()
      for (const pose of tour(layout, 0.25)) {
        if (pose.mode !== 'tool' || pose.tool >= 1) continue
        const target = layout.route.waypoints[pose.waypoint]?.workTarget
        if (!target) continue
        toolStops.add(pose.waypoint)
        const facing = Math.atan2(-(target[2] - pose.position[2]), target[0] - pose.position[0])
        expect(Math.abs(angleDelta(pose.headingRad, facing))).toBeLessThan(1e-6)
      }
      expect(toolStops.size).toBe(lcrt.anchors.length)
      const end = routePoseAt(layout.service.route, 1e9, layout.service.steps)
      const { winchM } = layout.service
      expect(dist2d(winchM, end.position[0], end.position[2])).toBeCloseTo(defaultMissionSceneConfig.winchStandoffM, 5)
      expect(Math.abs(angleDelta(end.headingRad, Math.atan2(-(winchM[2] - end.position[2]), winchM[0] - end.position[0])))).toBeLessThan(1e-6)
    }
  })

  it('is one-way and clamped: the odometer only grows and the pose holds at the end', () => {
    const { layout } = worlds[0]
    const period = stepsDurationS(layout.routeSteps)
    const odometers = Array.from({ length: 200 }, (_, i) => routePoseAt(layout.route, (i / 150) * period, layout.routeSteps).odometerM)
    expect(odometers.every((v, i) => i === 0 || v >= odometers[i - 1])).toBe(true)
    expect(routePoseAt(layout.route, period * 3, layout.routeSteps)).toEqual(routePoseAt(layout.route, period, layout.routeSteps))
    // The looping cycle used by the idle model is unchanged.
    expect(roverCyclePose(layout.route, routePeriodS(layout.route) * 1.5).odometerM).toBeCloseTo(routeLengthM(layout.route) + roverCyclePose(layout.route, routePeriodS(layout.route) * 0.5).odometerM)
  })

  it('schedules each anchor while the rover drills it, one after another', () => {
    for (const { layout, lcrt } of worlds) {
      const windows = layout.anchorSchedule
      expect(windows).toHaveLength(lcrt.anchors.length)
      const ordered = [...windows].sort((a, b) => a.start - b.start)
      ordered.forEach((w, i) => {
        expect(w.start).toBeGreaterThanOrEqual(0)
        expect(w.end).toBeLessThanOrEqual(1 + 1e-9)
        expect(w.end).toBeGreaterThan(w.start)
        if (i > 0) expect(w.start).toBeGreaterThanOrEqual(ordered[i - 1].end)
      })
      // The first anchor drilled is the one nearest the lander.
      const first = lcrt.anchors[windows.indexOf(ordered[0])]
      const pad = layout.lander.positionM
      expect(Math.min(...lcrt.anchors.map((a) => dist2d(a, pad[0], pad[2])))).toBeCloseTo(dist2d(first, pad[0], pad[2]))
    }
  })
})

describe('rover mission pose (progress-driven)', () => {
  const { layout, lcrt } = worlds[0]
  const sequence = (n: number) =>
    Array.from({ length: n + 1 }, (_, i) => {
      const t = i / n
      const v = conceptVisualState(t)
      return { t, v, pose: roverMissionPose(layout, { landing: v.landing, egress: v.roverEgress, telescope: v.telescope }) }
    })

  it('is a pure function of progress: the same progress always gives the same pose', () => {
    for (const t of [0, 0.1, 0.2, 0.3, 0.45, 0.6, 0.8, 1]) {
      const v = conceptVisualState(t)
      const input = { landing: v.landing, egress: v.roverEgress, telescope: v.telescope }
      expect(roverMissionPose(layout, input)).toEqual(roverMissionPose(layout, { ...input }))
    }
  })

  it('runs the phases in order without teleporting, and the odometer never runs backwards', () => {
    const order = ['shelf', 'egress', 'anchors', 'service', 'docked', 'parked']
    const steps = sequence(4000)
    let phase = 0
    steps.forEach(({ pose }, i) => {
      const k = order.indexOf(pose.phase)
      expect(k).toBeGreaterThanOrEqual(phase)
      phase = k
      if (i === 0) return
      const prev = steps[i - 1].pose
      expect(pose.odometerM).toBeGreaterThanOrEqual(prev.odometerM - 1e-9)
      // Off the shelf, the rover never jumps more than a couple of meters between neighbouring frames.
      if (prev.phase !== 'shelf') expect(Math.hypot(pose.positionM[0] - prev.positionM[0], pose.positionM[2] - prev.positionM[2])).toBeLessThan(2.5)
    })
    expect(new Set(steps.map((s) => s.pose.phase))).toEqual(new Set(order))
  })

  it('rides the lander through descent and drills each anchor exactly while it appears', () => {
    const descent = conceptVisualState(0.05)
    const shelf = roverMissionPose(layout, { landing: descent.landing, egress: 0, telescope: 0 })
    expect(shelf.phase).toBe('shelf')
    expect(shelf.positionM[1]).toBeGreaterThan(layout.lander.positionM[1] + 5)
    const drilled = new Set<number>()
    for (const { v, pose } of sequence(6000)) {
      if (pose.drillingAnchor === null) continue
      drilled.add(pose.drillingAnchor)
      const k = anchorInstallProgress(telescopeDeployment(v.telescope).anchors, layout.anchorSchedule)[pose.drillingAnchor]
      expect(k).toBeGreaterThanOrEqual(0)
      expect(k).toBeLessThanOrEqual(1)
      expect(pose.armTool).toBeGreaterThan(0)
    }
    expect(drilled.size).toBe(lcrt.anchors.length)
  })

  it('ends parked at the winch with the arm stowed once the reflector is out', () => {
    const end = roverMissionPose(layout, { landing: 1, egress: 1, telescope: 1 })
    expect(end.phase).toBe('parked')
    expect(end.armTool).toBe(0)
    const docked = roverMissionPose(layout, { landing: 1, egress: 1, telescope: 0.7 })
    expect(docked.phase).toBe('docked')
    expect(docked.positionM).toEqual(end.positionM)
  })
})

describe('rover arm', () => {
  it('reaches the drill site with the drill vertical, and stays stowed outside tool use', () => {
    const reach = reachArmPose()
    const tip = drillTip({ ...reach, drill: 1 })
    expect(tip[0]).toBeCloseTo(DRILL_SITE_X)
    expect(tip[1]).toBeCloseTo(0.02)
    expect(reach.shoulder + reach.elbow + reach.wrist).toBeCloseTo(-Math.PI / 2)
    expect(armPoseForTool(0)).toBe(STOWED_ARM)
    expect(armPoseForTool(0.5).drill).toBeGreaterThan(0)
    expect(solveTwoLink(5, 0, 0.4, 0.4)).toBeUndefined()
  })
})

describe('selection, visibility, and info', () => {
  const visual = conceptVisualState(1)

  it('lists present assets and drops selections that are hidden or absent', () => {
    expect(presentAssets(visual)).toEqual(['lander', 'telescope', 'rover'])
    expect(presentAssets(conceptVisualState(0.05))).toEqual(['lander', 'rover'])
    const hidden = toggleHidden(new Set(), 'rover')
    expect(hidden.has('rover')).toBe(true)
    expect(toggleHidden(hidden, 'rover').has('rover')).toBe(false)
    expect(resolveSelection('rover', visual, hidden)).toBeNull()
    expect(resolveSelection('telescope', conceptVisualState(0.05), new Set())).toBeNull()
    expect(resolveSelection('lander', visual, hidden)).toBe('lander')
  })

  it('describes each asset, marking the telescope as a hypothetical concept', () => {
    const { lcrt } = worlds[0]
    const telescope = missionAssetInfo('telescope', lcrt)
    expect(telescope.provenance).toMatch(/Hypothetical/)
    expect(telescope.provenance).toMatch(/Not an operational NASA mission/)
    expect(missionAssetInfo('lander', lcrt).provenance).toBeUndefined()
    expect(missionAssetStatus('telescope', visual)).toMatch(/Operational/)
    expect(missionAssetStatus('rover', { ...visual, roverPresent: false })).toBe('Not in this design')
  })
})

describe('camera helpers', () => {
  it('focuses from the current viewing direction, never below the minimum elevation', () => {
    const p = focusCameraPosition([10, 5, 0], [0, 0, 0], [100, 0, 100], 10)
    expect(Math.hypot(p[0] - 100, p[1], p[2] - 100)).toBeCloseTo(10)
    const low = focusCameraPosition([10, -1, 0], [0, 0, 0], [0, 0, 0], 10, 12)
    expect(low[1]).toBeCloseTo(10 * Math.sin((12 * Math.PI) / 180))
  })

  it('eases toward a target independently of frame rate', () => {
    let a = 0
    for (let i = 0; i < 60; i += 1) a = approach(a, 1, 2, 1 / 60)
    let b = 0
    for (let i = 0; i < 30; i += 1) b = approach(b, 1, 2, 1 / 30)
    expect(a).toBeCloseTo(b, 6)
    expect(approach(0.99995, 1, 2, 0.016)).toBe(1)
  })
})

describe('telescope scale representation', () => {
  it('states the compressed gameplay scale against the sourced LCRT concept, never as full size', () => {
    for (const { lcrt } of worlds) {
      const scale = telescopeScale(lcrt, lcrtReference)
      expect(scale.reflectorConceptM).toBe(lcrtReference.reflectorDiameterM.value)
      expect(scale.reflectorSceneM).toBeCloseTo(lcrt.dishRadiusM * 2)
      expect(scale.reflectorFactor).toBeGreaterThan(5)
      expect(scale.craterFactor).toBeCloseTo((lcrtReference.craterDiameterKm.value * 1000) / (lcrt.craterRadiusM * 2))
      const info = missionAssetInfo('telescope', lcrt)
      expect(info.provenance).toContain(scaleRatio(scale.reflectorFactor))
      expect(info.provenance).toContain('compressed gameplay scale')
      expect(info.provenance).toContain('Not an operational NASA mission')
      // The scene size is always labelled as such next to the concept size.
      expect(info.specs.find((s) => s.label === 'Reflector (scene)')?.value).toBe(`${scale.reflectorSceneM.toFixed(0)} m dia.`)
      expect(info.specs.find((s) => s.label === 'Concept')?.value).toBe('350 m dia.')
    }
  })

  it('keeps the stand-in internally consistent: receiver at the focal point, towers above it', () => {
    for (const { lcrt } of worlds) {
      expect(lcrt.receiver[1] - lcrt.dishVertexY).toBeCloseTo(lcrt.dishRadiusM ** 2 / (4 * lcrt.dishSagM))
      for (const base of lcrt.towerBases) expect(base[1] + lcrt.towerHeightM).toBeGreaterThan(lcrt.receiver[1])
      expect(lcrt.dishRadiusM).toBeLessThan(lcrt.craterRadiusM)
    }
  })
})
