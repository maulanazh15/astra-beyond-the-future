import { ArrowLeft, Box, Rocket, Satellite } from 'lucide-react'
import { paths } from '../../app/paths'
import { ButtonLink } from '../../components/common/ButtonLink'
import { PageHeader } from '../../components/common/PageHeader'
import { Panel } from '../../components/common/Panel'
import { useMission } from '../../components/layout/useMission'
import { launchVehicles, orbitProfiles } from '../../data'
import { formatMUsd, formatNumber, formatPercent } from '../../utils/format'
import { SpacecraftViewer3D } from '../visualization/LazyScenes'
import { ComponentLibrary } from './ComponentLibrary'
import { DesignCompatibilityNotice } from './DesignCompatibilityNotice'
import { OptionCard } from './OptionCard'
import { ResourceDashboard } from './ResourceDashboard'
import { SelectedComponentList } from './SelectedComponentList'
import { SitePanel } from './SitePanel'
import { useSpacecraftDesign } from './useSpacecraftDesign'
import { ValidationPanel } from './ValidationPanel'

export function MissionDesignerPage() {
  const mission = useMission()
  const design = useSpacecraftDesign(mission)

  return (
    <>
      <PageHeader
        eyebrow={`Mission Designer · ${mission.name}`}
        title="Configure your spacecraft"
        description="Add components from the library, pick a landing site, launch vehicle and transfer orbit, and watch your resources update live."
        actions={
          <>
            <ButtonLink to={paths.briefing(mission.id)} variant="secondary" icon={ArrowLeft}>
              Briefing
            </ButtonLink>
            <ButtonLink to={paths.control(mission.id)} icon={Rocket}>
              Launch Mission
            </ButtonLink>
          </>
        }
      />

      <DesignCompatibilityNotice design={design} />

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-6">
          <Panel title="Spacecraft Preview" icon={Box}>
            <SpacecraftViewer3D entries={design.entries} />
          </Panel>
          <ComponentLibrary design={design} />

          <SitePanel design={design} />

          <div className="grid gap-6 xl:grid-cols-2">
            <Panel title="Launch Vehicle" icon={Rocket}>
              <div className="space-y-3">
                {launchVehicles.map((lv) => (
                  <OptionCard
                    key={lv.id}
                    name={lv.name}
                    selected={lv.id === design.launchVehicleId}
                    onSelect={() => design.setLaunchVehicleId(lv.id)}
                    specs={[
                      { label: 'Capacity', value: `${formatNumber(lv.payloadCapacityKg)} kg` },
                      { label: 'Cost', value: formatMUsd(lv.costMUsd) },
                      { label: 'Reliability', value: formatPercent(lv.reliability) },
                    ]}
                  />
                ))}
              </div>
            </Panel>
            <Panel title="Transfer Orbit" icon={Satellite}>
              <div className="space-y-3">
                {orbitProfiles.map((orbit) => (
                  <OptionCard
                    key={orbit.id}
                    name={orbit.name}
                    description={orbit.description}
                    selected={orbit.id === design.orbitId}
                    onSelect={() => design.setOrbitId(orbit.id)}
                    specs={[{ label: 'Transfer', value: `${orbit.transferDays} days` }]}
                  />
                ))}
              </div>
            </Panel>
          </div>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto">
          <ResourceDashboard mission={mission} design={design} />
          <ValidationPanel results={design.validation} />
          <SelectedComponentList design={design} />
        </aside>
      </div>
    </>
  )
}
