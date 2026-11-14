import { Library, Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import { Panel } from '../../components/common/Panel'
import { componentCatalog } from '../../data'
import { quantityOf } from '../../engine/design/designEntries'
import type { ComponentCategory, SpacecraftComponent } from '../../types/component'
import { formatMUsd } from '../../utils/format'
import { categoryIcons } from './categoryIcons'
import type { SpacecraftDesign } from './useSpacecraftDesign'

type ComponentLibraryProps = {
  design: SpacecraftDesign
}

export function ComponentLibrary({ design }: ComponentLibraryProps) {
  const [activeCategory, setActiveCategory] = useState<ComponentCategory>('bus')
  const definition = componentCatalog.categories.find((c) => c.id === activeCategory)
  const options = componentCatalog.components.filter((c) => c.category === activeCategory)
  const usedUnits = design.summary.unitsByCategory[activeCategory] ?? 0

  return (
    <Panel title="Component Library" icon={Library}>
      <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Component category">
        {componentCatalog.categories.map((category) => {
          const Icon = categoryIcons[category.id]
          const active = category.id === activeCategory
          const units = design.summary.unitsByCategory[category.id] ?? 0
          return (
            <button
              key={category.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveCategory(category.id)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                active
                  ? 'border-cyan-400/70 bg-cyan-500/10 text-cyan-200'
                  : 'border-space-700 text-slate-400 hover:border-space-600 hover:text-white'
              }`}
            >
              <Icon className="size-4" aria-hidden />
              {category.label}
              <span
                className={`rounded px-1.5 font-mono text-[11px] tabular-nums ${
                  units > 0 ? 'bg-cyan-500/20 text-cyan-200' : 'bg-space-800 text-slate-500'
                }`}
              >
                {units}
              </span>
            </button>
          )
        })}
      </div>

      {definition && (
        <p className="mb-4 flex flex-wrap items-baseline justify-between gap-2 text-sm text-slate-400">
          <span>{definition.description}</span>
          <span className="font-mono text-xs text-slate-500">
            {usedUnits} / {definition.maxUnits} units installed
          </span>
        </p>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {options.map((component) => (
          <ComponentCard
            key={component.id}
            component={component}
            quantity={quantityOf(design.entries, component.id)}
            canAdd={design.canAdd(component.id)}
            onAdd={() => design.add(component.id)}
            onRemove={() => design.remove(component.id)}
          />
        ))}
      </div>
    </Panel>
  )
}

type ComponentCardProps = {
  component: SpacecraftComponent
  quantity: number
  canAdd: boolean
  onAdd: () => void
  onRemove: () => void
}

function ComponentCard({ component, quantity, canAdd, onAdd, onRemove }: ComponentCardProps) {
  const selected = quantity > 0
  const specs = [
    { label: 'Mass', value: `${component.massKg} kg` },
    { label: 'Cost', value: formatMUsd(component.costMUsd) },
    { label: 'Demand', value: `${component.powerDemandW} W` },
    { label: 'Generation', value: `${component.powerGenerationW} W` },
    ...(component.energyStorageWh ? [{ label: 'Storage', value: `${component.energyStorageWh} Wh` }] : []),
    { label: 'Reliability', value: `${(component.reliability * 100).toFixed(1)}%` },
  ]

  return (
    <article
      className={`flex flex-col rounded-lg border p-4 ${
        selected ? 'border-cyan-400/70 bg-cyan-500/5' : 'border-space-700 bg-space-800/40'
      }`}
    >
      <h3 className="font-medium text-slate-100">{component.name}</h3>
      <p className="mt-1 text-xs text-slate-400">{component.description}</p>
      <dl className="mt-3 grid flex-1 grid-cols-2 gap-x-3 gap-y-1 text-xs">
        {specs.map((spec) => (
          <div key={spec.label} className="flex justify-between gap-2">
            <dt className="text-slate-500">{spec.label}</dt>
            <dd className="font-mono text-slate-200 tabular-nums">{spec.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 flex items-center justify-between gap-2">
        {selected ? (
          <div className="flex items-center gap-1">
            <IconButton label={`Remove one ${component.name}`} onClick={onRemove} icon={Minus} />
            <span className="w-8 text-center font-mono text-sm text-white tabular-nums" aria-label="Quantity">
              {quantity}
            </span>
            <IconButton label={`Add one ${component.name}`} onClick={onAdd} icon={Plus} disabled={!canAdd} />
          </div>
        ) : (
          <button
            type="button"
            onClick={onAdd}
            disabled={!canAdd}
            className="inline-flex items-center gap-1.5 rounded-md bg-cyan-500 px-3 py-1.5 text-sm font-semibold text-space-950 transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-space-700 disabled:text-slate-500"
          >
            <Plus className="size-4" aria-hidden />
            Add
          </button>
        )}
        {!canAdd && <span className="text-[11px] text-slate-500">Category full</span>}
      </div>
    </article>
  )
}

type IconButtonProps = {
  label: string
  onClick: () => void
  icon: typeof Plus
  disabled?: boolean
}

function IconButton({ label, onClick, icon: Icon, disabled }: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="grid size-8 place-items-center rounded-md border border-space-600 text-slate-200 transition-colors hover:border-cyan-500/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Icon className="size-4" aria-hidden />
    </button>
  )
}
