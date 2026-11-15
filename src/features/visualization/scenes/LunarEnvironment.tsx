import { memo } from 'react'
import { getModelAsset } from '../assetRegistry'
import { ModelViewer } from '../components/ModelViewer'
import { Earth } from '../models/Earth'
import { LunarTerrain } from '../models/LunarTerrain'
import { RockField } from '../models/RockField'
import { StarField } from '../models/StarField'
import type { RockInstance, Terrain, Vec3 } from '../types/scene'

const TERRAIN_ASSET_ID = 'env-lunar-farside-terrain'

/**
 * Earth placement for Earth-facing sites: ~3 km away, ~7° above the horizon, just right of the
 * overview camera's line of sight so it sits above the horizon hills. On the near side Earth's
 * elevation depends on the site's position; this is a representative, framed placement.
 */
const EARTH_POSITION_M: Vec3 = [-1200, 370, -2750]
/**
 * ~1.5× Earth's true angular size from the Moon (~1.9°), enlarged slightly so it reads on small
 * screens. A presentation choice, noted in the docs.
 */
const EARTH_RADIUS_M = 85

type LunarEnvironmentProps = {
  terrain: Terrain
  rocks: RockInstance[]
  /** Near-side sites see Earth; far-side sites never do. */
  earthVisible: boolean
  animate: boolean
}

/** Ground to the horizon, rocks and boulders, stars, and Earth when the site faces it. */
export const LunarEnvironment = memo(function LunarEnvironment({ terrain, rocks, earthVisible, animate }: LunarEnvironmentProps) {
  const ground = <LunarTerrain terrain={terrain} />
  // A sculpted terrain model replaces the procedural ground once it is registered as available.
  const terrainAsset = getModelAsset(TERRAIN_ASSET_ID)
  return (
    <>
      {terrainAsset?.status === 'available' ? <ModelViewer asset={terrainAsset} placeholder={ground} /> : ground}
      <RockField rocks={rocks} />
      <StarField seed={terrain.config.seed + 3} />
      {earthVisible && <Earth positionM={EARTH_POSITION_M} radiusM={EARTH_RADIUS_M} seed={terrain.config.seed} animate={animate} />}
    </>
  )
})
