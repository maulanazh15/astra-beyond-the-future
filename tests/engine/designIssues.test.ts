import { describe, expect, it } from 'vitest'
import { componentCatalog } from '../../src/data'
import { findDesignIssues, repairDesign } from '../../src/engine/design/designEntries'
import type { ComponentCatalog } from '../../src/types/component'

describe('saved design compatibility', () => {
  it('reports no issues for a design within limits', () => {
    const entries = [{ componentId: 'bus-small', quantity: 1 }, { componentId: 'thm-passive', quantity: 3 }]
    expect(findDesignIssues(entries, componentCatalog)).toEqual([])
    expect(repairDesign(entries, componentCatalog)).toBe(entries)
  })

  it('flags categories above their unit limit with the offending entries', () => {
    const entries = [
      { componentId: 'thm-passive', quantity: 2 },
      { componentId: 'bus-small', quantity: 1 },
      { componentId: 'thm-radiator', quantity: 2 },
    ]
    expect(findDesignIssues(entries, componentCatalog)).toEqual([
      {
        kind: 'categoryOverLimit',
        category: 'thermal',
        unitCount: 4,
        maxUnits: 3,
        entries: [{ componentId: 'thm-passive', quantity: 2 }, { componentId: 'thm-radiator', quantity: 2 }],
      },
    ])
  })

  it('flags a limit that was lowered after the design was saved', () => {
    const lowered: ComponentCatalog = {
      ...componentCatalog,
      categories: componentCatalog.categories.map((c) => (c.id === 'robotics' ? { ...c, maxUnits: 1 } : c)),
    }
    const entries = [{ componentId: 'rob-winch', quantity: 2 }]
    expect(findDesignIssues(entries, lowered)).toMatchObject([{ kind: 'categoryOverLimit', category: 'robotics', unitCount: 2, maxUnits: 1 }])
    expect(repairDesign(entries, lowered)).toEqual([{ componentId: 'rob-winch', quantity: 1 }])
  })

  it('flags components that no longer exist', () => {
    expect(findDesignIssues([{ componentId: 'retired-part', quantity: 2 }], componentCatalog)).toEqual([
      { kind: 'unknownComponent', componentId: 'retired-part', quantity: 2 },
    ])
  })

  it('repairs by dropping unknown parts and the most recently added extra units', () => {
    const entries = [
      { componentId: 'thm-passive', quantity: 2 },
      { componentId: 'retired-part', quantity: 1 },
      { componentId: 'bus-small', quantity: 1 },
      { componentId: 'thm-radiator', quantity: 3 },
    ]
    const repaired = repairDesign(entries, componentCatalog)
    expect(repaired).toEqual([
      { componentId: 'thm-passive', quantity: 2 },
      { componentId: 'bus-small', quantity: 1 },
      { componentId: 'thm-radiator', quantity: 1 },
    ])
    expect(findDesignIssues(repaired, componentCatalog)).toEqual([])
  })

  it('removes a whole entry when its category overflows by more than its quantity', () => {
    const entries = [
      { componentId: 'bus-small', quantity: 1 },
      { componentId: 'bus-medium', quantity: 1 },
      { componentId: 'bus-heavy', quantity: 1 },
    ]
    expect(repairDesign(entries, componentCatalog)).toEqual([{ componentId: 'bus-small', quantity: 1 }])
  })
})
