import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import type { Group } from 'three'
import type { SpacecraftMaterials } from '../../materials/spacecraftMaterials'
import type { Vec3 } from '../../types/scene'
import { ROVER, STOWED_ARM, armPoseForTool } from '../../utilities/roverLayout'
import type { ArmPose } from '../../utilities/roverLayout'
import type { Strut } from '../../utilities/struts'
import { BeaconLight } from '../BeaconLight'
import { BeveledBox, Fasteners } from '../spacecraft/parts'
import { StrutInstances } from '../StrutInstances'
import { RoverArm } from './RoverArm'
import { RoverWheel } from './RoverWheel'

/** Per-frame drive state written by a scene controller. */
export type RoverMotion = {
  /** Distance driven (m): turns the wheels and the cable spool. */
  odometerM: number
  arm: ArmPose
  /** Paying out cable from the spool while driving. */
  layingCable: boolean
}

export type ConstructionRoverProps = {
  materials: SpacecraftMaterials
  /** Driven externally (scene controller). Without it the rover idles in place per `activity`. */
  motion?: RefObject<RoverMotion>
  /** Standalone behavior: 'working' loops an anchor-drilling cycle, anything else holds still. */
  activity?: 'working' | 'parked'
  animate?: boolean
}

const [REAR, MID, FRONT] = ROVER.wheelX
const HUB_Y = ROVER.wheelRadiusM
const TOOL_CYCLE_S = 8

/** Rocker-bogie linkage on one side (z = side × track/2). */
function suspension(side: 1 | -1): Strut[] {
  const z = (ROVER.trackM / 2) * side
  const pivot: Vec3 = [ROVER.rockerPivot[0], ROVER.rockerPivot[1], ROVER.rockerPivot[2] * side]
  const rearKnee: Vec3 = [REAR + 0.12, 0.42, z]
  const bogie: Vec3 = [ROVER.bogiePivot[0], ROVER.bogiePivot[1], z]
  return [
    { from: pivot, to: [pivot[0], pivot[1], z], radiusM: 0.022 },
    { from: [pivot[0], pivot[1], z], to: rearKnee, radiusM: 0.026 },
    { from: rearKnee, to: [REAR, HUB_Y + 0.07, z], radiusM: 0.026 },
    { from: [pivot[0], pivot[1], z], to: bogie, radiusM: 0.026 },
    { from: bogie, to: [MID, HUB_Y + 0.07, z], radiusM: 0.022 },
    { from: bogie, to: [FRONT, HUB_Y + 0.07, z], radiusM: 0.022 },
  ]
}

/**
 * Six-wheel construction rover for LUNAR ECHO. Origin on the ground under the chassis, +X forward.
 * Carries a 4-joint arm with an anchor drill, a stereo pan/tilt mast camera with lidar, hazard
 * cameras, a rear cable spool, and an anchor magazine.
 */
export function ConstructionRover({ materials, motion, activity = 'parked', animate = true }: ConstructionRoverProps) {
  const links = useMemo(() => [...suspension(1), ...suspension(-1)], [])
  const wheels = useRef<(Group | null)[]>([])
  const spool = useRef<Group>(null)
  const pan = useRef<Group>(null)
  const tilt = useRef<Group>(null)
  const clock = useRef(0)
  const arm = useRef<ArmPose>(STOWED_ARM)

  useFrame((_, dt) => {
    clock.current += animate ? Math.min(dt, 0.1) : 0
    const m = motion?.current
    arm.current = m ? m.arm : activity === 'working' && animate ? armPoseForTool((clock.current % TOOL_CYCLE_S) / TOOL_CYCLE_S) : STOWED_ARM
    const roll = (m?.odometerM ?? 0) / ROVER.wheelRadiusM
    wheels.current.forEach((w) => w && (w.rotation.z = -roll))
    if (spool.current && m?.layingCable) spool.current.rotation.z = -(m.odometerM / ROVER.spool.radiusM) * 0.3
    // Mast camera scans slowly; looks down at the drill site while the arm works.
    const working = arm.current.shoulder < 1
    if (pan.current) pan.current.rotation.y = working ? 0.3 : animate ? 0.6 * Math.sin(clock.current * 0.35) : 0
    if (tilt.current) tilt.current.rotation.z = working ? -0.55 : -0.15
  })

  const { body, deckTopY, mast, spool: spoolSpec } = ROVER
  const [bw, bh, bd] = body.size
  const hazCams = useMemo((): Vec3[] => [[body.center[0] + bw / 2 + 0.005, 0.45, 0.16], [body.center[0] + bw / 2 + 0.005, 0.45, -0.16]], [body.center, bw])

  return (
    <group>
      {/* Chassis: graphite body, white thermal deck, side radiators, solar panel on the rear deck. */}
      <BeveledBox size={body.size} position={body.center} material={materials.graphite} bevelM={0.03} />
      <BeveledBox size={[bw + 0.02, 0.04, bd + 0.02]} position={[body.center[0], deckTopY - 0.02, 0]} material={materials.white} bevelM={0.012} />
      {[1, -1].map((s) => (
        <BeveledBox key={s} size={[bw * 0.7, bh * 0.7, 0.015]} position={[body.center[0] - 0.05, body.center[1], s * (bd / 2 + 0.008)]} material={materials.radiator} bevelM={0.005} />
      ))}
      <mesh position={[-0.12, deckTopY + 0.004, 0.02]} rotation={[-Math.PI / 2, 0, 0]} material={materials.solarHi}>
        <planeGeometry args={[0.42, 0.58]} />
      </mesh>
      <Fasteners points={[[0.48, deckTopY + 0.002, 0.3], [0.48, deckTopY + 0.002, -0.3], [-0.46, deckTopY + 0.002, 0.3], [-0.46, deckTopY + 0.002, -0.3]]} material={materials.aluminium} />
      {hazCams.map((p) => (
        <group key={p.join()} position={p}>
          <BeveledBox size={[0.04, 0.06, 0.08]} material={materials.white} bevelM={0.01} />
          <mesh position={[0.022, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={materials.glass}>
            <circleGeometry args={[0.018, 12]} />
          </mesh>
        </group>
      ))}

      {/* Rocker-bogie suspension, differential bar, steering actuators over the corner wheels. */}
      <StrutInstances struts={links} material={materials.graphite} />
      <mesh position={[ROVER.rockerPivot[0], ROVER.rockerPivot[1] + 0.12, 0]} rotation={[Math.PI / 2, 0, 0]} material={materials.aluminium}>
        <cylinderGeometry args={[0.015, 0.015, ROVER.trackM * 0.9, 8]} />
      </mesh>
      {[1, -1].flatMap((s) =>
        [REAR, FRONT].map((x) => (
          <BeveledBox key={`${s}${x}`} size={[0.08, 0.08, 0.08]} position={[x, HUB_Y + 0.11, s * (ROVER.trackM / 2)]} material={materials.white} bevelM={0.012} />
        )),
      )}
      {[1, -1].flatMap((s) =>
        ROVER.wheelX.map((x, i) => (
          <group key={`${s}${x}`} position={[x, HUB_Y, s * (ROVER.trackM / 2)]}>
            <RoverWheel
              materials={materials}
              side={s as 1 | -1}
              spin={(g) => {
                wheels.current[(s > 0 ? 0 : 3) + i] = g
              }}
            />
          </group>
        )),
      )}

      {/* Mast: pan/tilt stereo camera head with a lidar puck, sun shade, and UHF whip. */}
      <group position={[mast.x, deckTopY, mast.z]}>
        <mesh position={[0, mast.heightM / 2, 0]} material={materials.aluminium} castShadow>
          <cylinderGeometry args={[0.025, 0.032, mast.heightM, 12]} />
        </mesh>
        <group ref={pan} position={[0, mast.heightM, 0]}>
          <mesh material={materials.graphite}>
            <cylinderGeometry args={[0.04, 0.04, 0.05, 14]} />
          </mesh>
          <group ref={tilt} position={[0, 0.06, 0]}>
            <BeveledBox size={[0.1, 0.08, 0.3]} material={materials.white} bevelM={0.015} />
            {[0.1, -0.1].map((z) => (
              <group key={z} position={[0.055, 0, z]}>
                <mesh rotation={[0, 0, -Math.PI / 2]} material={materials.graphite}>
                  <cylinderGeometry args={[0.026, 0.03, 0.03, 14]} />
                </mesh>
                <mesh position={[0.016, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={materials.glass}>
                  <circleGeometry args={[0.02, 14]} />
                </mesh>
              </group>
            ))}
            <BeveledBox size={[0.12, 0.012, 0.32]} position={[0.02, 0.05, 0]} material={materials.graphite} bevelM={0.004} />
            <mesh position={[-0.01, 0.09, 0]} material={materials.black}>
              <cylinderGeometry args={[0.035, 0.035, 0.05, 16]} />
            </mesh>
            <mesh position={[-0.01, 0.09, 0]} material={materials.glass}>
              <cylinderGeometry args={[0.036, 0.036, 0.015, 16]} />
            </mesh>
          </group>
        </group>
      </group>
      <mesh position={[-0.46, deckTopY + 0.22, -0.26]} material={materials.aluminium}>
        <cylinderGeometry args={[0.006, 0.008, 0.44, 6]} />
      </mesh>
      <BeaconLight positionM={[-0.46, deckTopY + 0.45, -0.26]} radiusM={0.02} animate={animate} timing={{ periodS: 1.2 }} />

      {/* Rear cable spool: pays out suspension cable between anchors. */}
      <group position={spoolSpec.center}>
        {[1, -1].map((s) => (
          <BeveledBox key={s} size={[0.08, 0.2, 0.03]} position={[0, -0.06, s * (spoolSpec.widthM / 2 + 0.02)]} material={materials.graphite} bevelM={0.008} />
        ))}
        <group ref={spool}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={materials.cable} castShadow>
            <cylinderGeometry args={[spoolSpec.radiusM, spoolSpec.radiusM, spoolSpec.widthM, 20]} />
          </mesh>
          {[1, -1].map((s) => (
            <mesh key={s} position={[0, 0, s * (spoolSpec.widthM / 2)]} rotation={[Math.PI / 2, 0, 0]} material={materials.white}>
              <cylinderGeometry args={[spoolSpec.radiusM + 0.04, spoolSpec.radiusM + 0.04, 0.015, 20]} />
            </mesh>
          ))}
        </group>
      </group>

      {/* Anchor magazine: three spare helical anchors beside the arm. */}
      <group position={[0.08, deckTopY, 0.12]}>
        <BeveledBox size={[0.16, 0.1, 0.18]} position={[0, 0.05, 0]} material={materials.white} bevelM={0.015} />
        {[-0.05, 0, 0.05].map((z) => (
          <mesh key={z} position={[0, 0.14, z]} material={materials.warm}>
            <cylinderGeometry args={[0.018, 0.018, 0.1, 8]} />
          </mesh>
        ))}
      </group>

      <group position={ROVER.arm.base}>
        <RoverArm pose={() => arm.current} materials={materials} />
      </group>
    </group>
  )
}
