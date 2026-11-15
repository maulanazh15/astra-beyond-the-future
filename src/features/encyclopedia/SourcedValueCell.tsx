import { ProvenanceBadge } from '../../components/common/ProvenanceBadge'
import type { SourcedValue } from '../../types/nasaSource'

type SourcedValueCellProps<T> = {
  item: SourcedValue<T>
  format?: (value: T) => string
}

/** A dataset value with its unit, provenance badge, cited sources, and processing note. */
export function SourcedValueCell<T>({ item, format = (v) => `${String(v)} ${item.unit}` }: SourcedValueCellProps<T>) {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm text-slate-100 tabular-nums">{format(item.value)}</span>
        <ProvenanceBadge provenance={item.provenance} />
      </div>
      <p className="text-[11px] leading-snug text-slate-500">{item.processing}</p>
      {item.sourceIds.length > 0 && (
        <p className="text-[11px] text-slate-500">
          Sources:{' '}
          {item.sourceIds.map((id, index) => (
            <span key={id}>
              {index > 0 && ', '}
              <a href={`#src-${id}`} className="font-mono text-cyan-300/80 hover:text-cyan-200">
                {id}
              </a>
            </span>
          ))}
        </p>
      )}
    </div>
  )
}
