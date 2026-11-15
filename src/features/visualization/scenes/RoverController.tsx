import { useFrame } from '@react-three/fiber'
import { memo, useRef } from 'react'
import type { Group } from 'three'
import { MISSION_EASE } from '../animations/missionTimeline'
import { ReplaceableModel } from '../components/ReplaceableModel'
import { useEasedValue } from '../hooks/useEasedValue'
import type { SpacecraftMaterials } from '../materials/spacecraftMaterials'
import { ConstructionRover } from '../models/rover/ConstructionRover'
import type { RoverMotion } from '../models/rover/ConstructionRover'
import type { Terrain, Vec3 } from '../types/scene'
import type { MissionSceneLayout } from '../utilities/missionSceneLayout'
import { roverMissionPose } from '../utilities/roverMission'
import type { RoverMissionPose } from '../utilities/roverMission'
import { STOWED_ARM, armPoseForTool } from '../utilities/roverLayout'

/**
 * Places the construction rover from mission progress (see `roverMissionPose`): riding the lander's
 * shelf through descent, down the ramp, around the rim drilling each anchor, then docked to a tower
 * winch. Nothing runs on its own clock, so pausing or failing the mission freezes the rover and
 * scrubbing always shows the same pose. Reports the world position through `onMove` (camera follow,
 * selection marker) and the full pose through `onPose`.
 */
export const RoverController = memo(function RoverController({
  layout,
  terrain,
  landing: landingTarget,
  egress: egressTarget,
  telescope: telescopeTarget,
  materials,
  animate,
  onMove,
  onPose,
}: {
  layout: MissionSceneLayout
  terrain: Terrain
  /** Mission progress (see MissionVisualState): plain numbers, so unchanged progress never re-renders the rover. */
  landing: number
  egress: number
  telescope: number
  materials: SpacecraftMaterials
  animate: boolean
  /** Receives the rover's world position every frame (camera follow, selection marker). */
  onMove: (positionM: Vec3) => void
  onPose?: (pose: RoverMissionPose) => void
}) {
  // Same rates as the lander and the telescope: the rover stays in step with the ramp and anchors.
  const landing = useEasedValue(landingTarget, animate, MISSION_EASE.landing)
  const egress = useEasedValue(egressTarget, animate, MISSION_EASE.egress)
  const telescope = useEasedValue(telescopeTarget, animate, MISSION_EASE.telescope)
  const group = useRef<Group>(null)
  const motion = useRef<RoverMotion>({ odometerM: 0, arm: STOWED_ARM, layingCable: false })

  useFrame(() => {
    const g = group.current
    if (!g) return
    const pose = roverMissionPose(layout, { landing: landing.current, egress: egress.current, telescope: telescope.current })
    const [x, , z] = pose.positionM
    const heading = pose.headingRad
    let position: Vec3 = pose.positionM
    let pitch = pose.pitchRad
    let roll = 0
    if (pose.onGround) {
      // On the regolith: sit on the terrain and tilt to it (ahead/behind, left/right).
      position = [x, terrain.heightAt(x, z), z]
      const fx = Math.cos(heading)
      const fz = -Math.sin(heading)
      const h = (dx: number, dz: number) => terrain.heightAt(x + dx, z + dz)
      pitch = Math.atan2(h(fx * 0.6, fz * 0.6) - h(-fx * 0.6, -fz * 0.6), 1.2)
      roll = Math.atan2(h(fz * 0.5, -fx * 0.5) - h(-fz * 0.5, fx * 0.5), 1.0)
    }
    g.position.set(...position)
    g.rotation.set(roll, heading, pitch, 'YZX')
    motion.current.odometerM = pose.odometerM
    motion.current.arm = pose.armTool > 0 ? armPoseForTool(pose.armTool) : STOWED_ARM
    motion.current.layingCable = pose.layingCable
    onMove([position[0], position[1] + 0.5, position[2]])
    onPose?.(pose)
  })

  return (
    <group ref={group} name="rover-body">
      <ReplaceableModel assetId="rover-deployment">
        <ConstructionRover materials={materials} motion={motion} animate={animate} />
      </ReplaceableModel>
    </group>
  )
})
