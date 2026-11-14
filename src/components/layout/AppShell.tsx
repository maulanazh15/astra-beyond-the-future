import { Orbit, Rocket } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router'
import { DEFAULT_MISSION_ID, paths } from '../../app/paths'

const navItems = [
  { to: paths.missions, label: 'Missions', end: true },
  { to: paths.report(DEFAULT_MISSION_ID), label: 'Reports', end: false },
]

/** Top-level chrome for every screen except the main menu. */
export function AppShell() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-space-700 bg-space-950/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-6">
          <Link to={paths.home} className="flex items-center gap-2.5" aria-label="ASTRA main menu">
            <span className="grid size-8 place-items-center rounded-md border border-cyan-500/40 bg-cyan-500/10">
              <Orbit className="size-4 text-cyan-300" aria-hidden />
            </span>
            <span className="font-mono text-sm font-semibold tracking-[0.3em] text-white">ASTRA</span>
          </Link>
          <nav className="flex items-center gap-1" aria-label="Primary">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 text-sm transition-colors ${
                    isActive ? 'bg-space-800 text-cyan-300' : 'text-slate-400 hover:text-white'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <Link
              to={paths.home}
              className="ml-2 inline-flex items-center gap-1.5 rounded-md border border-space-600 px-3 py-1.5 text-sm text-slate-300 hover:border-cyan-500/60 hover:text-white"
            >
              <Rocket className="size-3.5" aria-hidden />
              Main Menu
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10">
        <Outlet />
      </main>
      <footer className="border-t border-space-700 py-4 text-center text-xs text-slate-500">
        Hypothetical mission concepts informed by NASA research. Not official NASA predictions.
      </footer>
    </div>
  )
}
