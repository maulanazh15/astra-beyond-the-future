import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { loadDesign, saveDesign } from '../../src/services/persistence/designStorage'

class MemoryStorage {
  private data = new Map<string, string>()
  getItem(key: string) {
    return this.data.get(key) ?? null
  }
  setItem(key: string, value: string) {
    this.data.set(key, value)
  }
}

describe('designStorage', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true })
  })
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'localStorage')
  })

  it('round-trips a design per mission', () => {
    const design = { entries: [{ componentId: 'bus-small', quantity: 1 }], launchVehicleId: 'lv-heavy', orbitId: 'orb-phasing' }
    saveDesign('lunar-echo', design)
    expect(loadDesign('lunar-echo')).toEqual({ version: 1, ...design })
    expect(loadDesign('other')).toBeUndefined()
  })

  it('keeps the selected site and still loads saves made before sites existed', () => {
    saveDesign('lunar-echo', { entries: [], launchVehicleId: 'a', orbitId: 'b', siteId: 'site-x' })
    expect(loadDesign('lunar-echo')?.siteId).toBe('site-x')
    localStorage.setItem('astra.design.lunar-echo', JSON.stringify({ version: 1, entries: [], launchVehicleId: 'a', orbitId: 'b' }))
    expect(loadDesign('lunar-echo')).toEqual({ version: 1, entries: [], launchVehicleId: 'a', orbitId: 'b' })
    localStorage.setItem('astra.design.lunar-echo', JSON.stringify({ version: 1, entries: [], launchVehicleId: 'a', orbitId: 'b', siteId: 7 }))
    expect(loadDesign('lunar-echo')).toBeUndefined()
  })

  it('rejects corrupt or outdated data', () => {
    localStorage.setItem('astra.design.lunar-echo', '{not json')
    expect(loadDesign('lunar-echo')).toBeUndefined()
    localStorage.setItem('astra.design.lunar-echo', JSON.stringify({ version: 0, entries: [] }))
    expect(loadDesign('lunar-echo')).toBeUndefined()
    localStorage.setItem('astra.design.lunar-echo', JSON.stringify({ version: 1, entries: [{ componentId: 1 }], launchVehicleId: 'a', orbitId: 'b' }))
    expect(loadDesign('lunar-echo')).toBeUndefined()
  })

  it('degrades gracefully without storage', () => {
    Reflect.deleteProperty(globalThis, 'localStorage')
    expect(loadDesign('lunar-echo')).toBeUndefined()
    expect(() => saveDesign('lunar-echo', { entries: [], launchVehicleId: 'a', orbitId: 'b' })).not.toThrow()
  })
})
