import type { BadgeTone } from '../../components/common/StatusBadge'
import type { CommunicationStatus, InstrumentStatus, RunStatus, SimEventSeverity } from '../../types/simulation'

export const runStatusBadge: Record<RunStatus, { tone: BadgeTone; label: string }> = {
  ready: { tone: 'neutral', label: 'Ready' },
  running: { tone: 'info', label: 'Running' },
  paused: { tone: 'warning', label: 'Paused' },
  completed: { tone: 'success', label: 'Completed' },
  failed: { tone: 'critical', label: 'Mission Lost' },
}

export const communicationBadge: Record<CommunicationStatus, { tone: BadgeTone; label: string }> = {
  offline: { tone: 'critical', label: 'Offline' },
  standby: { tone: 'neutral', label: 'Standby' },
  nominal: { tone: 'success', label: 'Nominal' },
  blackout: { tone: 'warning', label: 'Blackout' },
}

export const instrumentBadge: Record<InstrumentStatus, { tone: BadgeTone; label: string }> = {
  offline: { tone: 'critical', label: 'Offline' },
  stowed: { tone: 'neutral', label: 'Stowed' },
  standby: { tone: 'neutral', label: 'Standby' },
  operating: { tone: 'success', label: 'Operating' },
  degraded: { tone: 'warning', label: 'Degraded' },
}

export const severityTone: Record<SimEventSeverity, BadgeTone> = {
  info: 'info',
  success: 'success',
  warning: 'warning',
  critical: 'critical',
}

export const severityLabel: Record<SimEventSeverity, string> = {
  info: 'Info',
  success: 'Success',
  warning: 'Warning',
  critical: 'Critical',
}
