import { Home, SatelliteDish } from 'lucide-react'
import { paths } from '../../app/paths'
import { ButtonLink } from '../../components/common/ButtonLink'

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center py-24 text-center">
      <SatelliteDish className="size-10 text-cyan-400" aria-hidden />
      <h1 className="mt-4 text-2xl font-semibold text-white">Signal lost</h1>
      <p className="mt-2 text-slate-400">This page does not exist.</p>
      <ButtonLink to={paths.home} icon={Home} className="mt-6">
        Return to Main Menu
      </ButtonLink>
    </div>
  )
}
