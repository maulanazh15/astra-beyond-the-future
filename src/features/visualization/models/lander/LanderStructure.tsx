import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { useDisposable } from '../../hooks/useDisposable'
import type { SpacecraftMaterials } from '../../materials/spacecraftMaterials'
import type { Vec3 } from '../../types/scene'
import { octagonCorners, ringPoints } from '../../utilities/hardwareLayout'
import { LANDER, LEG_BEARINGS_RAD } from '../../utilities/landerLayout'
import type { Strut } from '../../utilities/struts'
import { octagonPrism } from '../geometry'
import { BeveledBox, BoltRing, Fasteners } from '../spacecraft/parts'
import { StrutInstances } from '../StrutInstances'

const { thrustPlateY, bayTopY, bodyTopY, bodyRadiusM, deckRadiusM, tankRadiusM, tankRingM, tankY } = LANDER
const BODY_HEIGHT = bodyTopY - bayTopY
/** Distance from the axis to the middle of each body face. */
export const BODY_APOTHEM_M = bodyRadiusM * Math.cos(Math.PI / 8)
const FACE_WIDTH_M = 2 * bodyRadiusM * Math.sin(Math.PI / 8)

/** Open propulsion bay frame: corner posts with X-bracing, except on the payload-shelf face. */
function bayFrame(): Strut[] {
  const corners = octagonCorners(bodyRadiusM - 0.06)
  const bottom = thrustPlateY + 0.06
  const struts: Strut[] = []
  corners.forEach(([x, z], i) => {
    struts.push({ from: [x, bottom, z], to: [x, bayTopY, z], radiusM: 0.035 })
    const [nx, nz] = corners[(i + 1) % 8]
    // Corner i → i+1 spans the face whose normal is at (i + 0.5)·45° + 22.5°; face 0 (+X) is between corners 7 and 0.
    if (i === 7) return
    struts.push({ from: [x, bottom, z], to: [nx, bayTopY, nz], radiusM: 0.016 })
    struts.push({ from: [nx, bottom, nz], to: [x, bayTopY, z], radiusM: 0.016 })
  })
  // Tank support struts: each tank hangs from the two posts beside it.
  for (const b of LEG_BEARINGS_RAD) {
    const c: Vec3 = [Math.cos(b) * tankRingM, tankY, Math.sin(b) * tankRingM]
    for (const side of [-1, 1]) {
      const a = b + side * (Math.PI / 8)
      const post: Vec3 = [Math.cos(a) * (bodyRadiusM - 0.08), tankY + 0.12, Math.sin(a) * (bodyRadiusM - 0.08)]
      const surface: Vec3 = [c[0] + (post[0] - c[0]) * 0.5, c[1] + 0.06, c[2] + (post[2] - c[2]) * 0.5]
      struts.push({ from: surface, to: post, radiusM: 0.014 })
    }
  }
  return struts
}

/** A detail panel mounted on body face `face` (0 = +X, counting toward +Z in 45° steps). */
function OnFace({ face, y, children }: { face: number; y: number; children: ReactNode }) {
  return (
    <group rotation={[0, -(face * Math.PI) / 4, 0]}>
      <group position={[BODY_APOTHEM_M, y, 0]}>{children}</group>
    </group>
  )
}

/** Radiator: silvered plate with raised heat-pipe fins, on a face's local +X. */
function Radiator({ materials }: { materials: SpacecraftMaterials }) {
  const fins = [-0.27, -0.16, -0.05, 0.06, 0.17, 0.28]
  return (
    <group>
      <BeveledBox size={[0.03, 0.7, FACE_WIDTH_M - 0.12]} position={[0.015, 0, 0]} material={materials.radiator} bevelM={0.008} />
      {fins.map((z) => (
        <BeveledBox key={z} size={[0.025, 0.66, 0.018]} position={[0.042, 0, z]} material={materials.aluminium} bevelM={0.006} />
      ))}
    </group>
  )
}

/** Main structure: thrust plate, open tank bay, insulated avionics body, deck, body panels, RCS. */
export function LanderStructure({ materials }: { materials: SpacecraftMaterials }) {
  const thrustPlate = useDisposable(() => octagonPrism(bodyRadiusM - 0.03, 0.06, 0.015, { holeRadiusM: 0.24 }), [])
  const body = useDisposable(() => octagonPrism(bodyRadiusM, BODY_HEIGHT, 0.03), [])
  const frameRing = useDisposable(() => octagonPrism(bodyRadiusM + 0.025, 0.06, 0.012, { innerRadiusM: bodyRadiusM - 0.07 }), [])
  const deck = useDisposable(() => octagonPrism(deckRadiusM, 0.06, 0.015), [])
  const accentRing = useDisposable(() => octagonPrism(bodyRadiusM + 0.04, 0.025, 0, { innerRadiusM: bodyRadiusM - 0.02 }), [])
  const heatShield = useDisposable(() => octagonPrism(bodyRadiusM - 0.12, 0.035, 0.01, { holeRadiusM: 0.4 }), [])
  const frame = useMemo(() => bayFrame(), [])
  const rcsCorners = useMemo(() => octagonCorners(bodyRadiusM + 0.02).filter((_, i) => i % 2 === 0), [])

  return (
    <group>
      {/* Thrust plate (graphite composite) with the ceramic heat shield under it, around the engine. */}
      <mesh geometry={thrustPlate} position={[0, thrustPlateY, 0]} material={materials.graphite} castShadow receiveShadow />
      <mesh geometry={heatShield} position={[0, thrustPlateY - 0.035, 0]} material={materials.ceramic} castShadow />
      <BoltRing radiusM={bodyRadiusM - 0.16} y={thrustPlateY + 0.065} count={24} material={materials.aluminium} boltRadiusM={0.014} />

      {/* Open propulsion bay: frame, four propellant tanks, two helium pressurant spheres. */}
      <StrutInstances struts={frame} material={materials.aluminium} />
      {LEG_BEARINGS_RAD.map((b) => (
        <group key={b} position={[Math.cos(b) * tankRingM, tankY, Math.sin(b) * tankRingM]}>
          <mesh material={materials.aluminium} castShadow receiveShadow>
            <sphereGeometry args={[tankRadiusM, 24, 16]} />
          </mesh>
          {/* Girth weld band and mounting ring. */}
          <mesh rotation={[Math.PI / 2, 0, 0]} material={materials.graphite}>
            <torusGeometry args={[tankRadiusM + 0.004, 0.016, 6, 32]} />
          </mesh>
          <mesh position={[0, tankRadiusM - 0.01, 0]} material={materials.graphite}>
            <cylinderGeometry args={[0.05, 0.06, 0.05, 12]} />
          </mesh>
        </group>
      ))}
      {[Math.PI / 2, -Math.PI / 2].map((b) => (
        <mesh key={b} position={[0, tankY + 0.05, Math.sin(b) * 0.78]} material={materials.white} castShadow>
          <sphereGeometry args={[0.15, 18, 12]} />
        </mesh>
      ))}

      {/* Avionics body wrapped in gold multi-layer insulation, with graphite frame bands. */}
      <mesh geometry={body} position={[0, bayTopY, 0]} material={materials.mli} castShadow receiveShadow />
      <mesh geometry={frameRing} position={[0, bayTopY - 0.02, 0]} material={materials.graphite} castShadow />
      <mesh geometry={frameRing} position={[0, bodyTopY - 0.05, 0]} material={materials.graphite} castShadow />
      <mesh geometry={accentRing} position={[0, bodyTopY - 0.085, 0]} material={materials.accent} />

      {/* Deck */}
      <mesh geometry={deck} position={[0, bodyTopY, 0]} material={materials.white} castShadow receiveShadow />
      <BoltRing radiusM={deckRadiusM - 0.08} y={bodyTopY + 0.065} count={32} material={materials.aluminium} boltRadiusM={0.012} />

      {/* Body faces: avionics door (+X), radiators (±Z), body-mounted solar panel (−X). */}
      <OnFace face={0} y={bayTopY + BODY_HEIGHT / 2 + 0.05}>
        <BeveledBox size={[0.03, 0.62, 0.66]} position={[0.015, 0, 0]} material={materials.white} bevelM={0.01} />
        <Fasteners points={[[0.035, 0.27, 0.29], [0.035, 0.27, -0.29], [0.035, -0.27, 0.29], [0.035, -0.27, -0.29]]} normal={[1, 0, 0]} material={materials.aluminium} />
        {[-0.12, 0, 0.12].map((z) => (
          <mesh key={z} position={[0.035, 0.22, z]} material={materials.accent}>
            <sphereGeometry args={[0.018, 8, 6]} />
          </mesh>
        ))}
        {/* Rover umbilical connector. */}
        <BeveledBox size={[0.05, 0.12, 0.2]} position={[0.03, -0.38, 0.16]} material={materials.graphite} bevelM={0.01} />
      </OnFace>
      {[2, 6].map((face) => (
        <OnFace key={face} face={face} y={bayTopY + BODY_HEIGHT / 2}>
          <Radiator materials={materials} />
        </OnFace>
      ))}
      <OnFace face={4} y={bayTopY + BODY_HEIGHT / 2}>
        <BeveledBox size={[0.025, 0.74, FACE_WIDTH_M - 0.1]} position={[0.012, 0, 0]} material={materials.graphite} bevelM={0.008} />
        <mesh position={[0.028, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={materials.solarHi}>
          <planeGeometry args={[FACE_WIDTH_M - 0.16, 0.68]} />
        </mesh>
      </OnFace>

      {/* Reaction-control thruster quads on alternate body corners. */}
      {rcsCorners.map(([x, z]) => (
        <group key={`${x}`} position={[x, bodyTopY - 0.2, z]} rotation={[0, -Math.atan2(z, x), 0]}>
          <BeveledBox size={[0.12, 0.14, 0.14]} position={[0.04, 0, 0]} material={materials.graphite} bevelM={0.02} />
          {[[0, 1], [0, -1], [1, 0], [-1, 0]].map(([dy, dz]) => (
            <mesh
              key={`${dy}${dz}`}
              position={[0.08, dy * 0.07, dz * 0.07]}
              rotation={dy !== 0 ? [0, 0, dy > 0 ? 0 : Math.PI] : [dz > 0 ? Math.PI / 2 : -Math.PI / 2, 0, 0]}
              material={materials.nozzle}
            >
              <cylinderGeometry args={[0.012, 0.026, 0.05, 10, 1, true]} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Hold-down bolts along the bay top ring. */}
      <Fasteners points={ringPoints(bodyRadiusM - 0.04, bayTopY - 0.07, 16, Math.PI / 16)} normal={[0, -1, 0]} material={materials.aluminium} radiusM={0.014} />
    </group>
  )
}
