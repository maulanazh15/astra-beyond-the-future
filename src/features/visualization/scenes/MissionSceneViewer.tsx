import { Eye, EyeOff, Info, Pause, Play, RotateCcw, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { conceptStepStart, conceptVisualState, missionStep } from '../animations/missionTimeline'
import type { MissionVisualState } from '../animations/missionTimeline'
import { Scene3D } from '../components/Scene3D'
import { usePlayback } from '../hooks/usePlayback'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import type { SceneSite } from '../types/scene'
import { MISSION_ASSET_IDS, missionAssetInfo, missionAssetStatus, presentAssets, resolveSelection, toggleHidden } from '../utilities/missionAssets'
import type { MissionAssetId } from '../utilities/missionAssets'
import { buildMissionWorld } from '../utilities/missionWorld'
import { LunarMissionScene } from './LunarMissionScene'
import { MissionStepBar } from './MissionStepBar'

/** Length of the full concept playback, descent to first light (s). */
const CONCEPT_PLAYBACK_S = 80

export type MissionSceneViewerProps = {
  site: SceneSite
  /** Live state from the simulation. Without it, the viewer offers the concept playback. */
  live?: MissionVisualState
  className?: string
}

const chip = 'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition-colors'

/**
 * Interactive LUNAR ECHO scene: select or focus each asset (click it or use the chips), hide
 * assets, reset the camera, read asset details, and play or scrub the deployment sequence.
 */
export function MissionSceneViewer({ site, live, className }: MissionSceneViewerProps) {
  const reducedMotion = usePrefersReducedMotion()
  const world = useMemo(() => buildMissionWorld(site), [site])
  const playback = usePlayback(CONCEPT_PLAYBACK_S)
  const visual = live ?? conceptVisualState(playback.t)
  const [hidden, setHidden] = useState<ReadonlySet<MissionAssetId>>(new Set())
  const [picked, setPicked] = useState<MissionAssetId | null>(null)
  const [resetKey, setResetKey] = useState(0)
  const selected = resolveSelection(picked, visual, hidden)
  const present = presentAssets(visual)
  const info = selected && missionAssetInfo(selected, world.lcrt)

  const reset = () => {
    setPicked(null)
    setResetKey((k) => k + 1)
  }

  const overlay = (
    <>
      <div className="pointer-events-auto absolute top-3 right-3 flex flex-wrap justify-end gap-1.5" role="group" aria-label="Mission hardware">
        {MISSION_ASSET_IDS.filter((id) => present.includes(id)).map((id) => {
          const off = hidden.has(id)
          const name = missionAssetInfo(id, world.lcrt).name
          return (
            <span key={id} className={`${chip} ${selected === id ? 'border-cyan-400 bg-cyan-500/15 text-white' : 'border-space-600 bg-space-900/90 text-slate-200'}`}>
              <button type="button" onClick={() => setPicked(selected === id ? null : id)} aria-pressed={selected === id} className="hover:text-cyan-200">
                {name.replace('LUNAR ECHO ', '')}
              </button>
              <button type="button" onClick={() => setHidden((h) => toggleHidden(h, id))} aria-label={`${off ? 'Show' : 'Hide'} ${name}`} aria-pressed={!off} className="text-slate-400 hover:text-white">
                {off ? <EyeOff className="size-3" aria-hidden /> : <Eye className="size-3" aria-hidden />}
              </button>
            </span>
          )
        })}
        <button type="button" onClick={reset} className={`${chip} border-space-600 bg-space-900/90 text-slate-200 hover:border-cyan-500/60`}>
          <RotateCcw className="size-3" aria-hidden />
          Reset view
        </button>
      </div>

      {info && selected && (
        <div className="pointer-events-auto absolute top-3 left-3 w-64 max-w-[calc(100%-1.5rem)] rounded-lg border border-cyan-500/30 bg-space-900/95 p-3 text-xs shadow-xl">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] tracking-[0.14em] text-cyan-300 uppercase">{info.role}</p>
              <p className="mt-0.5 text-sm font-medium text-white">{info.name}</p>
            </div>
            <button type="button" onClick={() => setPicked(null)} aria-label="Close asset details" className="text-slate-500 hover:text-white">
              <X className="size-4" aria-hidden />
            </button>
          </div>
          <p className="mt-1 text-[11px] text-cyan-100">{missionAssetStatus(selected, visual)}</p>
          <p className="mt-1.5 text-slate-400">{info.description}</p>
          <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[11px]">
            {info.specs.map((s) => (
              <div key={s.label} className="flex justify-between gap-2">
                <dt className="text-slate-500">{s.label}</dt>
                <dd className="text-right text-slate-200">{s.value}</dd>
              </div>
            ))}
          </dl>
          {info.provenance && (
            <p className="mt-2 flex gap-1 text-[10px] leading-snug text-amber-200/80">
              <Info className="mt-px size-3 shrink-0" aria-hidden />
              {info.provenance}
            </p>
          )}
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-space-950/95 to-transparent px-4 pt-10 pb-3 text-[11px] text-slate-400">
        <MissionStepBar step={missionStep(visual)} failed={visual.failed} onJump={live ? undefined : (id) => playback.seek(conceptStepStart(id))} />
        <p className="mb-1.5 text-xs text-slate-100" aria-live="polite">
          {visual.caption}
        </p>
        {live ? (
          <p>
            <span className="mr-1.5 inline-block size-1.5 rounded-full bg-emerald-400 align-middle" aria-hidden />
            Live · following the simulation at <span className="text-slate-200">{site.name}</span>
          </p>
        ) : (
          <div className="pointer-events-auto flex items-center gap-3">
            <button
              type="button"
              onClick={playback.playing ? playback.pause : playback.play}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-cyan-500/40 bg-space-900/90 px-2.5 py-1 text-xs text-cyan-100 hover:border-cyan-400"
            >
              {playback.playing ? <Pause className="size-3.5" aria-hidden /> : <Play className="size-3.5" aria-hidden />}
              {playback.playing ? 'Pause' : playback.t >= 1 ? 'Replay deployment' : 'Play'}
            </button>
            <input
              type="range"
              min={0}
              max={1000}
              value={Math.round(playback.t * 1000)}
              onChange={(e) => playback.seek(Number(e.target.value) / 1000)}
              aria-label="Deployment timeline"
              className="h-1 min-w-0 flex-1 accent-cyan-400"
            />
            <span className="hidden shrink-0 sm:inline">
              {site.name} · {site.earthVisible ? 'Earth-facing site' : 'Far side: radio-quiet sky'}
            </span>
          </div>
        )}
      </div>
    </>
  )

  return (
    <Scene3D label={`3D view of the LUNAR ECHO lander, construction rover, and crater radio telescope at ${site.name}`} className={className} overlay={overlay} onPointerMissed={() => setPicked(null)}>
      <LunarMissionScene
        world={world}
        visual={visual}
        earthVisible={site.earthVisible}
        animate={!reducedMotion}
        hidden={hidden}
        selected={selected}
        onSelect={setPicked}
        resetKey={resetKey}
      />
    </Scene3D>
  )
}
