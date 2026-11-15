import { componentCatalog } from '../../data'
import { findComponent } from '../../engine/design/designEntries'
import type { DesignIssue } from '../../engine/design/designEntries'

/** Player-facing explanation of one compatibility issue. */
export function describeDesignIssue(issue: DesignIssue): string {
  if (issue.kind === 'unknownComponent') {
    return `"${issue.componentId}" ×${issue.quantity} is no longer in the component library.`
  }
  const label = componentCatalog.categories.find((c) => c.id === issue.category)?.label ?? issue.category
  const parts = issue.entries
    .map((e) => `${findComponent(componentCatalog, e.componentId)?.name ?? e.componentId} ×${e.quantity}`)
    .join(', ')
  return `${label}: ${issue.unitCount} units installed (${parts}), but the limit is ${issue.maxUnits}.`
}
