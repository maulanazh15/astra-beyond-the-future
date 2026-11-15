import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { Color, MeshBasicMaterial } from 'three'
import type { Group, Mesh } from 'three'
import { landerPose } from '../../animations/missionTimeline'
import type { LanderPose } from '../../animations/missionTimeline'
import { useDisposable } from '../../hooks/useDisposable'
import { useEasedValue } from '../../hooks/useEasedValue'
import type { SpacecraftMaterials } from '../../materials/spacecraftMaterials'
import { toTexture } from '../../materials/textures'
import { LANDER, LEG_BEARINGS_RAD, PRIMARY_STRUT_LENGTH_M, braceAnchors, legAngleRad, legPoint } from '../../utilities/landerLayout'
import { radialFalloffMap } from '../../utilities/proceduralTextures'
import type { Strut } from '../../utilities/struts'
import { DynamicStruts } from '../DynamicStruts'
import { DescentEngine } from './DescentEngine'
import { LanderAvionics } from './LanderAvionics'
import { LanderLeg } from './LanderLeg'
import { LanderStructure } from './LanderStructure'
import { PayloadShelf } from './PayloadShelf'

export type LunarLanderProps = {
  materials: SpacecraftMaterials
  /** Landing sequence, 0–1: descent with legs deploying → touchdown → engine shutdown. 1 = landed. */
  landing?: number
  /** Rover egress, 0–1: clamps release, ramp lowers (the rover itself is a separate model). */
  roverEgress?: number
  /** Ease toward new values and run lights; false snaps (reduced motion, static renders). */
  animate?: boolean
}

/** Secondary struts per leg: a sleeve fixed at the bay and a rod reaching the knee fitting. */
function secondaryStruts(deploy: number): { sleeves: Strut[]; rods: Strut[] } {
  const angle = legAngleRad(deploy)
  const sleeves: Strut[] = []
  const rods: Strut[] = []
  for (const b of LEG_BEARINGS_RAD) {
    const knee = legPoint(b, angle, PRIMARY_STRUT_LENGTH_M * LANDER.kneeFraction)
    for (const anchor of braceAnchors(b)) {
      const d = [knee[0] - anchor[0], knee[1] - anchor[1], knee[2] - anchor[2]]
      const len = Math.hypot(d[0], d[1], d[2])
      const k = Math.min(1, 0.45 / len)
      sleeves.push({ from: anchor, to: [anchor[0] + d[0] * k, anchor[1] + d[1] * k, anchor[2] + d[2] * k], radiusM: 0.03 })
      rods.push({ from: anchor, to: knee, radiusM: 0.018 })
    }
  }
  return { sleeves, rods }
}

/**
 * LUNAR ECHO lander. Origin on the ground under its center; place and rotate it with a parent
 * group. Every moving part is driven from two numbers (`landing`, `roverEgress`).
 */
export function LunarLander({ materials, landing = 1, roverEgress = 0, animate = true }: LunarLanderProps) {
  const landingValue = useEasedValue(landing, animate, 1.4)
  const egressValue = useEasedValue(roverEgress, animate, 1.4)
  const pose = useRef<LanderPose>(landerPose(landing))
  const flight = useRef<Group>(null)
  const dust = useRef<Mesh>(null)
  const struts = useRef({ deploy: -1, ...secondaryStruts(landerPose(landing).legDeploy) })
  const dustMap = useDisposable(() => toTexture(radialFalloffMap(128)), [])
  const dustMaterial = useDisposable(
    () => new MeshBasicMaterial({ color: new Color('#8d8880'), alphaMap: dustMap, transparent: true, opacity: 0, depthWrite: false }),
    [dustMap.uuid],
  )

  // Runs after the eased values (priority −1) and before the parts that read the pose.
  useFrame(({ clock }) => {
    const next = landerPose(landingValue.current)
    pose.current = next
    if (flight.current) flight.current.position.y = next.altitudeM - 0.045 * next.legCompression
    if (dust.current) {
      dust.current.visible = next.dust > 0.01
      ;(dust.current.material as MeshBasicMaterial).opacity = 0.55 * next.dust
      const spread = 2.5 + 6 * (1 - Math.min(1, next.altitudeM / 9))
      dust.current.scale.set(spread, spread, 1)
      dust.current.rotation.z = clock.elapsedTime * 0.4
    }
  }, -0.5)

  // Recompute both strut sets once per frame when the legs move.
  useFrame(() => {
    const deploy = pose.current.legDeploy
    if (Math.abs(deploy - struts.current.deploy) < 1e-5) return
    struts.current = { deploy, ...secondaryStruts(deploy) }
  }, -0.25)
  const lastDrawn = useRef({ sleeves: -1, rods: -1 })
  const source = (part: 'sleeves' | 'rods') => () => {
    if (lastDrawn.current[part] === struts.current.deploy) return null
    lastDrawn.current[part] = struts.current.deploy
    return struts.current[part]
  }

  return (
    <group>
      <group ref={flight} name="lander-flight">
        <LanderStructure materials={materials} />
        <DescentEngine pose={pose} materials={materials} />
        {LEG_BEARINGS_RAD.map((b) => (
          <LanderLeg key={b} bearingRad={b} pose={pose} materials={materials} />
        ))}
        <DynamicStruts count={8} source={source('sleeves')} material={materials.graphite} />
        <DynamicStruts count={8} source={source('rods')} material={materials.aluminium} />
        <PayloadShelf egress={egressValue} materials={materials} />
        <LanderAvionics materials={materials} animate={animate} />
      </group>
      {/* Regolith blown outward by the plume in the last meters of descent. */}
      <mesh ref={dust} name="lander-dust" rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]} material={dustMaterial} visible={false}>
        <circleGeometry args={[1, 32]} />
      </mesh>
    </group>
  )
}
