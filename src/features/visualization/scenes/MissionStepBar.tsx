import { MISSION_STEPS, missionStepIndex } from '../animations/missionTimeline'
import type { MissionStepId } from '../animations/missionTimeline'

type MissionStepBarProps = {
  /** Current step, or null before the lander reaches the Moon. */
  step: MissionStepId | null
  /** The mission failed in `step`: it is marked as the stopping point, nothing after it as done. */
  failed: boolean
  /** Concept playback only: jump to a step. */
  onJump?: (id: MissionStepId) => void
}

/** The nine-step surface sequence as a segmented track: done, current, and remaining steps. */
export function MissionStepBar({ step, failed, onJump }: MissionStepBarProps) {
  const current = step ? missionStepIndex(step) : -1
  const label = step ? `Step ${current + 1}/${MISSION_STEPS.length} · ${MISSION_STEPS[current].label}${failed ? ' · stopped' : ''}` : 'Awaiting landing'
  return (
    <div className="mb-1.5">
      <p className={`mb-1 text-[10px] tracking-[0.12em] uppercase ${failed ? 'text-rose-300' : 'text-cyan-300'}`}>{label}</p>
      <ol className="pointer-events-auto flex gap-0.5" aria-label="Mission sequence">
        {MISSION_STEPS.map((s, i) => {
          const tone =
            i === current ? (failed ? 'bg-rose-400' : 'bg-cyan-300')
            : i < current ? 'bg-cyan-500/55'
            : 'bg-slate-600/50'
          const state = i === current ? (failed ? 'stopped here' : 'current') : i < current ? 'done' : 'not reached'
          return (
            <li key={s.id} className="flex-1">
              {onJump ? (
                <button type="button" onClick={() => onJump(s.id)} title={s.label} aria-label={`${s.label} (${state})`} aria-current={i === current ? 'step' : undefined} className="block w-full py-1">
                  <span className={`block h-1 rounded-full ${tone}`} />
                </button>
              ) : (
                <span title={s.label} aria-label={`${s.label} (${state})`} aria-current={i === current ? 'step' : undefined} className="block py-1">
                  <span className={`block h-1 rounded-full ${tone}`} />
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
