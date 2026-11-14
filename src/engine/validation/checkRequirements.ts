import type { DesignSummary } from '../../types/component'
import type { LaunchVehicle, Mission, MissionRequirement } from '../../types/mission'

export type RequirementStatus = {
  requirement: MissionRequirement
  met: boolean
  detail: string
}

/** Live design-time check of a mission's requirements. Not a simulation. */
export function checkRequirements(
  mission: Mission,
  summary: DesignSummary,
  launchVehicle: LaunchVehicle | undefined,
): RequirementStatus[] {
  const totalCost = summary.costMUsd + (launchVehicle?.costMUsd ?? 0)

  return mission.requirements.map((requirement): RequirementStatus => {
    switch (requirement.kind) {
      case 'withinBudget':
        return {
          requirement,
          met: totalCost <= mission.budgetMUsd,
          detail: `$${totalCost}M of $${mission.budgetMUsd}M`,
        }
      case 'withinLaunchCapacity':
        return {
          requirement,
          met: launchVehicle !== undefined && summary.massKg <= launchVehicle.payloadCapacityKg,
          detail: launchVehicle
            ? `${summary.massKg} of ${launchVehicle.payloadCapacityKg} kg`
            : 'No launch vehicle selected',
        }
      case 'minNetPowerW':
        return {
          requirement,
          met: summary.unitCount > 0 && summary.netPowerW >= requirement.target,
          detail: `${summary.netPowerW} W (need ≥ ${requirement.target} W)`,
        }
      case 'minEnergyStorageWh':
        return {
          requirement,
          met: summary.energyStorageWh >= requirement.target,
          detail: `${summary.energyStorageWh} Wh (need ≥ ${requirement.target} Wh)`,
        }
      case 'requiredCategories': {
        const missing = requirement.categories.filter((c) => !summary.unitsByCategory[c])
        return {
          requirement,
          met: missing.length === 0,
          detail:
            missing.length === 0
              ? `${requirement.categories.length} of ${requirement.categories.length} installed`
              : `${requirement.categories.length - missing.length} of ${requirement.categories.length} installed`,
        }
      }
    }
  })
}
