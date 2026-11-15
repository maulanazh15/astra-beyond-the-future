import type { ComponentCategory } from '../../../types/component'

/**
 * Which procedural model represents each catalog component, and where it mounts.
 * Pure data: the 3D viewer never decides what is installed, only how it looks.
 */
export type ModuleKind =
  | 'bus'
  | 'propulsionTanks'
  | 'mainEngine'
  | 'solarWing'
  | 'rpsGenerator'
  | 'batteryPack'
  | 'fuelCell'
  | 'lowGainAntenna'
  | 'highGainDish'
  | 'opticalTerminal'
  | 'dipoleArray'
  | 'meshReflector'
  | 'receiverSuite'
  | 'landingGear'
  | 'hazardSensor'
  | 'heaterSystem'
  | 'rhuCluster'
  | 'radiatorPanel'
  | 'rover'
  | 'winch'
  | 'roboticArm'
  | 'structure'

/** core = the bus; under = below the bus; skin = changes the bus surface; gear = landing gear. */
export type MountType = 'core' | 'under' | 'side-upper' | 'side-lower' | 'deck' | 'gear' | 'skin'

export type VisualPart = {
  kind: ModuleKind
  mount: MountType
  /** Model variant within the kind, e.g. engine type or panel count. */
  variant: string
  /** Side faces (0–7, 45° apart, face 0 = +X) in order of preference. */
  faces?: number[]
  /** Deck slots in order of preference (0 = center, 1–6 = ring). */
  deckSlots?: number[]
}

const ANY_DECK = [1, 2, 3, 4, 5, 6, 0]

/** Every catalog component maps to one or more visual parts. A test enforces full coverage. */
export const componentVisuals: Record<string, VisualPart[]> = {
  'bus-small': [{ kind: 'bus', mount: 'core', variant: 'compact' }],
  'bus-medium': [{ kind: 'bus', mount: 'core', variant: 'standard' }],
  'bus-heavy': [{ kind: 'bus', mount: 'core', variant: 'cargo' }],

  // A propulsion unit is a tank set (the propulsion module) plus its engine.
  'prp-biprop': [
    { kind: 'propulsionTanks', mount: 'under', variant: 'biprop' },
    { kind: 'mainEngine', mount: 'under', variant: 'biprop' },
  ],
  'prp-throttle': [
    { kind: 'propulsionTanks', mount: 'under', variant: 'throttle' },
    { kind: 'mainEngine', mount: 'under', variant: 'throttle' },
  ],
  'prp-electric': [
    { kind: 'propulsionTanks', mount: 'under', variant: 'electric' },
    { kind: 'mainEngine', mount: 'under', variant: 'electric' },
  ],

  'pwr-solar-std': [{ kind: 'solarWing', mount: 'side-upper', variant: 'standard', faces: [0, 4, 2, 6] }],
  'pwr-solar-hi': [{ kind: 'solarWing', mount: 'side-upper', variant: 'high-efficiency', faces: [0, 4, 2, 6] }],
  'pwr-rps': [{ kind: 'rpsGenerator', mount: 'side-lower', variant: 'rps', faces: [5, 3, 1, 7] }],

  'bat-liion': [{ kind: 'batteryPack', mount: 'side-lower', variant: 'standard', faces: [3, 5, 1, 7, 2, 6] }],
  'bat-liion-hc': [{ kind: 'batteryPack', mount: 'side-lower', variant: 'high-capacity', faces: [3, 5, 1, 7, 2, 6] }],
  'bat-rfc': [{ kind: 'fuelCell', mount: 'side-lower', variant: 'rfc', faces: [3, 5, 1, 7, 2, 6] }],

  'com-sband': [{ kind: 'lowGainAntenna', mount: 'deck', variant: 's-band', deckSlots: [5, 2, 4, 1, 3, 6] }],
  'com-xband': [{ kind: 'highGainDish', mount: 'deck', variant: 'x-band', deckSlots: [1, 4, 2, 5, 3, 6] }],
  'com-optical': [{ kind: 'opticalTerminal', mount: 'deck', variant: 'optical', deckSlots: [4, 1, 3, 6, 2, 5] }],

  'pay-dipole': [{ kind: 'dipoleArray', mount: 'deck', variant: 'dipole', deckSlots: [0, 3, 6, 2, 5] }],
  'pay-mesh': [{ kind: 'meshReflector', mount: 'deck', variant: 'mesh', deckSlots: [0, 3, 6, 2, 5] }],
  'pay-receiver': [{ kind: 'receiverSuite', mount: 'deck', variant: 'receiver', deckSlots: [6, 3, 2, 5, 0] }],

  'lnd-legs': [{ kind: 'landingGear', mount: 'gear', variant: 'legs' }],
  'lnd-crush': [{ kind: 'landingGear', mount: 'gear', variant: 'crush' }],
  'lnd-hda': [{ kind: 'hazardSensor', mount: 'side-lower', variant: 'hda', faces: [1, 7, 3, 5] }],

  'thm-passive': [{ kind: 'bus', mount: 'skin', variant: 'mli' }],
  'thm-heaters': [{ kind: 'heaterSystem', mount: 'side-lower', variant: 'heaters', faces: [2, 6, 1, 7] }],
  'thm-rhu': [{ kind: 'rhuCluster', mount: 'side-lower', variant: 'rhu', faces: [4, 0, 2, 6] }],
  'thm-radiator': [{ kind: 'radiatorPanel', mount: 'side-upper', variant: 'radiator', faces: [6, 2, 5, 3, 1, 7] }],

  'rob-rover': [{ kind: 'rover', mount: 'side-lower', variant: 'rover', faces: [6, 2, 4, 0] }],
  'rob-winch': [{ kind: 'winch', mount: 'side-lower', variant: 'winch', faces: [7, 1, 5, 3] }],
  'rob-arm': [{ kind: 'roboticArm', mount: 'deck', variant: 'arm', deckSlots: [3, 6, 2, 5, 1, 4] }],
}

/** Fallback for components added to the catalog later without a dedicated model. */
export const categoryFallbackVisuals: Record<ComponentCategory, VisualPart> = {
  bus: { kind: 'bus', mount: 'core', variant: 'standard' },
  propulsion: { kind: 'mainEngine', mount: 'under', variant: 'biprop' },
  power: { kind: 'solarWing', mount: 'side-upper', variant: 'standard', faces: [0, 4, 2, 6] },
  battery: { kind: 'batteryPack', mount: 'side-lower', variant: 'standard', faces: [3, 5, 1, 7, 2, 6] },
  communication: { kind: 'lowGainAntenna', mount: 'deck', variant: 's-band', deckSlots: ANY_DECK },
  payload: { kind: 'receiverSuite', mount: 'deck', variant: 'receiver', deckSlots: ANY_DECK },
  landing: { kind: 'hazardSensor', mount: 'side-lower', variant: 'hda', faces: [1, 7, 3, 5] },
  thermal: { kind: 'radiatorPanel', mount: 'side-upper', variant: 'radiator', faces: [6, 2, 5, 3, 1, 7] },
  robotics: { kind: 'winch', mount: 'side-lower', variant: 'winch', faces: [7, 1, 5, 3] },
}
