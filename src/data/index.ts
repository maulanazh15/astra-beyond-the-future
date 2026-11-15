import type {
  ComponentCatalog,
  ComponentCategoryDefinition,
  DataDisclaimer,
  SpacecraftComponent,
} from '../types/component'
import type { LcrtReference, LunarSite, ThermalProfile } from '../types/environment'
import type { LaunchVehicle, Mission, OrbitProfile } from '../types/mission'
import type { ModelAsset } from '../types/modelAsset'
import type { NasaSource } from '../types/nasaSource'
import type { SimulationConfig } from '../types/simulation'
import type { GameplayAssumptions } from '../types/validation'
import simulationConfigJson from './simulation/simulation-config.json'
import modelAssetsJson from './assets/model-assets.json'
import assumptionsJson from './assumptions/gameplay-assumptions.json'
import categoriesJson from './components/categories.json'
import componentsJson from './components/components.json'
import lcrtReferenceJson from './environment/lcrt-reference.json'
import lunarSitesJson from './environment/lunar-sites.json'
import thermalProfilesJson from './environment/thermal-profiles.json'
import launchVehiclesJson from './launch-vehicles/launch-vehicles.json'
import missionsJson from './missions/missions.json'
import nasaSourcesJson from './nasa-sources/nasa-sources.json'
import orbitProfilesJson from './orbit-profiles/orbit-profiles.json'

export const missions = missionsJson.missions as Mission[]
export const missionDisclaimer = missionsJson.disclaimer as DataDisclaimer

export const componentCatalog: ComponentCatalog = {
  categories: categoriesJson as ComponentCategoryDefinition[],
  components: componentsJson.components as SpacecraftComponent[],
}
export const componentDisclaimer = componentsJson.disclaimer as DataDisclaimer

export const gameplayAssumptions: GameplayAssumptions = assumptionsJson.values
export const assumptionDescriptions = assumptionsJson.descriptions as Record<keyof GameplayAssumptions, string>
export const assumptionDisclaimer = assumptionsJson.disclaimer as DataDisclaimer

export const simulationConfig: SimulationConfig = simulationConfigJson.values
export const simulationDisclaimer = simulationConfigJson.disclaimer as DataDisclaimer

export const launchVehicles = launchVehiclesJson as LaunchVehicle[]
export const orbitProfiles = orbitProfilesJson as OrbitProfile[]

export function getMission(id: string | undefined): Mission | undefined {
  return missions.find((mission) => mission.id === id && mission.status === 'available')
}

export const nasaSources = nasaSourcesJson.sources as NasaSource[]
export const nasaSourcesNote = nasaSourcesJson.note
export const lunarSites = lunarSitesJson.sites as LunarSite[]
export const lunarSitesNote = lunarSitesJson.note
export const thermalProfiles = thermalProfilesJson.profiles as ThermalProfile[]
export const thermalProfilesNote = thermalProfilesJson.note
export const lcrtReference = lcrtReferenceJson.reference as LcrtReference
export const lcrtReferenceNote = lcrtReferenceJson.note

export function getSource(id: string): NasaSource | undefined {
  return nasaSources.find((source) => source.id === id)
}

export function getSite(id: string | undefined): LunarSite | undefined {
  return lunarSites.find((site) => site.id === id)
}

export function getThermalProfile(site: LunarSite | undefined): ThermalProfile | undefined {
  return site && thermalProfiles.find((profile) => profile.id === site.thermalProfileId)
}

export const modelAssets = modelAssetsJson.assets as ModelAsset[]
export const modelAssetsNote = modelAssetsJson.note
