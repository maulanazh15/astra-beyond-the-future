import type { LcrtReference } from '../../../types/environment'
import type { LcrtLayout } from './lcrtLayout'

/**
 * Scale policy of the LUNAR ECHO scene (see documentation/3d-asset-pipeline.md, "Scene scale"):
 * the lander, rover, anchors, towers, and receiver are drawn at their own plausible size, while the
 * observatory site (crater and reflector) is a compressed gameplay stand-in for the LCRT concept,
 * so it fits one view with the hardware that builds it. Inside the stand-in every relation holds:
 * the receiver sits at the reflector's true focal point and every cable ends on real geometry.
 */
export type TelescopeScale = {
  reflectorSceneM: number
  reflectorConceptM: number
  /** Concept size ÷ scene size (linear). */
  reflectorFactor: number
  craterSceneM: number
  craterConceptM: number
  craterFactor: number
}

export function telescopeScale(lcrt: LcrtLayout, reference: LcrtReference): TelescopeScale {
  const reflectorSceneM = lcrt.dishRadiusM * 2
  const craterSceneM = lcrt.craterRadiusM * 2
  const reflectorConceptM = reference.reflectorDiameterM.value
  const craterConceptM = reference.craterDiameterKm.value * 1000
  return {
    reflectorSceneM,
    reflectorConceptM,
    reflectorFactor: reflectorConceptM / reflectorSceneM,
    craterSceneM,
    craterConceptM,
    craterFactor: craterConceptM / craterSceneM,
  }
}

/** "≈1:11" for a linear compression factor of ~11. */
export function scaleRatio(factor: number): string {
  return `≈1:${Math.round(factor)}`
}
