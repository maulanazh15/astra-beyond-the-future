import { ArrowLeft, Calculator, Info, Library, MapPin, SlidersHorizontal, Thermometer } from 'lucide-react'
import { DEFAULT_MISSION_ID, paths } from '../../app/paths'
import { ButtonLink } from '../../components/common/ButtonLink'
import { PageHeader } from '../../components/common/PageHeader'
import { Panel } from '../../components/common/Panel'
import { ProvenanceBadge } from '../../components/common/ProvenanceBadge'
import {
  assumptionDescriptions,
  assumptionDisclaimer,
  gameplayAssumptions,
  getThermalProfile,
  lunarSites,
  lunarSitesNote,
  nasaSources,
  nasaSourcesNote,
  thermalProfiles,
  thermalProfilesNote,
} from '../../data'
import { hazardLabels, kelvinToCelsius } from '../../engine/environment/thermal'
import type { GameplayAssumptions } from '../../types/validation'
import { SourceCard } from './SourceCard'
import { SourcedValueCell } from './SourcedValueCell'

const kelvin = (k: number) => `${k} K (${kelvinToCelsius(k)} °C)`

const equations = [
  { name: 'Night heat need', formula: 'k_loss × (T_survive − T_night) × (1 − insulation)', note: 'Must be covered by survival electrical load plus radioisotope heat.' },
  { name: 'Daytime heat rejection', formula: '(base + radiators) × max(f_min, 1 − d × (T_day − T_ref))', note: 'Hot sites derate radiators; also drives the overheating event.' },
  { name: 'Effective landing slope', formula: 'slope × (1 − r_HDA if hazard avoidance)', note: 'Compared with the landing gear slope tolerance.' },
]

export function EncyclopediaPage() {
  return (
    <>
      <PageHeader
        eyebrow="Mission Encyclopedia"
        title="Data sources & attribution"
        description="Where ASTRA's environment data comes from, how it was processed, and which values are gameplay assumptions."
        actions={
          <ButtonLink to={paths.briefing(DEFAULT_MISSION_ID)} variant="secondary" icon={ArrowLeft}>
            Mission Briefing
          </ButtonLink>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-space-700 bg-space-900/60 px-4 py-3 text-xs text-slate-400">
        <Info className="size-4 shrink-0 text-cyan-400" aria-hidden />
        <span className="flex-1">{nasaSourcesNote}</span>
        <span className="flex flex-wrap gap-2">
          <ProvenanceBadge provenance="source-derived" />
          <ProvenanceBadge provenance="derived-estimate" />
          <ProvenanceBadge provenance="placeholder" />
        </span>
      </div>

      <div className="space-y-6">
        <Panel title="Lunar Site Dataset" icon={MapPin}>
          <p className="mb-4 text-xs text-slate-400">{lunarSitesNote}</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] text-left text-sm">
              <thead className="text-[11px] tracking-wider text-slate-500 uppercase">
                <tr>
                  <th className="pr-4 pb-2 font-medium">Site</th>
                  <th className="pr-4 pb-2 font-medium">Crater diameter</th>
                  <th className="pr-4 pb-2 font-medium">Landing slope</th>
                  <th className="pb-2 font-medium">Hazard</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-space-700 align-top">
                {lunarSites.map((site) => (
                  <tr key={site.id}>
                    <td className="w-64 py-3 pr-4">
                      <p className="text-slate-100">{site.name}</p>
                      <p className="text-xs text-slate-500">{site.region}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {site.radioQuiet ? 'Far side: shielded from Earth radio noise' : 'Near side: exposed to Earth radio noise'} ·{' '}
                        {getThermalProfile(site)?.name} thermal profile
                      </p>
                    </td>
                    <td className="py-3 pr-4">
                      {site.craterDiameterKm ? <SourcedValueCell item={site.craterDiameterKm} /> : <span className="text-slate-500">—</span>}
                    </td>
                    <td className="py-3 pr-4">
                      <SourcedValueCell item={site.landingSlopeDeg} format={(v) => `${v}°`} />
                    </td>
                    <td className="py-3">
                      <SourcedValueCell item={site.hazardLevel} format={(v) => hazardLabels[v]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Thermal Environment Profiles" icon={Thermometer}>
          <p className="mb-4 text-xs text-slate-400">{thermalProfilesNote}</p>
          <div className="grid gap-4 md:grid-cols-2">
            {thermalProfiles.map((profile) => (
              <article key={profile.id} className="rounded-lg border border-space-700 bg-space-800/40 p-4">
                <p className="font-medium text-slate-100">
                  {profile.name} <span className="text-xs text-slate-500">· latitude {profile.latitudeBand}</span>
                </p>
                <p className="mt-0.5 text-xs text-slate-400">{profile.summary}</p>
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="mb-1 text-[11px] tracking-wider text-slate-500 uppercase">Daytime maximum</p>
                    <SourcedValueCell item={profile.dayMaxK} format={kelvin} />
                  </div>
                  <div>
                    <p className="mb-1 text-[11px] tracking-wider text-slate-500 uppercase">Pre-dawn minimum</p>
                    <SourcedValueCell item={profile.nightMinK} format={kelvin} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </Panel>

        <Panel title="NASA Sources" icon={Library}>
          <div className="grid gap-4 lg:grid-cols-2">
            {nasaSources.map((source) => (
              <SourceCard key={source.id} source={source} />
            ))}
          </div>
        </Panel>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Simplified Models" icon={Calculator}>
            <ul className="space-y-4">
              {equations.map((eq) => (
                <li key={eq.name}>
                  <p className="text-sm text-slate-100">{eq.name}</p>
                  <code className="mt-1 block rounded bg-space-950 px-2 py-1.5 font-mono text-xs text-cyan-200">{eq.formula}</code>
                  <p className="mt-1 text-xs text-slate-500">{eq.note}</p>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[11px] text-slate-500">
              Temperatures come from the dataset above. Every coefficient is a gameplay assumption, not an engineering value.
            </p>
          </Panel>

          <Panel title="Gameplay Assumptions" icon={SlidersHorizontal}>
            <p className="mb-3 text-xs text-amber-300/80">{assumptionDisclaimer.note}</p>
            <dl className="space-y-2 text-xs">
              {(Object.keys(gameplayAssumptions) as (keyof GameplayAssumptions)[]).map((key) => (
                <div key={key} className="grid grid-cols-[auto_1fr] gap-3">
                  <dt className="w-14 text-right font-mono text-slate-200 tabular-nums">{gameplayAssumptions[key]}</dt>
                  <dd className="text-slate-400">{assumptionDescriptions[key]}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </div>
      </div>
    </>
  )
}
