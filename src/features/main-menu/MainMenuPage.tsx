import { FileBarChart, Orbit, Play, RotateCcw } from 'lucide-react'
import { DEFAULT_MISSION_ID, paths } from '../../app/paths'
import { ButtonLink } from '../../components/common/ButtonLink'

const menuItems = [
  {
    to: paths.missions,
    label: 'New Mission',
    description: 'Choose a scenario and begin mission design',
    icon: Play,
    variant: 'primary' as const,
  },
  {
    to: paths.designer(DEFAULT_MISSION_ID),
    label: 'Continue Mission',
    description: 'Resume LUNAR ECHO in the Mission Designer',
    icon: RotateCcw,
    variant: 'secondary' as const,
  },
  {
    to: paths.report(DEFAULT_MISSION_ID),
    label: 'Mission Reports',
    description: 'Review the latest mission evaluation',
    icon: FileBarChart,
    variant: 'secondary' as const,
  },
]

export function MainMenuPage() {
  return (
    <div className="relative flex min-h-screen items-center overflow-hidden px-6">
      {/* Decorative orbit rings */}
      <div className="pointer-events-none absolute top-1/2 right-[-18rem] size-[46rem] -translate-y-1/2 rounded-full border border-cyan-500/10" aria-hidden />
      <div className="pointer-events-none absolute top-1/2 right-[-10rem] size-[30rem] -translate-y-1/2 rounded-full border border-cyan-500/15" aria-hidden />
      <div className="pointer-events-none absolute top-1/2 right-[2rem] size-40 -translate-y-1/2 rounded-full bg-gradient-to-br from-slate-300/80 via-slate-500/60 to-space-900 shadow-[0_0_80px_rgb(34_211_238/0.15)]" aria-hidden />

      <div className="relative mx-auto w-full max-w-7xl">
        <div className="max-w-xl">
          <p className="mb-6 flex items-center gap-2 font-mono text-xs tracking-[0.3em] text-cyan-400 uppercase">
            <Orbit className="size-4" aria-hidden />
            NASA Space Apps Challenge 2026
          </p>
          <h1 className="text-5xl font-semibold tracking-tight text-white sm:text-6xl">
            ASTRA
            <span className="mt-2 block text-2xl font-light tracking-[0.35em] text-slate-300 sm:text-3xl">
              BEYOND THE FUTURE
            </span>
          </h1>
          <p className="mt-6 text-lg text-slate-400">
            Design tomorrow. Explore beyond. Plan, build, launch, and operate hypothetical future
            space missions grounded in real NASA science.
          </p>

          <nav className="mt-10 flex flex-col gap-3" aria-label="Main menu">
            {menuItems.map((item) => (
              <ButtonLink
                key={item.label}
                to={item.to}
                variant={item.variant}
                className="justify-start px-5 py-4 text-left"
              >
                <item.icon className="size-5 shrink-0" aria-hidden />
                <span className="flex flex-col">
                  <span className="text-base">{item.label}</span>
                  <span className={`text-xs font-normal ${item.variant === 'primary' ? 'text-space-800' : 'text-slate-400'}`}>
                    {item.description}
                  </span>
                </span>
              </ButtonLink>
            ))}
          </nav>
          <p className="mt-10 font-mono text-xs text-slate-500">v0.1 · MVP prototype · mock data</p>
        </div>
      </div>
    </div>
  )
}
