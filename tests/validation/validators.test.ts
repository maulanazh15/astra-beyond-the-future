import { describe, expect, it } from 'vitest'
import { componentCatalog, gameplayAssumptions, getMission, launchVehicles, orbitProfiles } from '../../src/data'
import { summarizeDesign } from '../../src/engine/resources/summarizeDesign'
import type { ValidationInput } from '../../src/engine/validation/derivedMetrics'
import {
  validateBudget,
  validateCommunication,
  validateDataStorage,
  validateDesign,
  validateEnergyStorage,
  validateLaunchVehicle,
  validateMass,
  validateMissionDuration,
  validateOrbit,
  validatePowerBalance,
  validatePropellant,
} from '../../src/engine/validation/validators'
import type { DesignSummary } from '../../src/types/component'
import type { LaunchVehicle, Mission, OrbitProfile } from '../../src/types/mission'
import type { GameplayAssumptions } from '../../src/types/validation'

const assumptions: GameplayAssumptions = {
  massMarginFraction: 0.1,
  budgetReserveFraction: 0.1,
  powerMarginFraction: 0.1,
  lunarNightHours: 100,
  survivalBusLoadFraction: 0.5,
  batteryUsableFraction: 0.8,
  energyMarginFraction: 0.1,
  propellantMarginFraction: 0.1,
  relayContactHoursPerDay: 8,
  commsMarginFraction: 0.2,
  relayOutageDays: 2,
  constructionWorkDays: 60,
  maxTransferFraction: 0.1,
  scheduleMarginFraction: 0.1,
}

const mission = { id: 'm1', destination: 'Moon', budgetMUsd: 100, durationDays: 300, requiredOperationDays: 180 } as Mission
const vehicle: LaunchVehicle = { id: 'lv', name: 'LV', payloadCapacityKg: 1000, costMUsd: 0, reliability: 1, compatibleOrbitIds: ['o1'] }
const orbit: OrbitProfile = { id: 'o1', name: 'Orbit', transferDays: 20, propellantKgPerTonneDry: 0, compatibleMissionIds: ['m1'], description: '' }

function summary(overrides: Partial<DesignSummary> = {}): DesignSummary {
  return {
    unitCount: 1,
    massKg: 0,
    costMUsd: 0,
    powerGenerationW: 0,
    powerDemandW: 0,
    netPowerW: 0,
    energyStorageWh: 0,
    propellantCapacityKg: 0,
    dataRateMbps: 0,
    dataStorageGb: 0,
    dataGenerationGbPerDay: 0,
    nightGenerationW: 0,
    powerDemandByCategoryW: {},
    reliability: 1,
    unitsByCategory: {},
    ...overrides,
  }
}

function input(s: Partial<DesignSummary>, extra: Partial<ValidationInput> = {}): ValidationInput {
  return { mission, summary: summary(s), launchVehicle: vehicle, orbit, assumptions, ...extra }
}

describe('validateMass', () => {
  it('grades launch mass against capacity with margin', () => {
    expect(validateMass(input({ massKg: 800 })).status).toBe('valid')
    expect(validateMass(input({ massKg: 950 })).status).toBe('warning')
    expect(validateMass(input({ massKg: 1100 })).status).toBe('critical')
  })

  it('includes loaded propellant in launch mass', () => {
    const thirsty = { ...orbit, propellantKgPerTonneDry: 1000 }
    const result = validateMass(input({ massKg: 600, propellantCapacityKg: 600 }, { orbit: thirsty }))
    expect(result.status).toBe('critical')
    expect(result.message).toContain('1200 kg')
  })

  it('is critical without a launch vehicle', () => {
    expect(validateMass(input({}, { launchVehicle: undefined })).status).toBe('critical')
  })
})

describe('validateBudget', () => {
  it('counts launch cost and keeps a reserve', () => {
    expect(validateBudget(input({ costMUsd: 80 })).status).toBe('valid')
    expect(validateBudget(input({ costMUsd: 80 }, { launchVehicle: { ...vehicle, costMUsd: 15 } })).status).toBe('warning')
    expect(validateBudget(input({ costMUsd: 101 })).status).toBe('critical')
  })
})

describe('validatePowerBalance', () => {
  it('requires generation above demand with margin', () => {
    expect(validatePowerBalance(input({ powerGenerationW: 1100, powerDemandW: 1000 })).status).toBe('valid')
    expect(validatePowerBalance(input({ powerGenerationW: 1050, powerDemandW: 1000 })).status).toBe('warning')
    expect(validatePowerBalance(input({ powerGenerationW: 900, powerDemandW: 1000 })).status).toBe('critical')
    expect(validatePowerBalance(input({})).status).toBe('critical')
  })
})

describe('validateEnergyStorage', () => {
  // Night load = 40 W bus × 0.5 + 30 W thermal = 50 W → 5,000 Wh over 100 h.
  const loads = { powerDemandByCategoryW: { bus: 40, thermal: 30 } }

  it('compares usable storage to night energy need', () => {
    expect(validateEnergyStorage(input({ ...loads, energyStorageWh: 7000 })).status).toBe('valid') // 5600 usable
    expect(validateEnergyStorage(input({ ...loads, energyStorageWh: 6500 })).status).toBe('warning') // 5200 usable
    expect(validateEnergyStorage(input({ ...loads, energyStorageWh: 5000 })).status).toBe('critical') // 4000 usable
  })

  it('is valid when night generation covers the night load', () => {
    expect(validateEnergyStorage(input({ ...loads, nightGenerationW: 60 })).status).toBe('valid')
  })
})

describe('validatePropellant', () => {
  const thirsty = { ...orbit, propellantKgPerTonneDry: 1000 }
  const withEngine = { massKg: 1000, unitsByCategory: { propulsion: 1 } }

  it('compares tank capacity to transfer need', () => {
    expect(validatePropellant(input({ ...withEngine, propellantCapacityKg: 1100 }, { orbit: thirsty })).status).toBe('valid')
    expect(validatePropellant(input({ ...withEngine, propellantCapacityKg: 1000 }, { orbit: thirsty })).status).toBe('warning')
    expect(validatePropellant(input({ ...withEngine, propellantCapacityKg: 900 }, { orbit: thirsty })).status).toBe('critical')
  })

  it('is critical without propulsion', () => {
    expect(validatePropellant(input({ massKg: 1000 })).subsystem).toBe('propulsion')
    expect(validatePropellant(input({ massKg: 1000 })).status).toBe('critical')
  })
})

describe('validateLaunchVehicle', () => {
  it('checks the vehicle supports the selected orbit', () => {
    expect(validateLaunchVehicle(input({})).status).toBe('valid')
    expect(validateLaunchVehicle(input({}, { launchVehicle: { ...vehicle, compatibleOrbitIds: [] } })).status).toBe('critical')
  })
})

describe('validateOrbit', () => {
  it('checks mission compatibility and transfer length', () => {
    expect(validateOrbit(input({})).status).toBe('valid')
    expect(validateOrbit(input({}, { orbit: { ...orbit, transferDays: 40 } })).status).toBe('warning')
    expect(validateOrbit(input({}, { orbit: { ...orbit, compatibleMissionIds: [] } })).status).toBe('critical')
  })
})

describe('validateCommunication', () => {
  // 10 Mbps × 8 h × 3600 s ÷ 1000 = 288 Gb/day.
  it('compares daily downlink with daily data generation', () => {
    expect(validateCommunication(input({ dataRateMbps: 10, dataGenerationGbPerDay: 200 })).status).toBe('valid')
    expect(validateCommunication(input({ dataRateMbps: 10, dataGenerationGbPerDay: 260 })).status).toBe('warning')
    expect(validateCommunication(input({ dataRateMbps: 10, dataGenerationGbPerDay: 300 })).status).toBe('critical')
    expect(validateCommunication(input({ dataGenerationGbPerDay: 100 })).status).toBe('critical')
  })
})

describe('validateDataStorage', () => {
  it('requires storage to buffer the relay outage', () => {
    expect(validateDataStorage(input({ dataStorageGb: 400, dataGenerationGbPerDay: 200 })).status).toBe('valid')
    expect(validateDataStorage(input({ dataStorageGb: 300, dataGenerationGbPerDay: 200 })).status).toBe('warning')
    expect(validateDataStorage(input({ dataStorageGb: 100, dataGenerationGbPerDay: 200 })).status).toBe('critical')
    expect(validateDataStorage(input({ dataGenerationGbPerDay: 200 })).status).toBe('critical')
  })
})

describe('validateMissionDuration', () => {
  // 20 transfer + 60/robots construction + 180 operations vs 300 days (270 with margin).
  it('fits transfer, construction, and operations into the mission', () => {
    expect(validateMissionDuration(input({ unitsByCategory: { robotics: 2 } })).status).toBe('valid') // 230
    expect(validateMissionDuration(input({ unitsByCategory: { robotics: 1 } }, { orbit: { ...orbit, transferDays: 40 } })).status).toBe('warning') // 280
    expect(validateMissionDuration(input({ unitsByCategory: { robotics: 1 } }, { orbit: { ...orbit, transferDays: 70 } })).status).toBe('critical') // 310
    expect(validateMissionDuration(input({})).status).toBe('critical')
  })
})

describe('validateDesign', () => {
  it('returns all ten checks with the required fields', () => {
    const results = validateDesign(input({}))
    expect(results).toHaveLength(10)
    for (const r of results) {
      expect(['valid', 'warning', 'critical']).toContain(r.status)
      expect(r.message).not.toBe('')
      expect(r.subsystem).toBeTruthy()
      if (r.status !== 'valid') expect(r.suggestion).not.toBe('')
    }
  })

  it('is deterministic', () => {
    const i = input({ massKg: 900, costMUsd: 95, dataRateMbps: 10, dataGenerationGbPerDay: 250 })
    expect(validateDesign(i)).toEqual(validateDesign(i))
  })

  it('passes a balanced LUNAR ECHO design built from the real data files', () => {
    const lunarEcho = getMission('lunar-echo')!
    const entries = [
      'bus-small', 'prp-throttle', 'pwr-solar-std', 'bat-rfc', 'com-xband',
      'pay-dipole', 'lnd-legs', 'thm-passive', 'rob-winch',
    ].map((componentId) => ({ componentId, quantity: 1 }))
    const results = validateDesign({
      mission: lunarEcho,
      summary: summarizeDesign(entries, componentCatalog),
      launchVehicle: launchVehicles.find((lv) => lv.id === 'lv-heavy'),
      orbit: orbitProfiles.find((o) => o.id === 'orb-phasing'),
      assumptions: gameplayAssumptions,
    })
    const notValid = results.filter((r) => r.status !== 'valid').map((r) => `${r.id}: ${r.message}`)
    expect(notValid).toEqual([])
  })
})
