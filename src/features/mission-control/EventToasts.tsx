import { X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { StatusBadge } from '../../components/common/StatusBadge'
import type { SimEventLogEntry } from '../../types/simulation'
import { severityLabel, severityTone } from './statusLabels'

const TOAST_MS = 6000
const MAX_TOASTS = 3

type Toast = SimEventLogEntry & { key: number }

/** Shows new event-log entries as dismissible notifications. */
export function EventToasts({ eventLog }: { eventLog: SimEventLogEntry[] }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const seen = useRef(eventLog.length)
  const nextKey = useRef(0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  useEffect(() => {
    if (eventLog.length < seen.current) {
      // Restarted: reset without notifying.
      seen.current = eventLog.length
      setToasts([])
      return
    }
    const fresh = eventLog.slice(seen.current)
    seen.current = eventLog.length
    if (fresh.length === 0) return
    const added = fresh.map((entry) => ({ ...entry, key: nextKey.current++ }))
    setToasts((prev) => [...prev, ...added].slice(-MAX_TOASTS))
    for (const toast of added) {
      timers.current.push(setTimeout(() => setToasts((prev) => prev.filter((t) => t.key !== toast.key)), TOAST_MS))
    }
  }, [eventLog])

  if (toasts.length === 0) return null
  return (
    <div className="fixed right-6 bottom-6 z-30 flex w-80 max-w-[calc(100vw-3rem)] flex-col gap-2" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.key} className="rounded-lg border border-space-600 bg-space-900/95 p-3 shadow-xl shadow-black/40 backdrop-blur">
          <div className="flex items-start justify-between gap-2">
            <StatusBadge tone={severityTone[toast.severity]} label={severityLabel[toast.severity]} />
            <button
              type="button"
              onClick={() => setToasts((prev) => prev.filter((t) => t.key !== toast.key))}
              aria-label="Dismiss notification"
              className="text-slate-500 hover:text-white"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
          <p className="mt-2 text-sm text-slate-100">{toast.title}</p>
          <p className="mt-0.5 text-xs text-slate-400">
            <span className="font-mono text-slate-500">D+{toast.day}</span> · {toast.detail}
          </p>
        </div>
      ))}
    </div>
  )
}
