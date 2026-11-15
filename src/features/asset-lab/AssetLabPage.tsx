import { Box, Info, Rocket } from 'lucide-react'
import { useLayoutEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { DEFAULT_MISSION_ID } from '../../app/paths'
import { Panel } from '../../components/common/Panel'
import { PageHeader } from '../../components/common/PageHeader'
import { StatusBadge } from '../../components/common/StatusBadge'
import type { BadgeTone } from '../../components/common/StatusBadge'
import { componentCatalog, getSite } from '../../data'
import { modelAssets, modelAssetsNote } from '../visualization/assetRegistry'
import { ModelViewer } from '../visualization/components/ModelViewer'
import type { ModelStatus } from '../visualization/components/ModelViewer'
import { OrbitControls } from '../visualization/components/OrbitControls'
import { Scene3D } from '../visualization/components/Scene3D'
import { SceneCamera } from '../visualization/components/SceneCamera'
import { SceneLighting } from '../visualization/components/SceneLighting'
import { createSpacecraftMaterials, disposeMaterials } from '../visualization/materials/spacecraftMaterials'
import { ModularSpacecraft } from '../visualization/models/spacecraft/ModularSpacecraft'
import { assembleSpacecraft } from '../visualization/utilities/spacecraftAssembly'
import { LunarEnvironment } from '../visualization/scenes/LunarEnvironment'
import { buildMissionWorld } from '../visualization/utilities/missionWorld'
import { sceneSiteFrom } from '../visualization/utilities/sceneSite'
import { loadDesign } from '../../services/persistence/designStorage'

const statusBadge: Record<ModelStatus, { tone: BadgeTone; label: string }> = {
  placeholder: { tone: 'warning', label: 'Dev placeholder' },
  loading: { tone: 'info', label: 'Loading model…' },
  loaded: { tone: 'success', label: 'Model loaded' },
  error: { tone: 'critical', label: 'Load failed · placeholder shown' },
}

const SPACECRAFT = 'spacecraft'

/** Development preview of registered 3D assets. Not part of the mission flow. `?asset=<id>` links to one asset. */
export function AssetLabPage() {
  const [params, setParams] = useSearchParams()
  const [status, setStatus] = useState<ModelStatus>('placeholder')
  const [design] = useState(() => loadDesign(DEFAULT_MISSION_ID))
  const asset = modelAssets.find((a) => a.id === params.get('asset'))
  const selected = asset?.id ?? SPACECRAFT
  const world = useMemo(() => {
    const site = getSite(design?.siteId) ?? getSite('site-farside-equatorial')
    return site ? buildMissionWorld(sceneSiteFrom(site)) : undefined
  }, [design])

  const select = (id: string) => {
    setParams(id === SPACECRAFT ? {} : { asset: id }, { replace: true })
    setStatus('placeholder')
  }

  return (
    <>
      <PageHeader
        eyebrow="Development · 3D Asset Pipeline"
        title="3D asset preview"
        description="Check Blender GLB exports in a lunar scene before they are used in the game. Amber wireframes are development placeholders, not final assets."
      />
      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <Panel title="Registry" icon={Box}>
          <ul className="space-y-1.5">
            <li>
              <button
                type="button"
                onClick={() => select(SPACECRAFT)}
                aria-pressed={selected === SPACECRAFT}
                className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm ${selected === SPACECRAFT ? 'bg-space-800 text-cyan-200' : 'text-slate-300 hover:bg-space-800/60'}`}
              >
                <Rocket className="size-4 shrink-0" aria-hidden />
                Saved LUNAR ECHO design
              </button>
            </li>
            {modelAssets.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => select(a.id)}
                  aria-pressed={selected === a.id}
                  className={`w-full rounded-md px-2.5 py-2 text-left text-sm ${selected === a.id ? 'bg-space-800 text-cyan-200' : 'text-slate-300 hover:bg-space-800/60'}`}
                >
                  {a.name}
                  <span className="block font-mono text-[11px] text-slate-500">
                    {a.category} · {a.status}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>

        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-300">{asset ? asset.name : 'Saved LUNAR ECHO design'}</p>
            {/* Load status is per model, so it is shown for a single selected asset only. */}
            {asset && <StatusBadge {...statusBadge[status]} />}
          </div>
          <Scene3D label={`3D preview of ${asset?.name ?? 'the saved spacecraft design'}`} className="h-[28rem]">
            {world && (
              <>
                {/* Models are previewed on the mission scene's landing pad. */}
                <SceneCamera positionM={[world.landerPosition[0] + 7, world.landerPosition[1] + 4, world.landerPosition[2] + 9]} targetM={[world.landerPosition[0], world.landerPosition[1] + 1, world.landerPosition[2]]} />
                <OrbitControls target={[world.landerPosition[0], world.landerPosition[1] + 1, world.landerPosition[2]]} minDistanceM={3} maxDistanceM={60} />
                <SceneLighting />
                <LunarEnvironment terrain={world.terrain} rocks={world.rocks} earthVisible={false} animate={false} />
                <group position={world.landerPosition}>
                  {asset ? (
                    asset.category !== 'environment' && <ModelViewer key={asset.id} asset={asset} onStatusChange={setStatus} />
                  ) : (
                    <LabSpacecraft entries={design?.entries ?? []} />
                  )}
                </group>
              </>
            )}
          </Scene3D>
          {asset && (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-1 font-mono text-xs text-slate-400 sm:grid-cols-3">
              <div>file: <span className="text-slate-200">{asset.modelPath}</span></div>
              <div>scale: <span className="text-slate-200">{asset.scale}</span></div>
              <div>rotation°: <span className="text-slate-200">{asset.rotationDeg.join(', ')}</span></div>
              {asset.componentIds && <div>components: <span className="text-slate-200">{asset.componentIds.join(', ')}</span></div>}
            </dl>
          )}
          <p className="flex gap-2 text-xs text-slate-500">
            <Info className="mt-px size-3.5 shrink-0 text-cyan-400" aria-hidden />
            {modelAssetsNote} Drag to orbit, scroll to zoom.
          </p>
        </div>
      </div>
    </>
  )
}

/** The saved design as its modular spacecraft, on the landing pad. */
function LabSpacecraft({ entries }: { entries: { componentId: string; quantity: number }[] }) {
  const assembly = useMemo(() => assembleSpacecraft(entries, componentCatalog), [entries])
  const materials = useMemo(() => createSpacecraftMaterials(), [])
  useLayoutEffect(() => () => disposeMaterials(materials), [materials])
  return <ModularSpacecraft assembly={assembly} materials={materials} />
}
