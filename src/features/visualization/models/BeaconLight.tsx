import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { MeshStandardMaterial } from 'three'
import { beaconIntensity, steadyBeaconIntensity } from '../animations/curves'
import type { BeaconOptions } from '../animations/curves'
import { ACCENT_CYAN } from '../materials/spacecraftMaterials'
import type { Vec3 } from '../types/scene'

type BeaconLightProps = { positionM: Vec3; radiusM: number; animate: boolean; timing?: BeaconOptions }

/** Small cyan navigation light. All beacons with the same timing blink together (shared clock). */
export function BeaconLight({ positionM, radiusM, animate, timing }: BeaconLightProps) {
  const material = useRef<MeshStandardMaterial>(null)
  useFrame(({ clock }) => {
    if (material.current) material.current.emissiveIntensity = animate ? beaconIntensity(clock.elapsedTime, timing) : steadyBeaconIntensity(timing)
  })
  return (
    <mesh position={positionM}>
      <sphereGeometry args={[radiusM, 12, 8]} />
      <meshStandardMaterial ref={material} color="#0b1528" emissive={ACCENT_CYAN} emissiveIntensity={steadyBeaconIntensity(timing)} />
    </mesh>
  )
}
