import { Eye, EyeOff, Info, RotateCcw, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { componentCatalog } from '../../../data'
import type { DesignEntry } from '../../../types/component'
import { Scene3D } from '../components/Scene3D'
import { moduleAssetFor } from '../assetRegistry'
import { describeModule } from '../utilities/moduleInfo'
import { assembleSpacecraft } from '../utilities/spacecraftAssembly'
import { SpacecraftHangarScene } from './SpacecraftHangarScene'

type SpacecraftViewerProps = {
  /** The player's design: the single source of truth for what is shown. */
  entries: DesignEntry[]
  className?: string
}

const CATEGORY_ORDER = [...componentCatalog.categories.map((c) => c.id as string), 'structure']
const categoryLabel = (id: string) => componentCatalog.categories.find((c) => c.id === id)?.label ?? 'Structure'

/** Interactive 3D view of the current design: orbit, zoom, reset, visibility toggles, inspection. */
export function SpacecraftViewer({ entries, className = 'h-80 sm:h-[26rem]' }: SpacecraftViewerProps) {
  const assembly = useMemo(() => assembleSpacecraft(entries, componentCatalog), [entries])
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set())
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [resetKey, setResetKey] = useState(0)

  const selected = assembly.modules.find((m) => m.key === selectedKey && !hidden.has(m.category))
  const info = selected && describeModule(selected, componentCatalog, entries)
  const categories = CATEGORY_ORDER.map((id) => ({ id, count: assembly.modules.filter((m) => m.category === id).length })).filter((c) => c.count > 0)

  const toggle = (id: string) =>
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const overlay = (
    <>
      <div className="pointer-events-auto absolute top-3 right-3 flex gap-2">
        <select
          aria-label="Inspect component"
          value={selected?.key ?? ''}
          onChange={(e) => setSelectedKey(e.target.value || null)}
          className="max-w-44 rounded-md border border-space-600 bg-space-900/90 px-2 py-1.5 text-xs text-slate-200"
        >
          <option value="">Inspect…</option>
          {assembly.modules
            .filter((m) => !hidden.has(m.category))
            .map((m) => (
              <option key={m.key} value={m.key}>
                {describeModule(m, componentCatalog, entries).title}
                {m.kind === 'mainEngine' ? ' · engine' : m.kind === 'propulsionTanks' ? ' · tanks' : ''}
              </option>
            ))}
        </select>
        <button
          type="button"
          onClick={() => setResetKey((k) => k + 1)}
          className="inline-flex items-center gap-1.5 rounded-md border border-space-600 bg-space-900/90 px-2.5 py-1.5 text-xs text-slate-200 hover:border-cyan-500/60"
        >
          <RotateCcw className="size-3.5" aria-hidden />
          Reset view
        </button>
      </div>

      {entries.length === 0 && (
        <p className="absolute inset-x-0 top-1/3 text-center text-sm text-slate-400">Add components from the library to build your spacecraft.</p>
      )}

      {info && selected && (
        <div className="pointer-events-auto absolute top-3 left-3 w-64 max-w-[calc(100%-1.5rem)] rounded-lg border border-cyan-500/30 bg-space-900/95 p-3 text-xs shadow-xl">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] tracking-[0.14em] text-cyan-300 uppercase">{info.partLabel ?? info.categoryLabel}</p>
              <p className="mt-0.5 text-sm font-medium text-white">{info.title}</p>
            </div>
            <button type="button" onClick={() => setSelectedKey(null)} aria-label="Close component details" className="text-slate-500 hover:text-white">
              <X className="size-4" aria-hidden />
            </button>
          </div>
          <p className="mt-1.5 text-slate-400">{info.description}</p>
          {info.stats.length > 0 && (
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[11px]">
              {info.stats.map((s) => (
                <div key={s.label} className="flex justify-between gap-2">
                  <dt className="text-slate-500">{s.label}</dt>
                  <dd className="text-slate-200">{s.value}</dd>
                </div>
              ))}
            </dl>
          )}
          <p className="mt-2 flex items-center gap-1 text-[10px] text-slate-500">
            <Info className="size-3" aria-hidden />
            {info.unitsInstalled} installed · {selected.componentId && moduleAssetFor(selected.componentId) ? 'GLB model' : 'procedural model'}
          </p>
        </div>
      )}

      <div className="pointer-events-auto absolute inset-x-3 bottom-3 flex flex-wrap gap-1.5" role="group" aria-label="Toggle component visibility">
        {categories.map(({ id, count }) => {
          const off = hidden.has(id)
          return (
            <button
              key={id}
              type="button"
              aria-pressed={!off}
              onClick={() => toggle(id)}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                off ? 'border-space-700 bg-space-900/80 text-slate-500' : 'border-cyan-500/40 bg-space-900/90 text-cyan-100'
              }`}
            >
              {off ? <EyeOff className="size-3" aria-hidden /> : <Eye className="size-3" aria-hidden />}
              {categoryLabel(id)}
              <span className="font-mono text-slate-500">{count}</span>
            </button>
          )
        })}
      </div>
      {(assembly.unplaced.length > 0 || assembly.unknown.length > 0) && (
        <p className="absolute right-3 bottom-12 text-[11px] text-amber-300">
          {assembly.unplaced.length + assembly.unknown.length} component(s) not shown: no free mount point or unknown part.
        </p>
      )}
    </>
  )

  return (
    <Scene3D label="3D preview of your spacecraft design" className={className} overlay={overlay} onPointerMissed={() => setSelectedKey(null)}>
      <SpacecraftHangarScene assembly={assembly} hidden={hidden} selectedKey={selected?.key ?? null} onSelect={setSelectedKey} resetKey={resetKey} />
    </Scene3D>
  )
}
