/**
 * DEVELOPMENT PLACEHOLDER GEOMETRY. Not a final asset.
 * Rough primitive shapes so scenes can be built and tested before Blender exports exist.
 * Rendered in a flat amber wireframe so it can never be mistaken for final art.
 */
import type { JSX } from 'react'
import type { ModelAssetCategory } from '../../../../types/modelAsset'

const PLACEHOLDER_COLOR = '#f59e0b'

function Material() {
  return <meshBasicMaterial color={PLACEHOLDER_COLOR} wireframe />
}

/** Approximate placeholder sizes (m), chosen only to be readable in the scene. */
function Lander() {
  return (
    <group>
      <mesh position={[0, 1.3, 0]}>
        <boxGeometry args={[1.8, 1.2, 1.8]} />
        <Material />
      </mesh>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 0.35, z]} rotation={[z * 0.35, 0, -x * 0.35]}>
          <cylinderGeometry args={[0.05, 0.05, 1, 6]} />
          <Material />
        </mesh>
      ))}
    </group>
  )
}

function Rover() {
  return (
    <group>
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[1.2, 0.4, 0.8]} />
        <Material />
      </mesh>
      {[[-0.5, -0.45], [0.5, -0.45], [-0.5, 0.45], [0.5, 0.45]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 0.2, z]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 0.12, 10]} />
          <Material />
        </mesh>
      ))}
    </group>
  )
}

function Payload() {
  return (
    <group>
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.8, 6]} />
        <Material />
      </mesh>
      <mesh position={[0, 0.8, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.03, 0.03, 2.4, 6]} />
        <Material />
      </mesh>
    </group>
  )
}

function Spacecraft() {
  return (
    <group>
      <mesh>
        <cylinderGeometry args={[0.6, 0.6, 1.4, 8]} />
        <Material />
      </mesh>
      <mesh position={[1.6, 0, 0]}>
        <boxGeometry args={[2, 0.04, 0.8]} />
        <Material />
      </mesh>
      <mesh position={[-1.6, 0, 0]}>
        <boxGeometry args={[2, 0.04, 0.8]} />
        <Material />
      </mesh>
    </group>
  )
}

function Structure() {
  return (
    <mesh position={[0, 0.5, 0]}>
      <cylinderGeometry args={[1, 1.2, 1, 12]} />
      <Material />
    </mesh>
  )
}

function Environment() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[20, 24]} />
      <Material />
    </mesh>
  )
}

const shapes: Record<ModelAssetCategory, () => JSX.Element> = {
  lander: Lander,
  rover: Rover,
  payload: Payload,
  spacecraft: Spacecraft,
  structure: Structure,
  environment: Environment,
}

export function PlaceholderModel({ category }: { category: ModelAssetCategory }) {
  const Shape = shapes[category]
  return <Shape />
}
