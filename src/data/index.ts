import type {
  ComponentCatalog,
  ComponentCategoryDefinition,
  DataDisclaimer,
  SpacecraftComponent,
} from '../types/component'
import type { LaunchVehicle, Mission, OrbitProfile } from '../types/mission'
import type { SimulationConfig } from '../types/simulation'
import type { GameplayAssumptions } from '../types/validation'
import simulationConfigJson from './simulation/simulation-config.json'
import assumptionsJson from './assumptions/gameplay-assumptions.json'
import categoriesJson from './components/categories.json'
import componentsJson from './components/components.json'
import launchVehiclesJson from './launch-vehicles/launch-vehicles.json'
import missionsJson from './missions/missions.json'
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
