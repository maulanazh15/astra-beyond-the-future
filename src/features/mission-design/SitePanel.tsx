import { BookOpen, MapPin } from 'lucide-react'
import { Link } from 'react-router'
import { paths } from '../../app/paths'
import { Panel } from '../../components/common/Panel'
import { getThermalProfile, lunarSites } from '../../data'
import { hazardLabels } from '../../engine/environment/thermal'
import { OptionCard } from './OptionCard'
import type { SpacecraftDesign } from './useSpacecraftDesign'

export function SitePanel({ design }: { design: SpacecraftDesign }) {
  return (
    <Panel
      title="Landing Site"
      icon={MapPin}
      action={
        <Link to={paths.encyclopedia} className="inline-flex items-center gap-1 text-xs text-cyan-300 hover:text-white">
          <BookOpen className="size-3.5" aria-hidden />
          Data sources
        </Link>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {lunarSites.map((site) => {
          const thermal = getThermalProfile(site)
          return (
            <OptionCard
              key={site.id}
              name={site.name}
              description={site.description}
              selected={site.id === design.siteId}
              onSelect={() => design.setSiteId(site.id)}
              specs={[
                { label: 'Slope', value: `${site.landingSlopeDeg.value}°*` },
                { label: 'Hazard', value: `${hazardLabels[site.hazardLevel.value]}*` },
                { label: 'Day', value: thermal ? `${thermal.dayMaxK.value} K` : '—' },
                { label: 'Night', value: thermal ? `${thermal.nightMinK.value} K` : '—' },
                { label: 'Radio', value: site.radioQuiet ? 'Quiet' : 'Earth noise' },
              ]}
            />
          )
        })}
      </div>
      <p className="mt-4 text-[11px] text-slate-500">
        Temperatures come from LRO Diviner results; see the Encyclopedia for how each value was derived.
        * Slopes and hazards are placeholders until LOLA slope maps are sampled.
      </p>
    </Panel>
  )
}
