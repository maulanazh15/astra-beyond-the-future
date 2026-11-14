import { FastForward, Gauge, Pause, Play, RotateCcw } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { StatusBadge } from '../../components/common/StatusBadge'
import { phaseLabels } from '../../engine/simulation'
import { SIMULATION_SPEEDS } from '../mission-session/missionSessionContext'
import type { MissionSession, SimulationRun } from '../mission-session/missionSessionContext'
import { runStatusBadge } from './statusLabels'

type SimulationControlsProps = {
  run: SimulationRun
  session: MissionSession
}

export function SimulationControls({ run, session }: SimulationControlsProps) {
  const { state, setup } = run
  const finished = state.runStatus === 'completed' || state.runStatus === 'failed'
  const status = runStatusBadge[state.runStatus]

  return (
    <section className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-4 rounded-xl border border-space-700 bg-space-900/80 px-5 py-4">
      <div className="min-w-48 flex-1">
        <p className="text-[11px] tracking-[0.16em] text-slate-400 uppercase">Current phase</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-3 text-xl font-semibold text-white">
          {phaseLabels[state.phase]}
          <StatusBadge tone={status.tone} label={status.label} />
        </p>
      </div>
      <div>
        <p className="text-[11px] tracking-[0.16em] text-slate-400 uppercase">Elapsed</p>
        <p className="mt-0.5 font-mono text-xl text-white tabular-nums">
          Day {state.elapsedTime}
          <span className="text-sm text-slate-500"> / {setup.mission.durationDays}</span>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {state.runStatus === 'running' ? (
          <ControlButton icon={Pause} label="Pause" onClick={session.pause} primary />
        ) : (
          <ControlButton icon={Play} label="Resume" onClick={session.resume} primary disabled={finished} />
        )}
        <ControlButton icon={FastForward} label="Skip to end" onClick={session.skipToEnd} disabled={finished} />
        <ControlButton icon={RotateCcw} label="Restart" onClick={session.restart} />
      </div>

      <div className="flex items-center gap-2" role="group" aria-label="Simulation speed">
        <Gauge className="size-4 text-slate-500" aria-hidden />
        {SIMULATION_SPEEDS.map((speed) => (
          <button
            key={speed}
            type="button"
            onClick={() => session.setSpeed(speed)}
            aria-pressed={session.speed === speed}
            className={`rounded-md border px-2.5 py-1 font-mono text-xs transition-colors ${
              session.speed === speed
                ? 'border-cyan-400/70 bg-cyan-500/10 text-cyan-200'
                : 'border-space-700 text-slate-400 hover:border-space-600 hover:text-white'
            }`}
          >
            {speed}d/s
          </button>
        ))}
      </div>
    </section>
  )
}

type ControlButtonProps = {
  icon: LucideIcon
  label: string
  onClick: () => void
  primary?: boolean
  disabled?: boolean
}

function ControlButton({ icon: Icon, label, onClick, primary = false, disabled = false }: ControlButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        primary
          ? 'bg-cyan-500 font-semibold text-space-950 hover:bg-cyan-400'
          : 'border border-space-600 bg-space-800 text-slate-100 hover:border-cyan-500/60'
      }`}
    >
      <Icon className="size-4" aria-hidden />
      {label}
    </button>
  )
}
