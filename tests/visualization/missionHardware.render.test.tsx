import { afterEach, describe, expect, it } from 'vitest'
import type { InstancedMesh, Mesh, MeshBasicMaterial } from 'three'
import { lunarSites } from '../../src/data'
import { conceptVisualState } from '../../src/features/visualization/animations/missionTimeline'
import type { MissionVisualState } from '../../src/features/visualization/animations/missionTimeline'
import { createSpacecraftMaterials } from '../../src/features/visualization/materials/spacecraftMaterials'
import { LunarLander } from '../../src/features/visualization/models/lander/LunarLander'
import { ConstructionRover } from '../../src/features/visualization/models/rover/ConstructionRover'
import { LCRTelescope } from '../../src/features/visualization/models/telescope/LCRTelescope'
import { LunarMissionScene } from '../../src/features/visualization/scenes/LunarMissionScene'
import { DEPLOYED_LEG_ANGLE_RAD, STOWED_LEG_ANGLE_RAD } from '../../src/features/visualization/utilities/landerLayout'
import { buildMissionWorld } from '../../src/features/visualization/utilities/missionWorld'
import { sceneSiteFrom } from '../../src/features/visualization/utilities/sceneSite'
import { countMeshes, renderThree } from '../helpers/renderThree'
import type { ThreeTestRoot } from '../helpers/renderThree'

const materials = createSpacecraftMaterials()
const world = buildMissionWorld(sceneSiteFrom(lunarSites[0]))
let root: ThreeTestRoot | undefined
afterEach(async () => {
  await root?.unmount()
  root = undefined
})

describe('mission hardware models render', () => {
  it('builds a detailed lander with four legs, a ramp, and an engine plume', async () => {
    root = await renderThree(<LunarLander materials={materials} landing={1} animate={false} />)
    expect(countMeshes(root.scene)).toBeGreaterThan(120)
    expect(root.findAll('lander-leg-swing')).toHaveLength(4)
    expect(root.find('lander-ramp')).toBeDefined()
    await root.frames(2)
    // Landed: legs locked down, engine off, on the ground.
    for (const leg of root.findAll('lander-leg-swing')) expect(leg.rotation.z).toBeCloseTo(DEPLOYED_LEG_ANGLE_RAD, 5)
    expect(root.find('engine-plume')?.visible).toBe(false)
    expect(root.find('lander-flight')?.position.y).toBeCloseTo(-0.045, 3)
  })

  it('animates the descent: high with legs folded, then touchdown and engine shutdown', async () => {
    root = await renderThree(<LunarLander materials={materials} landing={0} animate={false} />)
    await root.frames(2)
    expect(root.find('lander-flight')!.position.y).toBeGreaterThan(20)
    for (const leg of root.findAll('lander-leg-swing')) expect(leg.rotation.z).toBeCloseTo(STOWED_LEG_ANGLE_RAD, 5)
    expect(root.find('engine-plume')?.visible).toBe(true)

    await root.rerender(<LunarLander materials={materials} landing={1} animate />)
    await root.frames(5, 1 / 30)
    const midway = root.find('lander-flight')!.position.y
    expect(midway).toBeGreaterThan(0)
    await root.frames(240, 1 / 30)
    expect(root.find('lander-flight')!.position.y).toBeLessThan(0.01)
    expect(root.find('engine-plume')?.visible).toBe(false)
  })

  it('lowers the ramp during rover egress', async () => {
    root = await renderThree(<LunarLander materials={materials} roverEgress={0} animate={false} />)
    await root.frames(1)
    expect(root.find('lander-ramp')!.rotation.z).toBeCloseTo(Math.PI / 2)
    await root.rerender(<LunarLander materials={materials} roverEgress={1} animate={false} />)
    await root.frames(1)
    expect(root.find('lander-ramp')!.rotation.z).toBeLessThan(0)
  })

  it('builds the telescope folded, then deploys reflector and receiver', async () => {
    root = await renderThree(<LCRTelescope layout={world.lcrt} materials={materials} deployment={0} animate={false} />)
    await root.frames(1)
    const reflector = root.find('telescope-reflector')!
    expect(reflector.scale.x).toBeLessThan(0.1)
    const stowedY = root.find('telescope-receiver')!.position.y
    await root.rerender(<LCRTelescope layout={world.lcrt} materials={materials} deployment={1} receiverActive animate={false} />)
    await root.frames(1)
    expect(reflector.scale.x).toBeCloseTo(1)
    // Paraboloid shape preserved while unfurling: y scales with the square of the radius.
    expect(reflector.scale.y).toBeCloseTo(reflector.scale.x ** 2)
    expect(root.find('telescope-receiver')!.position.y).toBeCloseTo(world.lcrt.receiver[1])
    expect(root.find('telescope-receiver')!.position.y).toBeGreaterThan(stowedY + 5)
  })

  it('builds a six-wheel rover whose arm unfolds while working', async () => {
    root = await renderThree(<ConstructionRover materials={materials} activity="parked" animate={false} />)
    expect(countMeshes(root.scene)).toBeGreaterThan(60)
    let grousers = 0
    root.scene.traverse((o) => {
      if ((o as InstancedMesh).isInstancedMesh && (o as InstancedMesh).count === 18) grousers += 1
    })
    expect(grousers).toBe(6)
    await root.frames(1)
    const stowed = root.find('rover-arm-shoulder')!.rotation.z
    await root.rerender(<ConstructionRover materials={materials} activity="working" animate />)
    await root.frames(150, 1 / 30) // 5 s into the 8 s drilling cycle
    expect(root.find('rover-arm-shoulder')!.rotation.z).not.toBeCloseTo(stowed, 1)
  })
})

describe('LUNAR ECHO scene integration', () => {
  const scene = (visual: MissionVisualState, extra: Partial<Parameters<typeof LunarMissionScene>[0]> = {}) => (
    <LunarMissionScene world={world} visual={visual} earthVisible={false} animate={false} {...extra} />
  )

  it('places all three assets in the operational configuration', async () => {
    root = await renderThree(scene(conceptVisualState(1)))
    await root.frames(2)
    for (const id of ['lander', 'telescope', 'rover']) expect(root.find(id)).toBeDefined()
    expect(root.find('lander')!.position.toArray()).toEqual(world.layout.lander.positionM)
    // Rover is off the lander and on the terrain.
    const rover = root.find('rover-body')!.position
    expect(rover.y).toBeCloseTo(world.terrain.heightAt(rover.x, rover.z), 3)
  })

  it('shows only the lander during descent, with the rover riding its shelf', async () => {
    root = await renderThree(scene(conceptVisualState(0.05)))
    await root.frames(2)
    expect(root.find('telescope')).toBeUndefined()
    expect(root.find('rover-body')!.position.y).toBeGreaterThan(world.layout.lander.positionM[1] + 5)
  })

  it('hides assets and marks the selection', async () => {
    root = await renderThree(scene(conceptVisualState(1), { hidden: new Set(['telescope']), selected: 'lander', onSelect: () => {} }))
    await root.frames(2)
    expect(root.find('telescope')!.visible).toBe(false)
    expect(root.find('lander')!.visible).toBe(true)
    const marker = root.find('selection-marker') as Mesh
    expect(marker.position.x).toBeCloseTo(world.layout.lander.positionM[0])
    expect((marker.material as MeshBasicMaterial).transparent).toBe(true)
  })

  it('leaves the rover out when the design has none', async () => {
    root = await renderThree(scene({ ...conceptVisualState(1), roverPresent: false }))
    expect(root.find('rover')).toBeUndefined()
    expect(root.find('lander')).toBeDefined()
  })
})
