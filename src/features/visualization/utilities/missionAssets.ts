import { lcrtReference } from '../../../data'
import { egressPose, telescopeStepLabel } from '../animations/missionTimeline'
import type { MissionVisualState } from '../animations/missionTimeline'
import { LANDER, PRIMARY_STRUT_LENGTH_M } from './landerLayout'
import type { LcrtLayout } from './lcrtLayout'
import type { MissionAssetId } from './missionSceneLayout'
import { ROVER } from './roverLayout'
import { scaleRatio, telescopeScale } from './sceneScale'

export type { MissionAssetId }

export const MISSION_ASSET_IDS: readonly MissionAssetId[] = ['lander', 'telescope', 'rover']

export type MissionAssetInfo = {
  id: MissionAssetId
  name: string
  role: string
  description: string
  specs: { label: string; value: string }[]
  /** Shown for hardware inspired by published concepts, so it is never mistaken for a real mission. */
  provenance?: string
  /** Registry id of a GLB that can replace the procedural model. */
  modelAssetId: string
}

const m = (v: number) => `${v.toFixed(1)} m`

/** Static description of each asset, with dimensions taken from the models' own layouts. */
export function missionAssetInfo(id: MissionAssetId, lcrt: LcrtLayout): MissionAssetInfo {
  const scale = telescopeScale(lcrt, lcrtReference)
  switch (id) {
    case 'lander':
      return {
        id,
        name: 'LUNAR ECHO Lander',
        role: 'Delivery and surface base',
        description:
          'Four-legged robotic lander. Its descent engine and four propellant tanks sit in an open bay under the insulated avionics body; the construction rover rides on a payload shelf and drives down a ramp after touchdown.',
        specs: [
          { label: 'Footprint', value: m(LANDER.footRadiusM * 2 + 0.6) },
          { label: 'Deck height', value: m(LANDER.deckTopY) },
          { label: 'Legs', value: `4 × ${m(PRIMARY_STRUT_LENGTH_M)}` },
          { label: 'Tanks', value: '4 prop + 2 He' },
        ],
        modelAssetId: 'lander-lunar-echo',
      }
    case 'telescope':
      return {
        id,
        name: 'Crater Radio Telescope',
        role: 'Science payload',
        description:
          'Wire-mesh reflector suspended in the crater by cables from rim anchors, with a receiver hung at the focal point from three rim towers. Built in place by robots.',
        specs: [
          { label: 'Reflector (scene)', value: `${scale.reflectorSceneM.toFixed(0)} m dia.` },
          { label: 'Concept', value: `${scale.reflectorConceptM.toFixed(0)} m dia.` },
          { label: 'Scene scale', value: scaleRatio(scale.reflectorFactor) },
          { label: 'Focal length', value: m(lcrt.focalLengthM) },
          { label: 'Towers', value: `${lcrt.towerBases.length} × ${lcrt.towerHeightM.toFixed(0)} m` },
          { label: 'Rim anchors', value: String(lcrt.anchors.length) },
        ],
        provenance: `Hypothetical ASTRA hardware inspired by the NASA NIAC Lunar Crater Radio Telescope Phase II concept (a ${scale.reflectorConceptM.toFixed(0)} m reflector in a ${(scale.craterConceptM / 1000).toFixed(1)} km crater). Shown at a compressed gameplay scale: reflector ${scaleRatio(scale.reflectorFactor)}, crater ${scaleRatio(scale.craterFactor)}; the lander and rover are drawn at their own size. Not an operational NASA mission.`,
        modelAssetId: 'structure-lcrt-telescope',
      }
    case 'rover':
      return {
        id,
        name: 'Construction Rover',
        role: 'Robotic assembly',
        description:
          'Six-wheel rocker-bogie rover that installs rim anchors with its arm-mounted anchor drill and pays out suspension cable from a rear spool.',
        specs: [
          { label: 'Length', value: m(ROVER.lengthM) },
          { label: 'Wheels', value: `6 × ⌀${(ROVER.wheelRadiusM * 200).toFixed(0)} cm` },
          { label: 'Arm', value: '4 joints + drill' },
          { label: 'Mast camera', value: 'Stereo pan/tilt' },
        ],
        modelAssetId: 'rover-deployment',
      }
  }
}

/** One-line live status of an asset for the info card. */
export function missionAssetStatus(id: MissionAssetId, visual: MissionVisualState): string {
  switch (id) {
    case 'lander':
      if (!visual.landerVisible) return visual.stage === 'lost' ? 'Lost before touchdown' : 'Not yet landed'
      if (visual.landing < 1) return 'Powered descent'
      return visual.roverPresent && visual.roverEgress < 1 && visual.roverEgress > 0 ? 'Deploying rover' : 'Landed · systems nominal'
    case 'telescope':
      if (!visual.telescopeVisible) return 'Stowed aboard the lander'
      return `${telescopeStepLabel(visual.telescope)} · ${Math.round(visual.telescope * 100)}%${visual.receiverActive ? ' · receiver observing' : ''}`
    case 'rover':
      if (!visual.roverPresent) return 'Not in this design'
      if (visual.roverActivity === 'stowed') return 'Clamped on the payload shelf'
      if (visual.roverActivity === 'egress') return egressPose(visual.roverEgress).ramp < 1 ? 'Lowering the ramp' : 'Driving down the ramp'
      if (visual.roverActivity === 'working') return 'Installing anchors and running cable'
      return visual.night ? 'Parked for the lunar night' : 'Parked'
  }
}

/** Assets that exist in the scene right now (the rover only if the design carries one). */
export function presentAssets(visual: MissionVisualState): MissionAssetId[] {
  return MISSION_ASSET_IDS.filter((id) => (id === 'lander' ? visual.landerVisible : id === 'telescope' ? visual.telescopeVisible : visual.roverPresent && visual.landerVisible))
}

export function toggleHidden(hidden: ReadonlySet<MissionAssetId>, id: MissionAssetId): ReadonlySet<MissionAssetId> {
  const next = new Set(hidden)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}

/** The selection that stays valid: a hidden or absent asset cannot stay selected. */
export function resolveSelection(selected: MissionAssetId | null, visual: MissionVisualState, hidden: ReadonlySet<MissionAssetId>): MissionAssetId | null {
  if (!selected || hidden.has(selected)) return null
  return presentAssets(visual).includes(selected) ? selected : null
}

