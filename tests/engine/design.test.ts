import { describe, expect, it } from 'vitest'
import {
  addComponent,
  canAddComponent,
  removeAllOf,
  removeComponent,
} from '../../src/engine/design/designEntries'
import { summarizeDesign } from '../../src/engine/resources/summarizeDesign'
import { checkRequirements } from '../../src/engine/validation/checkRequirements'
import type { ComponentCatalog, SpacecraftComponent } from '../../src/types/component'
import type { LunarSite } from '../../src/types/environment'
import type { Mission } from '../../src/types/mission'

const part = (overrides: Partial<SpacecraftComponent> & Pick<SpacecraftComponent, 'id' | 'category'>): SpacecraftComponent => ({
  name: overrides.id,
  massKg: 10,
  costMUsd: 5,
  powerDemandW: 0,
  powerGenerationW: 0,
  reliability: 1,
  description: '',
  ...overrides,
})

const catalog: ComponentCatalog = {
  categories: [
    { id: 'bus', label: 'Bus', description: '', maxUnits: 1 },
    { id: 'battery', label: 'Battery', description: '', maxUnits: 2 },
    { id: 'power', label: 'Power', description: '', maxUnits: 2 },
  ],
  components: [
    part({ id: 'bus-a', category: 'bus', massKg: 300, costMUsd: 60, powerDemandW: 40, reliability: 0.9 }),
    part({ id: 'bus-b', category: 'bus' }),
    part({ id: 'bat', category: 'battery', massKg: 40, costMUsd: 10, energyStorageWh: 4000, reliability: 0.9 }),
    part({ id: 'sol', category: 'power', massKg: 45, costMUsd: 18, powerGenerationW: 900 }),
  ],
}

describe('design entries', () => {
  it('adds new components and stacks repeated adds', () => {
    let entries = addComponent([], 'bat', catalog)
    entries = addComponent(entries, 'bat', catalog)
    expect(entries).toEqual([{ componentId: 'bat', quantity: 2 }])
  })

  it('enforces the category unit limit across different components', () => {
    const entries = addComponent([], 'bus-a', catalog)
    expect(canAddComponent(entries, 'bus-b', catalog)).toBe(false)
    expect(addComponent(entries, 'bus-b', catalog)).toBe(entries)
  })

  it('rejects unknown components', () => {
    expect(addComponent([], 'nope', catalog)).toEqual([])
  })

  it('removes one unit at a time and drops empty entries', () => {
    const two = [{ componentId: 'bat', quantity: 2 }]
    expect(removeComponent(two, 'bat')).toEqual([{ componentId: 'bat', quantity: 1 }])
    expect(removeComponent(removeComponent(two, 'bat'), 'bat')).toEqual([])
    expect(removeAllOf(two, 'bat')).toEqual([])
  })

  it('does not mutate input', () => {
    const entries = [{ componentId: 'bat', quantity: 1 }]
    addComponent(entries, 'bat', catalog)
    removeComponent(entries, 'bat')
    expect(entries).toEqual([{ componentId: 'bat', quantity: 1 }])
  })
})

describe('summarizeDesign', () => {
  it('totals mass, cost, power, storage, and reliability with quantities', () => {
    const summary = summarizeDesign(
      [
        { componentId: 'bus-a', quantity: 1 },
        { componentId: 'bat', quantity: 2 },
        { componentId: 'sol', quantity: 1 },
      ],
      catalog,
    )
    expect(summary.massKg).toBe(300 + 80 + 45)
    expect(summary.costMUsd).toBe(60 + 20 + 18)
    expect(summary.netPowerW).toBe(900 - 40)
    expect(summary.energyStorageWh).toBe(8000)
    expect(summary.reliability).toBeCloseTo(0.9 * 0.9 * 0.9)
    expect(summary.unitsByCategory).toEqual({ bus: 1, battery: 2, power: 1 })
  })

  it('returns zeros for an empty design', () => {
    const summary = summarizeDesign([], catalog)
    expect(summary.unitCount).toBe(0)
    expect(summary.reliability).toBe(0)
  })
})

describe('checkRequirements', () => {
  const mission = {
    budgetMUsd: 100,
    requirements: [
      { id: 'b', kind: 'withinBudget', label: '' },
      { id: 'm', kind: 'withinLaunchCapacity', label: '' },
      { id: 'e', kind: 'minEnergyStorageWh', label: '', target: 8000 },
      { id: 'c', kind: 'requiredCategories', label: '', categories: ['bus', 'power'] },
      { id: 'r', kind: 'radioQuietSite', label: '' },
    ],
  } as Mission
  const vehicle = { id: 'lv', name: 'LV', payloadCapacityKg: 350, costMUsd: 10, reliability: 1 }

  it('reports each requirement as met or not', () => {
    const summary = summarizeDesign(
      [
        { componentId: 'bus-a', quantity: 1 },
        { componentId: 'bat', quantity: 2 },
      ],
      catalog,
    )
    const met = Object.fromEntries(
      checkRequirements(mission, summary, vehicle).map((s) => [s.requirement.id, s.met]),
    )
    expect(met).toEqual({ b: true, m: false, e: true, c: false, r: false })
  })

  it('requires a radio-quiet site', () => {
    const summary = summarizeDesign([], catalog)
    const quiet = { radioQuiet: true, name: 'Far' } as LunarSite
    const status = (site?: LunarSite) => checkRequirements(mission, summary, vehicle, { site }).find((s) => s.requirement.id === 'r')?.met
    expect(status(quiet)).toBe(true)
    expect(status({ ...quiet, radioQuiet: false })).toBe(false)
    expect(status(undefined)).toBe(false)
  })

  it('counts loaded propellant toward launch capacity when given', () => {
    const summary = summarizeDesign([{ componentId: 'bus-a', quantity: 1 }], catalog)
    const fits = (launchMassKg?: number) => checkRequirements(mission, summary, vehicle, { launchMassKg }).find((s) => s.requirement.id === 'm')?.met
    expect(fits(undefined)).toBe(summary.massKg <= 350)
    expect(fits(351)).toBe(false)
  })
})
