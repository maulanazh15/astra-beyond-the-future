import { afterEach, describe, expect, it } from 'vitest'
import { Profiler } from 'react'
import { Box3, BoxGeometry, Group, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial } from 'three'
import type { Object3D } from 'three'
import { lunarSites } from '../../src/data'
import { conceptVisualState } from '../../src/features/visualization/animations/missionTimeline'
import { createSpacecraftMaterials } from '../../src/features/visualization/materials/spacecraftMaterials'
import { LunarLander } from '../../src/features/visualization/models/lander/LunarLander'
import { ConstructionRover } from '../../src/features/visualization/models/rover/ConstructionRover'
import { LCRTelescope } from '../../src/features/visualization/models/telescope/LCRTelescope'
import { LunarMissionScene } from '../../src/features/visualization/scenes/LunarMissionScene'
import { anchorInstallProgress } from '../../src/features/visualization/utilities/lcrtRig'
import { mergeStaticMeshes } from '../../src/features/visualization/utilities/mergeStatic'
import { buildMissionWorld } from '../../src/features/visualization/utilities/missionWorld'
import { sceneSiteFrom } from '../../src/features/visualization/utilities/sceneSite'
import { renderThree } from '../helpers/renderThree'
import type { ThreeTestRoot } from '../helpers/renderThree'

const materials = createSpacecraftMaterials()
const world = buildMissionWorld(sceneSiteFrom(lunarSites[0]))
let root: ThreeTestRoot | undefined
afterEach(async () => {
  await root?.unmount()
  root = undefined
})

/** Meshes the renderer would draw (each instanced mesh is one draw). */
function drawnMeshes(object: Object3D): number {
  let n = 0
  object.traverseVisible((o) => {
    if ((o as Mesh).isMesh) n += 1
  })
  return n
}

describe('static mesh merging', () => {
  it('bakes same-material parts into one mesh with the same bounds, leaving instanced and hidden parts alone', () => {
    const material = new MeshStandardMaterial()
    const other = new MeshStandardMaterial()
    const rootGroup = new Group()
    rootGroup.position.set(5, 0, 0)
    const a = new Mesh(new BoxGeometry(1, 1, 1), material)
    a.position.set(-1, 0, 0)
    const b = new Mesh(new BoxGeometry(1, 2, 1), material)
    b.position.set(2, 1, 0)
    const lone = new Mesh(new BoxGeometry(1, 1, 1), other)
    const hidden = new Mesh(new BoxGeometry(1, 1, 1), material)
    hidden.visible = false
    // Instanced unit template: merging its 1 m geometry would draw a solid block (regression).
    const instanced = new InstancedMesh(new BoxGeometry(1, 1, 1), material, 3)
    instanced.setMatrixAt(0, new Matrix4().makeScale(0.01, 0.01, 0.01))
    rootGroup.add(a, b, lone, hidden, instanced)

    const { merged, sources } = mergeStaticMeshes(rootGroup)
    expect(merged).toHaveLength(1)
    expect(sources).toEqual([a, b])
    expect(merged[0].material).toBe(material)
    // Merged geometry is in the root's local frame and covers exactly the two parts.
    const box = new Box3().setFromBufferAttribute(merged[0].geometry.attributes.position as never)
    expect(box.min.toArray()).toEqual([-1.5, -0.5, -0.5])
    expect(box.max.toArray()).toEqual([2.5, 2, 0.5])
    expect(mergeStaticMeshes(rootGroup, 1).merged).toHaveLength(2)
  })
})

describe('mission hardware draw calls', () => {
  // Measured before this optimization (one draw per part): lander 210, rover 122, telescope 109.
  it('draws each model in far fewer calls than one per part', async () => {
    root = await renderThree(<LunarLander materials={materials} landing={1} animate={false} />)
    await root.frames(2)
    expect(drawnMeshes(root.scene)).toBeLessThanOrEqual(115)
    await root.unmount()
    root = await renderThree(<ConstructionRover materials={materials} animate={false} />)
    await root.frames(2)
    expect(drawnMeshes(root.scene)).toBeLessThanOrEqual(85)
    await root.unmount()
    root = await renderThree(<LCRTelescope layout={world.lcrt} materials={materials} deployment={1} animate={false} />)
    await root.frames(2)
    expect(drawnMeshes(root.scene)).toBeLessThanOrEqual(36)
  })

  it('keeps every merged mesh inside the part it came from (no unit-size template blocks)', async () => {
    root = await renderThree(<ConstructionRover materials={materials} animate={false} />)
    await root.frames(2)
    root.scene.updateMatrixWorld(true)
    const size = new Box3().setFromObject(root.scene, true).getSize(new Box3().min)
    // The rover is ~1.5 m long and ~1.3 m tall with its mast; nothing may stick out of that.
    expect(size.x).toBeLessThan(1.8)
    expect(size.y).toBeLessThan(1.5)
  })

  it('still spins the wheels: each wheel is merged inside its own rolling group', async () => {
    const motion = { current: { odometerM: 0, arm: { yaw: 0, shoulder: 1.2, elbow: -2.4, wrist: 1.2, drill: 0, spin: 0 }, layingCable: false } }
    root = await renderThree(<ConstructionRover materials={materials} motion={motion} animate={false} />)
    await root.frames(1)
    const merged: Mesh[] = []
    root.scene.traverse((o) => o.name === 'merged-static' && merged.push(o as Mesh))
    const spokes = merged.filter((m) => m.parent?.parent?.rotation !== undefined && m.material === materials.aluminium)
    expect(spokes.length).toBeGreaterThanOrEqual(6)
    const before = spokes.map((m) => m.parent!.parent!.rotation.z)
    motion.current.odometerM = 1
    await root.frames(1)
    spokes.forEach((m, i) => expect(m.parent!.parent!.rotation.z).not.toBeCloseTo(before[i]))
  })
})

describe('instanced telescope parts', () => {
  it('draws the anchors as one instanced assembly that grows each anchor on its schedule', async () => {
    const schedule = world.layout.anchorSchedule
    const at = 0.25
    root = await renderThree(<LCRTelescope layout={world.lcrt} materials={materials} deployment={at * 0.4} animate={false} anchorSchedule={schedule} />)
    await root.frames(2)
    const anchors = root.findAll('telescope-anchors').filter((o) => (o as InstancedMesh).isInstancedMesh) as InstancedMesh[]
    expect(anchors.length).toBeGreaterThanOrEqual(3)
    const expected = anchorInstallProgress(at, schedule)
    const m = new Matrix4()
    expected.forEach((k, i) => {
      anchors[0].getMatrixAt(i, m)
      const scale = Math.cbrt(Math.abs(m.determinant()))
      expect(scale).toBeCloseTo(Math.max(1e-4, k), 3)
    })
  })
})

describe('re-render cost', () => {
  it('skips re-rendering the hardware when only mission progress changes, and still animates', async () => {
    let actualMs = 0
    let baseMs = 0
    const onRender = (_id: string, phase: string, actual: number, base: number) => {
      if (phase === 'mount') return
      actualMs += actual
      baseMs += base
    }
    const scene = (t: number) => (
      <Profiler id="mission" onRender={onRender}>
        <LunarMissionScene world={world} visual={conceptVisualState(t)} earthVisible={false} animate selected={null} />
      </Profiler>
    )
    root = await renderThree(scene(0.4))
    await root.frames(1)
    // Playback ticks through construction: the memoized bodies bail out, so each commit costs a
    // small fraction of rendering the whole tree (React's baseDuration).
    for (let i = 0; i <= 30; i += 1) await root.rerender(scene(0.4 + i * 0.02))
    expect(actualMs).toBeLessThan(baseMs * 0.25)
    // The eased progress still reaches the models through refs: the reflector unfurls.
    await root.frames(150, 1 / 30)
    expect(root.find('telescope-reflector')!.scale.x).toBeGreaterThan(0.5)
  })
})
