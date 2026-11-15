import type { SpacecraftMaterials } from '../../materials/spacecraftMaterials'
import type { BusDims } from '../../utilities/spacecraftAssembly'

/** Props every procedural module receives. Local frame conventions are documented per mount type. */
export type ModuleProps = {
  variant: string
  materials: SpacecraftMaterials
  dims: BusDims
}
