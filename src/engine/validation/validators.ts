import type { ValidationResult, ValidationStatus } from '../../types/validation'
import {
  constructionDays,
  dailyDownlinkGb,
  launchMassKg,
  nightEnergyNeedWh,
  nightLoadW,
  requiredPropellantKg,
  usableStorageWh,
} from './derivedMetrics'
import type { ValidationInput } from './derivedMetrics'
import {
  effectiveHeatRejectionW,
  effectiveLandingSlopeDeg,
  hazardLabels,
  kelvinToCelsius,
  nightThermalBalance,
} from '../environment/thermal'
import { gradeAgainstLimit, gradeAgainstNeed, round } from './grade'

type Validator = (input: ValidationInput) => ValidationResult

/** Picks message and suggestion by status. Suggestion is empty when valid. */
function byStatus(status: ValidationStatus, text: Record<ValidationStatus, [string, string]>) {
  const [message, suggestion] = text[status]
  return { status, message, suggestion }
}

export const validateMass: Validator = (input) => {
  const { launchVehicle, assumptions } = input
  const base = { id: 'mass', label: 'Mass', subsystem: 'bus', assumptions: ['massMarginFraction', 'propellantMarginFraction'] } as const
  if (!launchVehicle) {
    return { ...base, status: 'critical', message: 'No launch vehicle selected.', suggestion: 'Select a launch vehicle.' }
  }
  const massKg = round(launchMassKg(input))
  const capacityKg = launchVehicle.payloadCapacityKg
  const status = gradeAgainstLimit(massKg, capacityKg, assumptions.massMarginFraction)
  return {
    ...base,
    ...byStatus(status, {
      valid: [`Launch mass ${massKg} kg of ${capacityKg} kg capacity, margin above ${assumptions.massMarginFraction * 100}%.`, ''],
      warning: [`Launch mass ${massKg} kg leaves less than ${assumptions.massMarginFraction * 100}% margin on ${capacityKg} kg.`, 'Swap heavy parts for lighter options or keep a mass reserve.'],
      critical: [`Launch mass ${massKg} kg exceeds ${capacityKg} kg capacity by ${round(massKg - capacityKg)} kg.`, 'Remove or lighten components, or choose a larger launch vehicle.'],
    }),
  }
}

export const validateBudget: Validator = ({ mission, summary, launchVehicle, assumptions }) => {
  const totalMUsd = summary.costMUsd + (launchVehicle?.costMUsd ?? 0)
  const status = gradeAgainstLimit(totalMUsd, mission.budgetMUsd, assumptions.budgetReserveFraction)
  return {
    id: 'budget',
    label: 'Budget',
    subsystem: 'mission',
    assumptions: ['budgetReserveFraction'],
    ...byStatus(status, {
      valid: [`Total cost $${totalMUsd}M of $${mission.budgetMUsd}M with reserve intact.`, ''],
      warning: [`Total cost $${totalMUsd}M leaves less than ${assumptions.budgetReserveFraction * 100}% budget reserve.`, 'Pick cheaper components or a lower-cost launcher to rebuild reserve.'],
      critical: [`Total cost $${totalMUsd}M exceeds the $${mission.budgetMUsd}M budget by $${totalMUsd - mission.budgetMUsd}M.`, 'Remove optional components or choose cheaper alternatives.'],
    }),
  }
}

export const validatePowerBalance: Validator = ({ summary, assumptions }) => {
  const base = { id: 'powerBalance', label: 'Power balance', subsystem: 'power', assumptions: ['powerMarginFraction'] } as const
  if (summary.powerGenerationW === 0) {
    return { ...base, status: 'critical', message: 'No power generation installed.', suggestion: 'Add a solar array or radioisotope power system.' }
  }
  const status = gradeAgainstNeed(summary.powerGenerationW, summary.powerDemandW, assumptions.powerMarginFraction)
  return {
    ...base,
    ...byStatus(status, {
      valid: [`Daytime generation ${summary.powerGenerationW} W covers ${summary.powerDemandW} W demand.`, ''],
      warning: [`Generation ${summary.powerGenerationW} W barely covers ${summary.powerDemandW} W demand.`, 'Add generation or replace power-hungry components.'],
      critical: [`Demand ${summary.powerDemandW} W exceeds generation ${summary.powerGenerationW} W.`, 'Add a larger solar array or remove high-demand components.'],
    }),
  }
}

export const validateEnergyStorage: Validator = (input) => {
  const { assumptions } = input
  const needWh = round(nightEnergyNeedWh(input))
  const usableWh = round(usableStorageWh(input))
  const base = {
    id: 'energyStorage',
    label: 'Energy storage',
    subsystem: 'battery',
    assumptions: ['lunarNightHours', 'survivalBusLoadFraction', 'batteryUsableFraction', 'energyMarginFraction'],
  } as const
  if (needWh === 0) {
    return { ...base, status: 'valid', message: `Night load ${round(nightLoadW(input))} W is covered by night-time generation.`, suggestion: '' }
  }
  const status = gradeAgainstNeed(usableWh, needWh, assumptions.energyMarginFraction)
  return {
    ...base,
    ...byStatus(status, {
      valid: [`Usable storage ${usableWh} Wh covers the ${needWh} Wh lunar-night need.`, ''],
      warning: [`Usable storage ${usableWh} Wh only just covers the ${needWh} Wh night need.`, 'Add a battery unit for margin.'],
      critical: [`Usable storage ${usableWh} Wh is short of the ${needWh} Wh needed to survive the lunar night.`, 'Add batteries, use radioisotope heaters instead of electric heaters, or add a night-capable power source.'],
    }),
  }
}

export const validatePropellant: Validator = (input) => {
  const { summary, orbit, assumptions } = input
  const base = { id: 'propellant', label: 'Propellant', subsystem: 'propulsion', assumptions: ['propellantMarginFraction'] } as const
  if ((summary.unitsByCategory.propulsion ?? 0) === 0) {
    return { ...base, status: 'critical', message: 'No propulsion installed.', suggestion: 'Add an engine for orbit insertion and descent.' }
  }
  if (!orbit) {
    return { ...base, status: 'critical', message: 'No transfer orbit selected.', suggestion: 'Select a transfer orbit.' }
  }
  const needKg = round(requiredPropellantKg(input))
  const capacityKg = summary.propellantCapacityKg
  const status = gradeAgainstNeed(capacityKg, needKg, assumptions.propellantMarginFraction)
  return {
    ...base,
    ...byStatus(status, {
      valid: [`Tank capacity ${capacityKg} kg covers ${needKg} kg needed for ${orbit.name}.`, ''],
      warning: [`Tank capacity ${capacityKg} kg leaves under ${assumptions.propellantMarginFraction * 100}% margin over ${needKg} kg needed.`, 'Add propellant capacity or reduce dry mass.'],
      critical: [`Tank capacity ${capacityKg} kg is short of ${needKg} kg needed for ${orbit.name}.`, 'Add a second engine/tank, reduce dry mass, or pick a lower-propellant transfer.'],
    }),
  }
}

export const validateLaunchVehicle: Validator = ({ launchVehicle, orbit }) => {
  const base = { id: 'launchVehicle', label: 'Launch vehicle compatibility', subsystem: 'launchVehicle', assumptions: [] } as const
  if (!launchVehicle) {
    return { ...base, status: 'critical', message: 'No launch vehicle selected.', suggestion: 'Select a launch vehicle.' }
  }
  if (orbit && !launchVehicle.compatibleOrbitIds.includes(orbit.id)) {
    return {
      ...base,
      status: 'critical',
      message: `${launchVehicle.name} cannot fly the ${orbit.name} profile.`,
      suggestion: 'Choose a compatible launch vehicle or a different transfer orbit.',
    }
  }
  return { ...base, status: 'valid', message: `${launchVehicle.name} supports the selected transfer.`, suggestion: '' }
}

export const validateOrbit: Validator = ({ mission, orbit, assumptions }) => {
  const base = { id: 'orbit', label: 'Orbit compatibility', subsystem: 'trajectory', assumptions: ['maxTransferFraction'] } as const
  if (!orbit) {
    return { ...base, status: 'critical', message: 'No transfer orbit selected.', suggestion: 'Select a transfer orbit.' }
  }
  if (!orbit.compatibleMissionIds.includes(mission.id)) {
    return { ...base, status: 'critical', message: `${orbit.name} does not reach ${mission.destination}.`, suggestion: 'Select a transfer that serves this destination.' }
  }
  const maxDays = mission.durationDays * assumptions.maxTransferFraction
  if (orbit.transferDays > maxDays) {
    return {
      ...base,
      status: 'warning',
      message: `${orbit.transferDays}-day transfer exceeds ${round(maxDays)} days (${assumptions.maxTransferFraction * 100}% of mission).`,
      suggestion: 'Use a faster transfer if propellant and budget allow.',
    }
  }
  return { ...base, status: 'valid', message: `${orbit.name} (${orbit.transferDays} days) fits the mission.`, suggestion: '' }
}

export const validateCommunication: Validator = (input) => {
  const { summary, assumptions } = input
  const base = { id: 'communication', label: 'Communication capability', subsystem: 'communication', assumptions: ['relayContactHoursPerDay', 'commsMarginFraction'] } as const
  if (summary.dataRateMbps === 0) {
    return { ...base, status: 'critical', message: 'No relay link installed; the far side has no direct line to Earth.', suggestion: 'Add a relay communication system.' }
  }
  if (summary.dataGenerationGbPerDay === 0) {
    return { ...base, status: 'warning', message: 'No science payload is generating data to return.', suggestion: 'Add a scientific payload.' }
  }
  const downlinkGb = round(dailyDownlinkGb(input))
  const generatedGb = summary.dataGenerationGbPerDay
  const status = gradeAgainstNeed(downlinkGb, generatedGb, assumptions.commsMarginFraction)
  return {
    ...base,
    ...byStatus(status, {
      valid: [`Downlink ${downlinkGb} Gb/day handles ${generatedGb} Gb/day of science data.`, ''],
      warning: [`Downlink ${downlinkGb} Gb/day barely handles ${generatedGb} Gb/day.`, 'Upgrade to a higher-rate link for margin.'],
      critical: [`Downlink ${downlinkGb} Gb/day cannot keep up with ${generatedGb} Gb/day; data will be lost.`, 'Use a higher-rate link (X-band or optical) or reduce payload data.'],
    }),
  }
}

export const validateDataStorage: Validator = ({ summary, assumptions }) => {
  const base = { id: 'dataStorage', label: 'Data storage capacity', subsystem: 'bus', assumptions: ['relayOutageDays'] } as const
  const needGb = summary.dataGenerationGbPerDay * assumptions.relayOutageDays
  if (summary.dataStorageGb === 0) {
    return { ...base, status: 'critical', message: 'No onboard data storage installed.', suggestion: 'Add a spacecraft bus with a data recorder.' }
  }
  if (needGb === 0) {
    return { ...base, status: 'valid', message: `${summary.dataStorageGb} Gb storage available; no science data yet.`, suggestion: '' }
  }
  // Valid: buffers the full outage. Warning: at least one day. Critical: less than a day.
  const oneDayGb = summary.dataGenerationGbPerDay
  const status: ValidationStatus =
    summary.dataStorageGb >= needGb ? 'valid' : summary.dataStorageGb >= oneDayGb ? 'warning' : 'critical'
  return {
    ...base,
    ...byStatus(status, {
      valid: [`${summary.dataStorageGb} Gb buffers ${assumptions.relayOutageDays} days of data (${needGb} Gb).`, ''],
      warning: [`${summary.dataStorageGb} Gb buffers under ${assumptions.relayOutageDays} days of data (${needGb} Gb needed).`, 'Choose a bus with a larger data recorder.'],
      critical: [`${summary.dataStorageGb} Gb cannot hold one day of data (${oneDayGb} Gb).`, 'Choose a bus with a larger recorder or reduce payload data.'],
    }),
  }
}

export const validateMissionDuration: Validator = (input) => {
  const { mission, orbit, assumptions } = input
  const base = { id: 'missionDuration', label: 'Mission duration feasibility', subsystem: 'robotics', assumptions: ['constructionWorkDays', 'scheduleMarginFraction'] } as const
  const buildDays = constructionDays(input)
  if (!Number.isFinite(buildDays)) {
    return { ...base, status: 'critical', message: 'No robotic units to deploy the observatory.', suggestion: 'Add robotic construction units.' }
  }
  const transferDays = orbit?.transferDays ?? 0
  const timelineDays = transferDays + buildDays + mission.requiredOperationDays
  const status = gradeAgainstLimit(timelineDays, mission.durationDays, assumptions.scheduleMarginFraction)
  const breakdown = `${transferDays} transfer + ${buildDays} construction + ${mission.requiredOperationDays} operations`
  return {
    ...base,
    ...byStatus(status, {
      valid: [`Timeline ${timelineDays} of ${mission.durationDays} days (${breakdown}).`, ''],
      warning: [`Timeline ${timelineDays} of ${mission.durationDays} days leaves little schedule margin (${breakdown}).`, 'Add a robotic unit or choose a faster transfer.'],
      critical: [`Timeline ${timelineDays} days exceeds the ${mission.durationDays}-day mission (${breakdown}).`, 'Add robotic units to build faster or choose a faster transfer.'],
    }),
  }
}

export const validateLandingSite: Validator = (input) => {
  const { mission, site, summary, assumptions } = input
  const base = {
    id: 'landingSite',
    label: 'Landing site',
    subsystem: 'landing',
    assumptions: ['landingSlopeMarginFraction', 'hazardAvoidanceSlopeReduction'],
  } as const
  if (!site) {
    return { ...base, status: 'critical', message: 'No landing site selected.', suggestion: 'Select a landing site.' }
  }
  if (mission.site.requiresRadioQuiet && !site.radioQuiet) {
    return {
      ...base,
      status: 'critical',
      message: `${site.name} faces Earth; terrestrial radio noise would drown out the observatory.`,
      suggestion: 'Choose a far-side site shielded from Earth.',
    }
  }
  const toleranceDeg = summary.maxLandingSlopeDeg
  if (toleranceDeg === 0) {
    return { ...base, status: 'critical', message: 'No landing gear installed.', suggestion: 'Add landing legs or pads.' }
  }
  const slopeDeg = round(effectiveLandingSlopeDeg(site, summary, assumptions), 1)
  const hdaNote = summary.hazardAvoidance ? ' after hazard avoidance' : ''
  const slopeStatus = gradeAgainstLimit(slopeDeg, toleranceDeg, assumptions.landingSlopeMarginFraction)
  const hazard = site.hazardLevel.value
  const hazardOnly = slopeStatus === 'valid' && hazard === 'high' && !summary.hazardAvoidance
  const status = hazardOnly ? 'warning' : slopeStatus
  return {
    ...base,
    ...byStatus(status, {
      valid: [`Slope ${slopeDeg}°${hdaNote} is within the ${toleranceDeg}° gear tolerance. ${hazardLabels[hazard]} hazard.`, ''],
      warning: [
        hazardOnly
          ? `High boulder hazard at ${site.name} with no hazard avoidance.`
          : `Slope ${slopeDeg}°${hdaNote} is close to the ${toleranceDeg}° gear tolerance.`,
        'Add hazard detection and avoidance or more tolerant landing gear.',
      ],
      critical: [
        `Slope ${slopeDeg}°${hdaNote} exceeds the ${toleranceDeg}° gear tolerance.`,
        'Add hazard detection and avoidance, use legged gear, or pick a smoother site.',
      ],
    }),
  }
}

export const validateThermalEnvironment: Validator = (input) => {
  const { thermal, summary, assumptions } = input
  const base = {
    id: 'thermalEnvironment',
    label: 'Thermal environment',
    subsystem: 'thermal',
    assumptions: [
      'electronicsSurvivalTempK',
      'thermalLossWPerK',
      'thermalMarginFraction',
      'baseHeatRejectionW',
      'radiatorReferenceTempK',
      'radiatorDeratingPerK',
      'minRadiatorFactor',
    ],
  } as const
  if (!thermal) {
    return { ...base, status: 'critical', message: 'No site thermal environment available.', suggestion: 'Select a landing site.' }
  }
  const margin = assumptions.thermalMarginFraction
  // Graded on unrounded values so the simulation's night-survival rule agrees exactly.
  const balance = nightThermalBalance(summary, thermal, assumptions, nightLoadW(input))
  const nightStatus = gradeAgainstNeed(balance.supplyW, balance.needW, margin)
  const needW = round(balance.needW)
  const supplyW = round(balance.supplyW)
  const payloadHeatW = summary.powerDemandByCategoryW.payload ?? 0
  const rejectionW = round(effectiveHeatRejectionW(summary.heatRejectionW, thermal, assumptions))
  const dayStatus = payloadHeatW === 0 ? 'valid' : gradeAgainstNeed(rejectionW, payloadHeatW, margin)

  const nightC = kelvinToCelsius(thermal.nightMinK.value)
  const dayC = kelvinToCelsius(thermal.dayMaxK.value)
  const nightText = `Night ${thermal.nightMinK.value} K (${nightC} °C): heat ${supplyW} W vs ${needW} W needed.`
  const dayText = `Day ${thermal.dayMaxK.value} K (${dayC} °C): rejection ${rejectionW} W vs ${payloadHeatW} W payload heat.`
  const rank = { valid: 0, warning: 1, critical: 2 } as const
  const worst = rank[nightStatus] >= rank[dayStatus] ? 'night' : 'day'
  const status = worst === 'night' ? nightStatus : dayStatus
  if (status === 'valid') {
    return { ...base, status, message: `${nightText} ${dayText}`, suggestion: '' }
  }
  return {
    ...base,
    status,
    message: worst === 'night' ? nightText : dayText,
    suggestion:
      worst === 'night'
        ? nightStatus === 'critical'
          ? 'Electronics would freeze on the first lunar night and the lander would be lost. Add insulation, radioisotope heater units, or electric heaters (with battery to match).'
          : 'Add insulation, radioisotope heater units, or electric heaters (with battery to match).'
        : 'Add radiator panels; hot sites derate heat rejection.',
  }
}

export const validators: Validator[] = [
  validateMass,
  validateBudget,
  validatePowerBalance,
  validateEnergyStorage,
  validatePropellant,
  validateLaunchVehicle,
  validateOrbit,
  validateCommunication,
  validateDataStorage,
  validateMissionDuration,
  validateLandingSite,
  validateThermalEnvironment,
]

/** Runs every engineering check. Deterministic: same input, same output. */
export function validateDesign(input: ValidationInput): ValidationResult[] {
  return validators.map((validate) => validate(input))
}
