import type { SceneSite } from '../types/scene'
import { lcrtLayout } from './lcrtLayout'
import { corridorKeepOut, defaultMissionSceneConfig, missionSceneLayout } from './missionSceneLayout'
import type { MissionSceneConfig } from './missionSceneLayout'
import { scatterRocks } from './rockField'
import { hashSeed } from './seededRandom'
import { createTerrain, createTerrainConfig } from './terrain'

/** Builds the deterministic world for a site: terrain, telescope layout, hardware layout, and rocks. */
export function buildMissionWorld(site: SceneSite, config: MissionSceneConfig = defaultMissionSceneConfig) {
  const terrain = createTerrain(createTerrainConfig(hashSeed(site.id), site.hazardLevel))
  const lcrt = lcrtLayout(terrain)
  const layout = missionSceneLayout(terrain, lcrt, config)
  const { pad } = terrain.config
  const rocks = scatterRocks(terrain, site.hazardLevel, [
    { x: pad.x, z: pad.z, radiusM: pad.radiusM },
    { x: lcrt.center.x, z: lcrt.center.z, radiusM: lcrt.dishRadiusM + 1 },
    ...lcrt.towerBases.map(([x, , z]) => ({ x, z, radiusM: 2 })),
    ...lcrt.anchors.map(([x, , z]) => ({ x, z, radiusM: 1.2 })),
    ...corridorKeepOut(layout),
  ])
  return { terrain, lcrt, layout, rocks, landerPosition: layout.lander.positionM }
}

export type MissionWorld = ReturnType<typeof buildMissionWorld>
