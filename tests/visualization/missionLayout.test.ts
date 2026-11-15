import { describe, expect, it } from 'vitest'
import { lunarSites } from '../../src/data'
import { focusCameraPosition } from '../../src/features/visualization/animations/cameraFocus'
import { conceptVisualState } from '../../src/features/visualization/animations/missionTimeline'
import { approach } from '../../src/features/visualization/animations/curves'
import { LANDER, braceAnchors, deployedFeet, egressPathLocal, legAngleRad, rampFoot } from '../../src/features/visualization/utilities/landerLayout'
import { cableCount, reflectorPoint, reflectorScale, telescopeRig } from '../../src/features/visualization/utilities/lcrtRig'
import { telescopeDeployment } from '../../src/features/visualization/animations/missionTimeline'
import { missionAssetInfo, missionAssetStatus, presentAssets, resolveSelection, toggleHidden } from '../../src/features/visualization/utilities/missionAssets'
import { landerToWorld } from '../../src/features/visualization/utilities/missionSceneLayout'
import { buildMissionWorld } from '../../src/features/visualization/utilities/missionWorld'
import { DRILL_SITE_X, STOWED_ARM, armPoseForTool, drillTip, reachArmPose, solveTwoLink } from '../../src/features/visualization/utilities/roverLayout'
import { angleDelta, roverCyclePose, routeLengthM, routePeriodS, samplePolyline } from '../../src/features/visualization/utilities/roverRoute'
import { sceneSiteFrom } from '../../src/features/visualization/utilities/sceneSite'

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

describe('rover route', () => {
  it('stays outside the crater rim and clear of the towers', () => {
    for (const { layout, terrain, lcrt } of worlds) {
      const { mainCrater: crater } = terrain.config
      const period = routePeriodS(layout.route)
      for (let t = 0; t < period; t += 0.5) {
        const { position } = roverCyclePose(layout.route, t)
        expect(dist2d(position, crater.x, crater.z)).toBeGreaterThan(crater.radiusM * 1.05)
        for (const tower of lcrt.towerBases) expect(dist2d(position, tower[0], tower[2])).toBeGreaterThan(3)
      }
    }
  })

  it('starts where the egress path ends and keeps clear of rocks', () => {
    for (const { layout, rocks } of worlds) {
      const exit = layout.egressPath[layout.egressPath.length - 1]
      expect(roverCyclePose(layout.route, 0).position[0]).toBeCloseTo(exit[0])
      const period = routePeriodS(layout.route)
      for (let t = 0; t < period; t += 1) {
        const { position } = roverCyclePose(layout.route, t)
        for (const rock of rocks) expect(dist2d(rock.position, position[0], position[2])).toBeGreaterThan(0.9)
      }
    }
  })

  it('stops at each serviced anchor facing it, with the tool running', () => {
    const { layout } = worlds[0]
    const period = routePeriodS(layout.route)
    const toolStops = new Set<number>()
    for (let t = 0; t < period; t += 0.25) {
      const pose = roverCyclePose(layout.route, t)
      if (pose.mode !== 'tool') continue
      toolStops.add(pose.waypoint)
      const target = layout.route.waypoints[pose.waypoint].workTarget!
      const facing = Math.atan2(-(target[2] - pose.position[2]), target[0] - pose.position[0])
      expect(Math.abs(angleDelta(pose.headingRad, facing))).toBeLessThan(1e-6)
    }
    expect(toolStops.size).toBe(layout.roverAnchors.length)
  })

  it('loops forever with an ever-increasing odometer', () => {
    const { layout } = worlds[0]
    const period = routePeriodS(layout.route)
    const odometers = Array.from({ length: 200 }, (_, i) => roverCyclePose(layout.route, (i / 100) * period).odometerM)
    expect(odometers.every((v, i) => i === 0 || v >= odometers[i - 1])).toBe(true)
    expect(roverCyclePose(layout.route, period * 1.5).odometerM).toBeCloseTo(routeLengthM(layout.route) + roverCyclePose(layout.route, period * 0.5).odometerM)
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
