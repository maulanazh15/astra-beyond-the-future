import type { DataProvenance } from '../../types/nasaSource'
import { StatusBadge } from './StatusBadge'
import type { BadgeTone } from './StatusBadge'

const provenanceBadge: Record<DataProvenance, { tone: BadgeTone; label: string }> = {
  'source-derived': { tone: 'success', label: 'Source-derived' },
  'derived-estimate': { tone: 'info', label: 'Derived estimate' },
  placeholder: { tone: 'warning', label: 'Placeholder' },
}

/** Labels where a dataset value comes from, so placeholders never pass as measurements. */
export function ProvenanceBadge({ provenance }: { provenance: DataProvenance }) {
  const { tone, label } = provenanceBadge[provenance]
  return <StatusBadge tone={tone} label={label} />
}
