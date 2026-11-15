import { useDisposable } from '../../hooks/useDisposable'
import type { SpacecraftMaterials } from '../../materials/spacecraftMaterials'
import { LANDER } from '../../utilities/landerLayout'
import { paraboloid, sunBaffle } from '../geometry'
import { BeaconLight } from '../BeaconLight'
import { BeveledBox, BoltRing, Fasteners, Hinge } from '../spacecraft/parts'

const DECK = LANDER.deckTopY

/** Camera barrel with a sun shade and lens, looking along local −Y. */
function SensorCamera({ materials }: { materials: SpacecraftMaterials }) {
  return (
    <group>
      <BeveledBox size={[0.14, 0.1, 0.12]} material={materials.white} bevelM={0.015} />
      <mesh position={[0, -0.08, 0]} material={materials.graphite} castShadow>
        <cylinderGeometry args={[0.035, 0.045, 0.08, 14]} />
      </mesh>
      <mesh position={[0, -0.122, 0]} rotation={[Math.PI / 2, 0, 0]} material={materials.glass}>
        <circleGeometry args={[0.03, 14]} />
      </mesh>
    </group>
  )
}

/**
 * Deck and navigation hardware: high-gain antenna on a gimballed mast, star trackers with sun
 * baffles, a tilted deck solar array, avionics and battery boxes, omni antennas, a navigation
 * beacon, and the landing sensors under the body (hazard lidar, radar altimeter, descent cameras).
 */
export function LanderAvionics({ materials, animate }: { materials: SpacecraftMaterials; animate: boolean }) {
  const dish = useDisposable(() => paraboloid(0.42, 0.11, 32, 8), [])
  const baffle = useDisposable(() => sunBaffle(0.045, 0.075, 0.16), [])

  return (
    <group>
      {/* High-gain antenna: mast, gimbal head, dish with feed tripod, pointed up toward the relay orbiter. */}
      <group position={[-0.62, DECK, -0.5]}>
        <mesh position={[0, 0.45, 0]} material={materials.aluminium} castShadow>
          <cylinderGeometry args={[0.04, 0.055, 0.9, 12]} />
        </mesh>
        <BeveledBox size={[0.16, 0.12, 0.16]} position={[0, 0.94, 0]} material={materials.graphite} bevelM={0.02} />
        <group position={[0, 1.02, 0]} rotation={[0.35, 0, -0.4]}>
          <mesh geometry={dish} castShadow>
            <meshStandardMaterial attach="material" color="#e4e7eb" roughness={0.45} metalness={0.1} side={2} />
          </mesh>
          {[0, 1, 2].map((i) => {
            const a = (i * Math.PI * 2) / 3
            return (
              <mesh key={i} position={[Math.cos(a) * 0.17, 0.2, Math.sin(a) * 0.17]} rotation={[Math.sin(a) * 0.45, 0, -Math.cos(a) * 0.45]} material={materials.graphite}>
                <cylinderGeometry args={[0.008, 0.008, 0.34, 6]} />
              </mesh>
            )
          })}
          <mesh position={[0, 0.35, 0]} material={materials.graphite}>
            <cylinderGeometry args={[0.035, 0.025, 0.07, 12]} />
          </mesh>
        </group>
      </group>

      {/* Tilted deck solar array on a hinged frame, facing the low lunar sun. */}
      <group position={[-0.25, DECK + 0.06, 0.55]} rotation={[0, 0.4, 0]}>
        <BeveledBox size={[0.08, 0.1, 0.08]} position={[0, 0.05, 0]} material={materials.graphite} bevelM={0.015} />
        <Hinge position={[0, 0.12, 0]} rotation={[0, Math.PI / 2, 0]} lengthM={0.3} radiusM={0.022} metal={materials.aluminium} dark={materials.black} />
        <group position={[0, 0.12, 0]} rotation={[0, 0, 1.05]}>
          <BeveledBox size={[0.95, 0.03, 0.75]} position={[0.48, 0, 0]} material={materials.graphite} bevelM={0.008} />
          <mesh position={[0.48, 0.017, 0]} rotation={[-Math.PI / 2, 0, 0]} material={materials.solarHi}>
            <planeGeometry args={[0.9, 0.7]} />
          </mesh>
        </group>
      </group>

      {/* Avionics and battery boxes with bolted lids. */}
      <BeveledBox size={[0.5, 0.26, 0.42]} position={[0.3, DECK + 0.13, -0.42]} material={materials.white} bevelM={0.025} />
      <Fasteners points={[[0.1, DECK + 0.265, -0.6], [0.5, DECK + 0.265, -0.6], [0.1, DECK + 0.265, -0.24], [0.5, DECK + 0.265, -0.24]]} material={materials.aluminium} />
      <BeveledBox size={[0.34, 0.2, 0.3]} position={[0.42, DECK + 0.1, 0.3]} material={materials.graphite} bevelM={0.02} />
      <BeveledBox size={[0.3, 0.04, 0.26]} position={[0.42, DECK + 0.22, 0.3]} material={materials.radiator} bevelM={0.01} />

      {/* Star trackers with stepped sun baffles. */}
      {[
        { p: [-0.75, DECK, 0.35] as const, r: [0.4, 0.6, 0] as const },
        { p: [0.62, DECK, -0.78] as const, r: [-0.45, -0.3, 0.2] as const },
      ].map(({ p, r }) => (
        <group key={p.join()} position={[...p]} rotation={[...r]}>
          <BeveledBox size={[0.14, 0.1, 0.14]} position={[0, 0.05, 0]} material={materials.graphite} bevelM={0.015} />
          <mesh geometry={baffle} position={[0, 0.1, 0]} castShadow>
            <meshStandardMaterial attach="material" color="#111316" roughness={0.8} side={2} />
          </mesh>
        </group>
      ))}

      {/* Omni antennas at the deck edge. */}
      {[[0.9, 0.62], [-0.95, -0.2]].map(([x, z]) => (
        <group key={`${x}${z}`} position={[x, DECK, z]}>
          <mesh position={[0, 0.16, 0]} material={materials.aluminium}>
            <cylinderGeometry args={[0.01, 0.014, 0.32, 8]} />
          </mesh>
          <mesh position={[0, 0.34, 0]} material={materials.white}>
            <coneGeometry args={[0.035, 0.07, 12]} />
          </mesh>
        </group>
      ))}
      <BoltRing radiusM={0.06} y={DECK + 0.005} count={6} material={materials.aluminium} />
      <BeaconLight positionM={[0.3, DECK + 0.32, -0.42]} radiusM={0.045} animate={animate} />

      {/* Landing sensors under the body: hazard-detection lidar (−X), radar altimeter (±Z), descent cameras. */}
      <group position={[-0.95, LANDER.thrustPlateY - 0.02, 0]} rotation={[0, 0, -0.6]}>
        <BeveledBox size={[0.22, 0.14, 0.22]} position={[0, -0.07, 0]} material={materials.white} bevelM={0.025} />
        <mesh position={[0, -0.15, 0]} material={materials.glass}>
          <sphereGeometry args={[0.07, 16, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        </mesh>
      </group>
      {[1, -1].map((side) => (
        <group key={side} position={[0.1, LANDER.thrustPlateY - 0.04, side * 0.85]}>
          <BeveledBox size={[0.26, 0.03, 0.18]} material={materials.white} bevelM={0.01} />
          <mesh position={[0, -0.018, 0]} rotation={[Math.PI / 2, 0, 0]} material={materials.graphite}>
            <circleGeometry args={[0.07, 18]} />
          </mesh>
        </group>
      ))}
      {[3, 5].map((face) => {
        const a = (face * Math.PI) / 4
        return (
          <group key={face} position={[Math.cos(a) * 1.02, LANDER.bayTopY + 0.04, Math.sin(a) * 1.02]} rotation={[0, -a, -0.5]}>
            <SensorCamera materials={materials} />
          </group>
        )
      })}
    </group>
  )
}
