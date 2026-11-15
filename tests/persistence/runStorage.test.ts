import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { clearRun, loadRun, saveRun } from '../../src/services/persistence/runStorage'
import type { StoredRun } from '../../src/services/persistence/runStorage'
import { installMemoryStorage, removeMemoryStorage } from '../helpers/memoryStorage'
import type { MemoryStorage } from '../helpers/memoryStorage'

const run: Omit<StoredRun, 'version' | 'missionId'> = {
  design: { entries: [{ componentId: 'bus-small', quantity: 1 }], launchVehicleId: 'lv-heavy', orbitId: 'orb-phasing', siteId: 'site-a' },
  result: { runStatus: 'completed', outcome: 'success', elapsedDays: 365 },
}

describe('runStorage', () => {
  let storage: MemoryStorage
  beforeEach(() => {
    storage = installMemoryStorage()
  })
  afterEach(removeMemoryStorage)

  it('round-trips a finished run', () => {
    saveRun('lunar-echo', run)
    expect(loadRun('lunar-echo')).toEqual({ version: 1, missionId: 'lunar-echo', ...run })
  })

  it('keeps runs of different missions separate', () => {
    const other = { ...run, result: { runStatus: 'failed', outcome: 'failure', elapsedDays: 20 } } as const
    saveRun('lunar-echo', run)
    saveRun('europa-probe', other)
    expect(loadRun('lunar-echo')?.result).toEqual(run.result)
    expect(loadRun('europa-probe')?.result).toEqual(other.result)
    clearRun('europa-probe')
    expect(loadRun('europa-probe')).toBeUndefined()
    expect(loadRun('lunar-echo')).toBeDefined()
  })

  it('rejects a run saved under a different mission key', () => {
    saveRun('lunar-echo', run)
    storage.setItem('astra.run.other', storage.getItem('astra.run.lunar-echo')!)
    expect(loadRun('other')).toBeUndefined()
  })

  it.each([
    ['not JSON', '{oops'],
    ['wrong version', JSON.stringify({ version: 99, missionId: 'lunar-echo', ...run })],
    ['missing site', JSON.stringify({ version: 1, missionId: 'lunar-echo', ...run, design: { ...run.design, siteId: undefined } })],
    ['bad quantity', JSON.stringify({ version: 1, missionId: 'lunar-echo', ...run, design: { ...run.design, entries: [{ componentId: 'x', quantity: 0 }] } })],
    ['unfinished status', JSON.stringify({ version: 1, missionId: 'lunar-echo', ...run, result: { ...run.result, runStatus: 'running' } })],
    ['unknown outcome', JSON.stringify({ version: 1, missionId: 'lunar-echo', ...run, result: { ...run.result, outcome: 'great' } })],
    ['non-numeric day', JSON.stringify({ version: 1, missionId: 'lunar-echo', ...run, result: { ...run.result, elapsedDays: '365' } })],
    ['null', 'null'],
  ])('ignores malformed data: %s', (_label, raw) => {
    storage.setItem('astra.run.lunar-echo', raw)
    expect(loadRun('lunar-echo')).toBeUndefined()
  })

  it('survives unavailable storage', () => {
    removeMemoryStorage()
    expect(() => saveRun('lunar-echo', run)).not.toThrow()
    expect(loadRun('lunar-echo')).toBeUndefined()
    expect(() => clearRun('lunar-echo')).not.toThrow()
  })
})
