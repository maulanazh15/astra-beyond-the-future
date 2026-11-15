import { describe, expect, it } from 'vitest'
import { componentCatalog } from '../../src/data'
import { moduleAssetFor } from '../../src/features/visualization/assetRegistry'
import { componentVisuals } from '../../src/features/visualization/utilities/componentVisuals'
import { landingLegLayout } from '../../src/features/visualization/utilities/hardwareLayout'
import { describeModule } from '../../src/features/visualization/utilities/moduleInfo'
import { assembleSpacecraft, hangarFraming } from '../../src/features/visualization/utilities/spacecraftAssembly'
import type { DesignEntry } from '../../src/types/component'

const design = (...ids: (string | [string, number])[]): DesignEntry[] =>
  ids.map((id) => (typeof id === 'string' ? { componentId: id, quantity: 1 } : { componentId: id[0], quantity: id[1] }))

const REFERENCE = design('bus-small', 'prp-throttle', 'pwr-solar-std', 'bat-rfc', 'com-xband', 'pay-dipole', 'lnd-legs', 'thm-passive', 'rob-winch')
const kinds = (entries: DesignEntry[]) => assembleSpacecraft(entries, componentCatalog).modules.map((m) => `${m.componentId ?? 'structure'}:${m.kind}:${m.variant}`)

describe('component → model mapping', () => {
  it('has a dedicated visual for every catalog component', () => {
    for (const component of componentCatalog.components) {
      expect(componentVisuals[component.id], `${component.id} has no visual`).toBeDefined()
    }
  })

  it('maps each component to a distinct model variant within its category', () => {
    const byCategory = new Map<string, Set<string>>()
    for (const c of componentCatalog.components) {
      const signature = componentVisuals[c.id].map((p) => `${p.kind}/${p.variant}`).join('+')
      const seen = byCategory.get(c.category) ?? new Set()
      expect(seen.has(signature), `${c.id} looks identical to another ${c.category} option`).toBe(false)
      seen.add(signature)
      byCategory.set(c.category, seen)
    }
  })
})

describe('assembly follows the design (single source of truth)', () => {
  it('shows only structure for an empty design', () => {
    const assembly = assembleSpacecraft([], componentCatalog)
    expect(assembly.busVariant).toBeNull()
    expect(assembly.modules.map((m) => m.kind)).toEqual(['structure'])
    expect(assembly.modules[0].variant).toBe('frame+stand')
  })

  it('creates modules only for installed components', () => {
    const installed = new Set(REFERENCE.map((e) => e.componentId))
    for (const module of assembleSpacecraft(REFERENCE, componentCatalog).modules) {
      if (module.componentId) expect(installed.has(module.componentId)).toBe(true)
      else expect(module.category).toBe('structure')
    }
  })

  it('represents every installed component in the 3D model', () => {
    const assembly = assembleSpacecraft(REFERENCE, componentCatalog)
    const shown = new Set(assembly.modules.map((m) => m.componentId))
    for (const entry of REFERENCE) {
      // Insulation is shown on the bus skin rather than as a separate module.
      if (entry.componentId === 'thm-passive') expect(assembly.insulated).toBe(true)
      else expect(shown.has(entry.componentId), entry.componentId).toBe(true)
    }
  })

  it('is deterministic', () => {
    expect(assembleSpacecraft(REFERENCE, componentCatalog)).toEqual(assembleSpacecraft(REFERENCE, componentCatalog))
  })

  it('adds a solar panel model when a solar array is selected', () => {
    const without = kinds(design('bus-small'))
    const withSolar = kinds(design('bus-small', 'pwr-solar-std'))
    expect(without.some((k) => k.includes('solarWing'))).toBe(false)
    expect(withSolar).toContain('pwr-solar-std:solarWing:standard')
    expect(kinds(design('bus-small', 'pwr-solar-hi'))).toContain('pwr-solar-hi:solarWing:high-efficiency')
    expect(kinds(design('bus-small', 'pwr-rps'))).toContain('pwr-rps:rpsGenerator:rps')
  })

  it('changes the engine assembly with the propulsion choice', () => {
    for (const [id, variant] of [['prp-biprop', 'biprop'], ['prp-throttle', 'throttle'], ['prp-electric', 'electric']] as const) {
      const k = kinds(design('bus-small', id))
      expect(k).toContain(`${id}:mainEngine:${variant}`)
      expect(k).toContain(`${id}:propulsionTanks:${variant}`)
    }
  })

  it('changes the antenna with the communication hardware', () => {
    expect(kinds(design('bus-small', 'com-sband'))).toContain('com-sband:lowGainAntenna:s-band')
    expect(kinds(design('bus-small', 'com-xband'))).toContain('com-xband:highGainDish:x-band')
    expect(kinds(design('bus-small', 'com-optical'))).toContain('com-optical:opticalTerminal:optical')
  })

  it('adds the matching instrument for each scientific payload', () => {
    expect(kinds(design('bus-small', 'pay-dipole'))).toContain('pay-dipole:dipoleArray:dipole')
    expect(kinds(design('bus-small', 'pay-mesh'))).toContain('pay-mesh:meshReflector:mesh')
    expect(kinds(design('bus-small', 'pay-receiver'))).toContain('pay-receiver:receiverSuite:receiver')
  })

  it('reflects thermal choices: foil skin for MLI, separate radiator/heater/RHU hardware', () => {
    expect(assembleSpacecraft(design('bus-small'), componentCatalog).insulated).toBe(false)
    expect(assembleSpacecraft(design('bus-small', 'thm-passive'), componentCatalog).insulated).toBe(true)
    const k = kinds(design('bus-small', 'thm-radiator', 'thm-heaters', 'thm-rhu'))
    expect(k).toEqual(expect.arrayContaining(['thm-radiator:radiatorPanel:radiator', 'thm-heaters:heaterSystem:heaters', 'thm-rhu:rhuCluster:rhu']))
  })

  it('sizes the bus by variant and shows a stand without landing gear', () => {
    const small = assembleSpacecraft(design('bus-small'), componentCatalog)
    const heavy = assembleSpacecraft(design('bus-heavy'), componentCatalog)
    expect(heavy.dims.radiusM).toBeGreaterThan(small.dims.radiusM)
    expect(small.gear).toBeNull()
    expect(small.modules.find((m) => m.kind === 'structure')?.variant).toBe('frame+stand')
    expect(assembleSpacecraft(design('bus-small', 'lnd-legs'), componentCatalog).gear).toBe('legs')
    expect(assembleSpacecraft(design('bus-small', 'lnd-crush'), componentCatalog).gear).toBe('crush')
    expect(assembleSpacecraft(design('bus-small', 'lnd-legs', 'lnd-crush'), componentCatalog).gear).toBe('legs+crush')
  })

  it('creates one module per installed unit', () => {
    const assembly = assembleSpacecraft(design('bus-small', ['pwr-solar-std', 2], ['bat-liion', 3]), componentCatalog)
    expect(assembly.modules.filter((m) => m.componentId === 'pwr-solar-std')).toHaveLength(2)
    expect(assembly.modules.filter((m) => m.componentId === 'bat-liion')).toHaveLength(3)
    expect(new Set(assembly.modules.map((m) => m.key)).size).toBe(assembly.modules.length)
  })

  it('mounts twin engines side by side', () => {
    const engines = assembleSpacecraft(design('bus-small', ['prp-biprop', 2]), componentCatalog).modules.filter((m) => m.kind === 'mainEngine')
    expect(engines).toHaveLength(2)
    expect(engines[0].position[0]).toBeLessThan(0)
    expect(engines[1].position[0]).toBeGreaterThan(0)
  })

  it('reports unknown parts instead of inventing a model for them', () => {
    const assembly = assembleSpacecraft(design('bus-small', 'retired-part'), componentCatalog)
    expect(assembly.unknown).toEqual(['retired-part'])
    expect(assembly.modules.some((m) => m.componentId === 'retired-part')).toBe(false)
  })
})

describe('mount points', () => {
  /** The fullest legal design: every category at its unit limit. */
  const full = design(
    'bus-heavy',
    ['prp-biprop', 2],
    ['pwr-solar-hi', 2],
    'pwr-rps',
    ['bat-liion', 2],
    ['bat-rfc', 2],
    'com-xband',
    'com-optical',
    'pay-mesh',
    'pay-dipole',
    'pay-receiver',
    'lnd-legs',
    'lnd-hda',
    'thm-radiator',
    'thm-heaters',
    'thm-rhu',
    'rob-rover',
    'rob-winch',
    'rob-arm',
  )

  it('places every unit of a maxed-out design without sharing a mount point', () => {
    const assembly = assembleSpacecraft(full, componentCatalog)
    expect(assembly.unplaced).toEqual([])
    const mounted = assembly.modules.filter((m) => m.mount.startsWith('side') || m.mount === 'deck')
    const spots = mounted.map((m) => `${m.mount}:${m.position.map((v) => v.toFixed(3)).join(',')}`)
    expect(new Set(spots).size).toBe(spots.length)
  })

  it('puts side modules on the bus faces, facing outward', () => {
    const assembly = assembleSpacecraft(full, componentCatalog)
    const apothem = assembly.dims.radiusM * Math.cos(Math.PI / 8)
    for (const m of assembly.modules.filter((mod) => mod.mount.startsWith('side'))) {
      const [x, , z] = m.position
      expect(Math.hypot(x, z)).toBeCloseTo(apothem)
      // Local +X after rotation points along the mount direction.
      expect(Math.cos(m.rotationY) * x - Math.sin(m.rotationY) * z).toBeCloseTo(apothem)
    }
  })

  it('keeps deck modules on the deck and gear feet on the ground', () => {
    const assembly = assembleSpacecraft(full, componentCatalog)
    const top = assembly.dims.baseY + assembly.dims.heightM
    for (const m of assembly.modules.filter((mod) => mod.mount === 'deck')) expect(m.position[1]).toBeCloseTo(top)
    for (const leg of landingLegLayout(assembly.dims.radiusM, assembly.dims.baseY, 'legs')) {
      expect(leg.foot[1]).toBeGreaterThan(0)
      expect(leg.foot[1]).toBeLessThan(0.2)
      expect(Math.hypot(leg.foot[0], leg.foot[2])).toBeGreaterThan(assembly.dims.radiusM)
    }
  })

  it('frames the camera on the spacecraft for every bus size', () => {
    for (const bus of ['bus-small', 'bus-medium', 'bus-heavy']) {
      const assembly = assembleSpacecraft(design(bus), componentCatalog)
      const { position, target } = hangarFraming(assembly)
      const distance = Math.hypot(position[0] - target[0], position[1] - target[1], position[2] - target[2])
      expect(distance).toBeGreaterThan(assembly.dims.radiusM * 4)
      expect(target[1]).toBeGreaterThan(assembly.dims.baseY)
    }
  })
})

describe('selected component information', () => {
  it('describes a module from catalog and design data', () => {
    const entries = design('bus-small', ['bat-liion', 2])
    const battery = assembleSpacecraft(entries, componentCatalog).modules.find((m) => m.componentId === 'bat-liion')!
    const info = describeModule(battery, componentCatalog, entries)
    expect(info.title).toBe('Li-ion Battery Pack')
    expect(info.categoryLabel).toBe('Battery')
    expect(info.unitsInstalled).toBe(2)
    expect(info.stats).toContainEqual({ label: 'Mass', value: '40 kg' })
  })

  it('labels the two parts of a propulsion unit', () => {
    const entries = design('bus-small', 'prp-throttle')
    const modules = assembleSpacecraft(entries, componentCatalog).modules
    const engine = modules.find((m) => m.kind === 'mainEngine')!
    const tanks = modules.find((m) => m.kind === 'propulsionTanks')!
    expect(describeModule(engine, componentCatalog, entries).partLabel).toBe('Main engine')
    expect(describeModule(tanks, componentCatalog, entries).partLabel).toBe('Propulsion module (tanks)')
  })

  it('uses procedural models until a GLB module asset is available', () => {
    // All registry assets are 'planned', and whole-vehicle assets never replace a module.
    for (const c of componentCatalog.components) expect(moduleAssetFor(c.id)).toBeUndefined()
  })
})
