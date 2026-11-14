import { CalendarClock, ChevronRight, Coins, MapPin, Telescope } from 'lucide-react'
import { paths } from '../../app/paths'
import { ButtonLink } from '../../components/common/ButtonLink'
import { PageHeader } from '../../components/common/PageHeader'
import { StatusBadge } from '../../components/common/StatusBadge'
import { missions } from '../../data'
import { formatDuration, formatMUsd } from '../../utils/format'

export function MissionSelectionPage() {
  return (
    <>
      <PageHeader
        eyebrow="Mission Selection"
        title="Choose a future mission"
        description="Each scenario is a hypothetical mission concept informed by NASA research and datasets."
      />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {missions.map((mission) => {
          const available = mission.status === 'available'
          return (
            <article
              key={mission.id}
              className={`flex flex-col rounded-xl border bg-space-900/80 p-6 ${
                available ? 'border-cyan-500/40 shadow-lg shadow-cyan-500/5' : 'border-space-700 opacity-70'
              }`}
            >
              <div className="mb-4 flex items-center justify-between gap-2">
                <span className="font-mono text-xs tracking-[0.25em] text-cyan-400">{mission.name}</span>
                {available ? (
                  <StatusBadge tone="success" label="Available" />
                ) : (
                  <StatusBadge tone="neutral" label="Locked" />
                )}
              </div>
              <h2 className="text-xl font-semibold text-white">{mission.subtitle}</h2>
              <p className="mt-2 flex-1 text-sm text-slate-400">{mission.description}</p>

              <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-space-700 pt-4 text-xs">
                <div>
                  <dt className="flex items-center gap-1 text-slate-500"><MapPin className="size-3" aria-hidden />Target</dt>
                  <dd className="mt-1 text-slate-200">{mission.destination}</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1 text-slate-500"><Coins className="size-3" aria-hidden />Budget</dt>
                  <dd className="mt-1 font-mono text-slate-200">{formatMUsd(mission.budgetMUsd)}</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1 text-slate-500"><CalendarClock className="size-3" aria-hidden />Duration</dt>
                  <dd className="mt-1 font-mono text-slate-200">{formatDuration(mission.durationDays)}</dd>
                </div>
              </dl>

              <div className="mt-5 flex items-center justify-between">
                <span className="text-xs text-slate-500">{mission.difficulty}</span>
                {available ? (
                  <ButtonLink to={paths.briefing(mission.id)} icon={ChevronRight} iconPosition="end">
                    Open Briefing
                  </ButtonLink>
                ) : (
                  <span className="text-xs text-slate-500">Coming in a future update</span>
                )}
              </div>
            </article>
          )
        })}
        <article className="flex flex-col items-center justify-center rounded-xl border border-dashed border-space-700 p-6 text-center">
          <Telescope className="size-8 text-slate-600" aria-hidden />
          <p className="mt-3 text-sm text-slate-400">More future missions coming soon</p>
          <p className="mt-1 text-xs text-slate-500">Europa, Mars, and deep-space scenarios are planned.</p>
        </article>
      </div>
    </>
  )
}
