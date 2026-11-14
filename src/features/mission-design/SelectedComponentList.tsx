import { ListChecks, Trash2, X } from 'lucide-react'
import { Panel } from '../../components/common/Panel'
import { componentCatalog } from '../../data'
import { findComponent } from '../../engine/design/designEntries'
import { formatMUsd } from '../../utils/format'
import { categoryIcons } from './categoryIcons'
import type { SpacecraftDesign } from './useSpacecraftDesign'

type SelectedComponentListProps = {
  design: SpacecraftDesign
}

export function SelectedComponentList({ design }: SelectedComponentListProps) {
  const rows = componentCatalog.categories.flatMap((category) =>
    design.entries
      .map((entry) => ({ entry, component: findComponent(componentCatalog, entry.componentId) }))
      .filter((row) => row.component?.category === category.id),
  )

  return (
    <Panel
      title={`Selected Components (${design.summary.unitCount})`}
      icon={ListChecks}
      action={
        rows.length > 0 && (
          <button
            type="button"
            onClick={design.clear}
            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-rose-300"
          >
            <Trash2 className="size-3.5" aria-hidden />
            Clear all
          </button>
        )
      }
    >
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">
          No components yet. Add parts from the library.
        </p>
      ) : (
        <ul className="divide-y divide-space-700">
          {rows.map(({ entry, component }) => {
            if (!component) return null
            const Icon = categoryIcons[component.category]
            return (
              <li key={entry.componentId} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <Icon className="size-4 shrink-0 text-cyan-400" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-slate-100">
                    {component.name}
                    {entry.quantity > 1 && <span className="ml-1.5 font-mono text-xs text-cyan-300">×{entry.quantity}</span>}
                  </p>
                  <p className="font-mono text-[11px] text-slate-500 tabular-nums">
                    {component.massKg * entry.quantity} kg · {formatMUsd(component.costMUsd * entry.quantity)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => design.removeAll(entry.componentId)}
                  aria-label={`Remove ${component.name}`}
                  title="Remove"
                  className="grid size-7 place-items-center rounded-md text-slate-500 transition-colors hover:bg-space-800 hover:text-rose-300"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
