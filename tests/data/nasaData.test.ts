import { describe, expect, it } from 'vitest'
import { getSite, getSource, getThermalProfile, lcrtReference, lunarSites, missions, nasaSources, thermalProfiles } from '../../src/data'
import type { SourcedValue } from '../../src/types/nasaSource'

const sitesValues = [
  ...lunarSites.flatMap((s) => [s.landingSlopeDeg, s.hazardLevel, ...(s.craterDiameterKm ? [s.craterDiameterKm] : [])]),
  lcrtReference.reflectorDiameterM,
  lcrtReference.craterDiameterKm,
]
const thermalValues = thermalProfiles.flatMap((p) => [p.dayMaxK, p.nightMinK])
const allValues: SourcedValue<unknown>[] = [...sitesValues, ...thermalValues]

describe('NASA source metadata', () => {
  it('has unique ids, https links, and ISO access dates', () => {
    const ids = nasaSources.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const source of nasaSources) {
      expect(source.url).toMatch(/^https:\/\//)
      expect(source.accessedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(source.extracted).not.toBe('')
    }
  })

  it('resolves every referenced source id', () => {
    const referenced = [...allValues.flatMap((v) => v.sourceIds), ...missions.flatMap((m) => m.sourceIds)]
    for (const id of referenced) expect(getSource(id), id).toBeDefined()
  })
})

describe('dataset provenance', () => {
  it('documents units and processing for every value', () => {
    for (const v of allValues) {
      expect(v.unit).not.toBe('')
      expect(v.processing).not.toBe('')
    }
  })

  it('only labels values source-derived when a value-checked source backs them', () => {
    for (const v of allValues.filter((x) => x.provenance !== 'placeholder')) {
      expect(v.sourceIds.some((id) => getSource(id)?.verification === 'verified'), v.processing).toBe(true)
    }
  })

  it('keeps unsampled LOLA terrain values marked as placeholders', () => {
    for (const site of lunarSites) {
      expect(site.landingSlopeDeg.provenance).toBe('placeholder')
      expect(site.hazardLevel.provenance).toBe('placeholder')
    }
  })

  it('uses the published Diviner equatorial range', () => {
    const eq = thermalProfiles.find((p) => p.id === 'thermal-equatorial')!
    expect(eq.dayMaxK.value).toBeGreaterThanOrEqual(387)
    expect(eq.dayMaxK.value).toBeLessThanOrEqual(397)
    expect(eq.nightMinK.value).toBe(95)
  })
})

describe('site links', () => {
  it('resolves thermal profiles and mission default sites', () => {
    for (const site of lunarSites) expect(getThermalProfile(site), site.id).toBeDefined()
    for (const mission of missions) expect(getSite(mission.site.defaultSiteId)?.radioQuiet).toBe(true)
  })
})
