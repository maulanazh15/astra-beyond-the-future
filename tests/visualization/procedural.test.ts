import { describe, expect, it } from 'vitest'
import { BufferAttribute, BufferGeometry } from 'three'
import { lunarSites } from '../../src/data'
import { beaconIntensity } from '../../src/features/visualization/animations/curves'
import { lcrtLayout } from '../../src/features/visualization/utilities/lcrtLayout'
import { buildMissionWorld } from '../../src/features/visualization/utilities/missionWorld'
import { fbm, valueNoise } from '../../src/features/visualization/utilities/noise'
import { earthSurface, gridAlphaMap, regolithNormalMap } from '../../src/features/visualization/utilities/proceduralTextures'
import { scatterRocks } from '../../src/features/visualization/utilities/rockField'
import { sceneSiteFrom } from '../../src/features/visualization/utilities/sceneSite'
import { createRng, hashSeed } from '../../src/features/visualization/utilities/seededRandom'
import { generateStars } from '../../src/features/visualization/utilities/starField'
import { trussTower } from '../../src/features/visualization/utilities/struts'
import { LANDER, deployedFeet } from '../../src/features/visualization/utilities/landerLayout'
import { craterProfile, createTerrain, createTerrainConfig } from '../../src/features/visualization/utilities/terrain'
import { buildTerrainArrays, ringRadii } from '../../src/features/visualization/utilities/terrainMesh'

const terrain = createTerrain(createTerrainConfig(hashSeed('site-farside-equatorial'), 'moderate'))

describe('seeded randomness', () => {
  it('repeats exactly for the same seed and differs between seeds', () => {
    const a = createRng(42)
    const b = createRng(42)
    const c = createRng(43)
    const seqA = Array.from({ length: 5 }, a)
    expect(Array.from({ length: 5 }, b)).toEqual(seqA)
    expect(Array.from({ length: 5 }, c)).not.toEqual(seqA)
    expect(seqA.every((v) => v >= 0 && v < 1)).toBe(true)
    expect(hashSeed('site-a')).toBe(hashSeed('site-a'))
    expect(hashSeed('site-a')).not.toBe(hashSeed('site-b'))
  })

  it('produces noise in range that tiles with a period', () => {
    for (let i = 0; i < 200; i += 1) {
      const x = i * 0.37
      const y = i * 0.91
      expect(valueNoise(x, y, 5)).toBeGreaterThanOrEqual(0)
      expect(valueNoise(x, y, 5)).toBeLessThan(1)
      expect(Math.abs(fbm(x, y, 5, 4))).toBeLessThanOrEqual(1)
      expect(valueNoise(x + 8, y, 5, 8)).toBeCloseTo(valueNoise(x, y, 5, 8), 10)
    }
  })
})

describe('crater profile', () => {
  it('is a bowl with a raised rim and ejecta that fades to zero', () => {
    expect(craterProfile(0, 20, 5)).toBeCloseTo(-5)
    expect(craterProfile(20, 20, 5)).toBeCloseTo(5 * 0.28)
    expect(craterProfile(30, 20, 5)).toBeGreaterThan(0)
    expect(craterProfile(30, 20, 5)).toBeLessThan(craterProfile(20, 20, 5))
    expect(craterProfile(60, 20, 5)).toBe(0)
    // Continuous at the rim and at the ejecta edge.
    expect(craterProfile(19.999, 20, 5)).toBeCloseTo(craterProfile(20.001, 20, 5), 2)
    expect(craterProfile(59.99, 20, 5)).toBeCloseTo(0, 3)
  })
})

describe('terrain', () => {
  it('is deterministic per seed', () => {
    const again = createTerrain(createTerrainConfig(hashSeed('site-farside-equatorial'), 'moderate'))
    expect(again.config).toEqual(terrain.config)
    expect(again.heightAt(12.3, -45.6)).toBe(terrain.heightAt(12.3, -45.6))
  })

  it('has a prominent main crater and many smaller ones, clear of the pad and each other', () => {
    const { mainCrater, craters, pad } = terrain.config
    const floor = terrain.heightAt(mainCrater.x, mainCrater.z)
    const rim = terrain.heightAt(mainCrater.x + mainCrater.radiusM, mainCrater.z)
    expect(rim - floor).toBeGreaterThan(mainCrater.depthM * 0.8)
    expect(craters.length).toBeGreaterThanOrEqual(15)
    for (const c of craters) {
      expect(Math.hypot(c.x - pad.x, c.z - pad.z)).toBeGreaterThan(pad.radiusM + c.radiusM)
      expect(Math.hypot(c.x - mainCrater.x, c.z - mainCrater.z)).toBeGreaterThan(mainCrater.radiusM)
    }
  })

  it('places more craters at rougher sites', () => {
    const seed = 99
    expect(createTerrainConfig(seed, 'high').craters.length).toBeGreaterThan(createTerrainConfig(seed, 'low').craters.length)
  })

  it('levels the landing pad so all four feet touch the ground', () => {
    const { pad } = terrain.config
    const center = terrain.heightAt(pad.x, pad.z)
    for (const foot of deployedFeet()) {
      expect(Math.abs(terrain.heightAt(pad.x + foot[0], pad.z + foot[2]) - center)).toBeLessThan(0.01)
    }
  })

  it('rises into hills toward the horizon', () => {
    const far = Array.from({ length: 36 }, (_, i) => terrain.heightAt(Math.cos(i / 5.7) * 1500, Math.sin(i / 5.7) * 1500))
    expect(Math.max(...far)).toBeGreaterThan(20)
  })
})

describe('terrain mesh', () => {
  it('uses dense rings near the site and reaches the horizon', () => {
    const radii = ringRadii(1800)
    expect(radii[0]).toBe(0)
    expect(radii[1]).toBeCloseTo(0.75)
    expect(radii.at(-1)).toBe(1800)
    for (let i = 1; i < radii.length; i += 1) expect(radii[i]).toBeGreaterThan(radii[i - 1])
  })

  it('stays within the triangle budget and builds valid, upward-facing geometry', () => {
    const arrays = buildTerrainArrays(terrain)
    const triangles = arrays.indices.length / 3
    expect(triangles).toBeLessThan(100_000)
    const vertices = arrays.positions.length / 3
    expect(arrays.indices.reduce((m, i) => Math.max(m, i), 0)).toBeLessThan(vertices)
    expect(arrays.positions.every(Number.isFinite)).toBe(true)

    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(arrays.positions, 3))
    geometry.setIndex(new BufferAttribute(arrays.indices, 1))
    geometry.computeVertexNormals()
    // Faces point up (wrong winding would make the mean normal point down).
    const normals = geometry.getAttribute('normal')
    let sumY = 0
    for (let i = 0; i < normals.count; i += 1) sumY += normals.getY(i)
    expect(sumY / normals.count).toBeGreaterThan(0.9)
  })
})

describe('rocks', () => {
  const keepOut = [{ x: 6, z: 6, radiusM: 4.5 }]

  it('scatters the same rocks every time, more at hazardous sites', () => {
    const rocks = scatterRocks(terrain, 'moderate', keepOut)
    expect(scatterRocks(terrain, 'moderate', keepOut)).toEqual(rocks)
    expect(rocks.length).toBeGreaterThan(200)
    expect(scatterRocks(terrain, 'high', keepOut).length).toBeGreaterThan(rocks.length)
  })

  it('keeps rocks out of keep-out zones and sits them in the regolith', () => {
    for (const rock of scatterRocks(terrain, 'moderate', keepOut)) {
      const [x, y, z] = rock.position
      expect(Math.hypot(x - 6, z - 6)).toBeGreaterThan(4.5)
      expect(y).toBeLessThan(terrain.heightAt(x, z))
      expect(rock.variant).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('Lunar Crater Radio Telescope layout', () => {
  const layout = lcrtLayout(terrain)

  it('suspends the dish clear of the crater floor', () => {
    expect(layout.clearanceM).toBeGreaterThanOrEqual(0.8 - 1e-9)
  })

  it('hangs the receiver at the paraboloid focus, below the tower tops', () => {
    expect(layout.focalLengthM).toBeCloseTo(layout.dishRadiusM ** 2 / (4 * layout.dishSagM))
    expect(layout.receiver[1]).toBeCloseTo(layout.dishVertexY + layout.focalLengthM)
    for (const base of layout.towerBases) expect(base[1] + layout.towerHeightM).toBeGreaterThan(layout.receiver[1])
  })

  it('stands three towers on the crater rim', () => {
    const { mainCrater } = terrain.config
    expect(layout.towerBases).toHaveLength(3)
    for (const [x, , z] of layout.towerBases) {
      expect(Math.hypot(x - mainCrater.x, z - mainCrater.z) / mainCrater.radiusM).toBeCloseTo(1.04)
    }
  })
})

describe('mission world per site', () => {
  it.each(lunarSites.map((s) => [s.id, s] as const))('%s builds deterministically with the lander on its pad', (_id, site) => {
    const sceneSite = sceneSiteFrom(site)
    const world = buildMissionWorld(sceneSite)
    expect(buildMissionWorld(sceneSite).rocks).toEqual(world.rocks)
    const { pad } = world.terrain.config
    expect(world.landerPosition[1]).toBeCloseTo(world.terrain.heightAt(pad.x, pad.z))
  })

  it('shows Earth only at Earth-facing (non radio-quiet) sites', () => {
    for (const site of lunarSites) expect(sceneSiteFrom(site).earthVisible).toBe(!site.radioQuiet)
    expect(lunarSites.some((s) => sceneSiteFrom(s).earthVisible)).toBe(true)
  })

  it('gives each site its own terrain', () => {
    const [a, b] = lunarSites.map((s) => buildMissionWorld(sceneSiteFrom(s)))
    expect(a.terrain.config.seed).not.toBe(b.terrain.config.seed)
  })
})

describe('sky, structures and textures', () => {
  it('places stars above the horizon on the sky dome', () => {
    const { positions, colors } = generateStars(1, 500, 1000)
    expect(positions.length).toBe(1500)
    expect(colors.length).toBe(1500)
    for (let i = 0; i < 500; i += 1) {
      const [x, y, z] = [positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]]
      expect(Math.hypot(x, y, z)).toBeCloseTo(1000, 0)
      expect(y).toBeGreaterThanOrEqual(-51)
    }
  })

  it('builds truss towers and four-legged landing gear', () => {
    expect(trussTower([0, 0, 0], 10, 2, 0.5, 5)).toHaveLength(5 * 12)
    const feet = deployedFeet()
    expect(feet).toHaveLength(4)
    expect(feet.every((f) => Math.abs(f[1] - LANDER.footY) < 1e-9)).toBe(true)
  })

  it('generates textures of the requested size with plausible content', () => {
    const normals = regolithNormalMap(32, 1)
    expect(normals.data.length).toBe(32 * 32 * 4)
    // Mostly facing out of the surface: blue (z) channel dominant.
    for (let i = 0; i < normals.data.length; i += 4) expect(normals.data[i + 2]).toBeGreaterThan(127)

    const grid = gridAlphaMap(64, 8, 0.1)
    expect(grid.data[0]).toBe(255) // on a line
    expect(grid.data[(4 * 64 + 4) * 4]).toBe(0) // inside a cell

    const earth = earthSurface(64, 32, 3)
    const pixels = Array.from({ length: 64 * 32 }, (_, i) => earth.data.slice(i * 4, i * 4 + 3))
    expect(pixels.some(([r, , b]) => b > r + 60)).toBe(true) // ocean
    expect(pixels.some(([, g, b]) => g >= b)).toBe(true) // land or ice
  })

  it('blinks beacons briefly once per period', () => {
    expect(beaconIntensity(0, { periodS: 2, peak: 6, base: 0.4 })).toBe(6)
    expect(beaconIntensity(1, { periodS: 2, peak: 6, base: 0.4 })).toBe(0.4)
    expect(beaconIntensity(2.05, { periodS: 2, peak: 6, base: 0.4 })).toBe(6)
  })
})
