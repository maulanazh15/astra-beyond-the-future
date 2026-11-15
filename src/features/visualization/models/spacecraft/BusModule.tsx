import { useLayoutEffect, useMemo } from 'react'
import { ExtrudeGeometry, Shape } from 'three'
import { octagonCorners, ringPoints } from '../../utilities/hardwareLayout'
import { BeveledBox, BoltRing } from './parts'
import type { ModuleProps } from './types'

/** Beveled octagonal prism, extruded upward from y = 0. */
function octagonPrism(radiusM: number, heightM: number, bevelM: number) {
  const shape = new Shape()
  octagonCorners(radiusM - bevelM).forEach(([x, z], i) => (i === 0 ? shape.moveTo(x, -z) : shape.lineTo(x, -z)))
  shape.closePath()
  const geometry = new ExtrudeGeometry(shape, {
    depth: heightM - bevelM * 2,
    bevelEnabled: true,
    bevelThickness: bevelM,
    bevelSize: bevelM,
    bevelSegments: 2,
  })
  geometry.rotateX(-Math.PI / 2)
  geometry.translate(0, bevelM, 0)
  return geometry
}

/**
 * Spacecraft bus (local origin at the bus floor center). `insulated` wraps the sides in gold MLI;
 * otherwise they are white painted panels. Variants differ in size and in their upper structure.
 */
export function BusModule({ variant, materials: m, dims, insulated }: ModuleProps & { insulated: boolean }) {
  const { radiusM: r, heightM: h } = dims
  const body = useMemo(() => octagonPrism(r, h, 0.04), [r, h])
  const deck = useMemo(() => octagonPrism(r * 1.04, 0.07, 0.02), [r])
  const longerons = useMemo(() => octagonCorners(r * 0.995), [r])
  useLayoutEffect(
    () => () => {
      body.dispose()
      deck.dispose()
    },
    [body, deck],
  )
  const skin = insulated ? m.mli : m.white

  return (
    <group>
      <mesh geometry={body} material={skin} castShadow receiveShadow />
      {/* Corner longerons: the load path of the primary structure. */}
      {longerons.map(([x, z]) => (
        <mesh key={`${x},${z}`} position={[x, h / 2, z]} material={m.aluminium} castShadow>
          <cylinderGeometry args={[0.035, 0.035, h + 0.02, 8]} />
        </mesh>
      ))}
      {/* Top deck with interface bolt ring and a cyan accent band beneath it. */}
      <mesh geometry={deck} position={[0, h, 0]} material={m.white} castShadow receiveShadow />
      <BoltRing radiusM={r * 0.86} y={h + 0.075} count={24} material={m.aluminium} />
      <mesh position={[0, h - 0.04, 0]} material={m.accent}>
        <cylinderGeometry args={[r * 1.005, r * 1.005, 0.025, 8, 1, true]} />
      </mesh>
      {/* Lower closeout ring. */}
      <mesh position={[0, 0.02, 0]} material={m.graphite} castShadow>
        <cylinderGeometry args={[r * 1.01, r * 1.01, 0.05, 8]} />
      </mesh>
      <>
          {/* Avionics access door on face 1. */}
          <group rotation={[0, -Math.PI / 4, 0]}>
            <BeveledBox size={[0.03, h * 0.42, r * 0.45]} position={[r * 0.93, h * 0.52, 0]} material={m.graphite} bevelM={0.01} />
          </group>
          {/* Star tracker with baffle, on the upper edge. */}
          <group rotation={[0, (-3 * Math.PI) / 4, 0]} position={[0, h * 0.82, 0]}>
            <BeveledBox size={[0.16, 0.14, 0.14]} position={[r * 0.95, 0, 0]} material={m.graphite} bevelM={0.015} />
            <mesh position={[r * 0.95 + 0.12, 0.04, 0]} rotation={[0, 0, -Math.PI / 2.6]} material={m.black}>
              <cylinderGeometry args={[0.05, 0.035, 0.14, 12, 1, true]} />
            </mesh>
          </group>
      </>
      {variant === 'standard' && (
        // Equipment ring: a raised avionics platform on the deck.
        <mesh position={[0, h + 0.12, 0]} material={m.graphite} castShadow>
          <cylinderGeometry args={[r * 0.3, r * 0.34, 0.1, 16]} />
        </mesh>
      )}
      {variant === 'cargo' && (
        // Cargo deck: outer hardpoints for large payloads.
        <>
          {ringPoints(r * 0.98, h + 0.1, 8, Math.PI / 8).map((p) => (
            <BeveledBox key={p.join()} size={[0.14, 0.09, 0.14]} position={p} material={m.aluminium} bevelM={0.015} />
          ))}
        </>
      )}
    </group>
  )
}
