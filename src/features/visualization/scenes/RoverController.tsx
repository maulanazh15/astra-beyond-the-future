import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { Group } from 'three'
import { egressPose, landerPose } from '../animations/missionTimeline'
import type { MissionVisualState } from '../animations/missionTimeline'
import { ReplaceableModel } from '../components/ReplaceableModel'
import { useEasedValue } from '../hooks/useEasedValue'
import type { SpacecraftMaterials } from '../materials/spacecraftMaterials'
import { ConstructionRover } from '../models/rover/ConstructionRover'
import type { RoverMotion } from '../models/rover/ConstructionRover'
import type { Terrain, Vec3 } from '../types/scene'
import { ROVER_STOW_X, LANDER } from '../utilities/landerLayout'
import { landerToWorld } from '../utilities/missionSceneLayout'
import type { MissionSceneLayout } from '../utilities/missionSceneLayout'
import { STOWED_ARM, armPoseForTool } from '../utilities/roverLayout'
import { roverCyclePose, routeSteps, samplePolyline } from '../utilities/roverRoute'

/**
 * Places the construction rover from the mission state: riding the lander's shelf through descent,
 * driving down the ramp, then working its anchor route around the crater rim. Reports the rover's
 * world position through `onMove` so the camera and selection marker can follow it.
 */
export function RoverController({
  layout,
  terrain,
  visual,
  materials,
  animate,
  onMove,
}: {
  layout: MissionSceneLayout
  terrain: Terrain
  visual: MissionVisualState
  materials: SpacecraftMaterials
  animate: boolean
  /** Receives the rover's world position every frame (camera follow, selection marker). */
  onMove: (positionM: Vec3) => void
}) {
  // Same easing as the lander, so the rover rides the shelf and the ramp in step with it.
  const landing = useEasedValue(visual.landing, animate, 1.4)
  const egress = useEasedValue(visual.roverEgress, animate, 1.4)
  const steps = useMemo(() => routeSteps(layout.route), [layout.route])
  const group = useRef<Group>(null)
  const workTime = useRef(0)
  const motion = useRef<RoverMotion>({ odometerM: 0, arm: STOWED_ARM, layingCable: false })
  const working = visual.roverActivity === 'working'
  const { positionM, headingRad } = layout.lander

  useFrame((_, dt) => {
    const g = group.current
    if (!g) return
    const e = egressPose(egress.current)
    let position: Vec3
    let heading = headingRad
    let pitch = 0
    let roll = 0
    let tool = 0
    let driving = false
    if (egress.current < 1e-3 || e.drive <= 0) {
      // Still clamped on the shelf; rides the lander through its descent.
      const altitude = landerPose(landing.current).altitudeM
      position = landerToWorld(positionM, headingRad, [ROVER_STOW_X, LANDER.shelf.topY + altitude, 0])
      motion.current.odometerM = 0
    } else if (e.drive < 1 || (!working && workTime.current === 0)) {
      const s = samplePolyline(layout.egressPath, e.drive)
      // Off the ramp, follow the actual ground rather than the path's pad height.
      const ground = terrain.heightAt(s.position[0], s.position[2])
      position = s.position[1] - ground < 0.05 ? [s.position[0], ground, s.position[2]] : s.position
      heading = s.headingRad
      pitch = s.pitchRad
      motion.current.odometerM = e.drive * 6
      driving = e.drive < 1
    } else {
      if (working && animate) workTime.current += Math.min(dt, 0.1)
      const pose = roverCyclePose(layout.route, workTime.current, steps)
      heading = pose.headingRad
      tool = pose.mode === 'tool' ? pose.tool : 0
      driving = pose.mode === 'drive' && working
      motion.current.odometerM = 6 + pose.odometerM
      const [x, , z] = pose.position
      position = [x, terrain.heightAt(x, z), z]
      // Tilt to the ground under the wheels: sample ahead/behind and left/right.
      const fx = Math.cos(heading)
      const fz = -Math.sin(heading)
      const h = (dx: number, dz: number) => terrain.heightAt(x + dx, z + dz)
      pitch = Math.atan2(h(fx * 0.6, fz * 0.6) - h(-fx * 0.6, -fz * 0.6), 1.2)
      roll = Math.atan2(h(fz * 0.5, -fx * 0.5) - h(-fz * 0.5, fx * 0.5), 1.0)
    }
    g.position.set(...position)
    g.rotation.set(roll, heading, pitch, 'YZX')
    motion.current.arm = tool > 0 ? armPoseForTool(tool) : STOWED_ARM
    motion.current.layingCable = driving
    onMove([position[0], position[1] + 0.5, position[2]])
  })

  return (
    <group ref={group} name="rover-body">
      <ReplaceableModel assetId="rover-deployment">
        <ConstructionRover materials={materials} motion={motion} animate={animate} />
      </ReplaceableModel>
    </group>
  )
}
