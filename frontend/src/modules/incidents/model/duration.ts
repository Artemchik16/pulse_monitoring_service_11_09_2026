import type { Incident } from './types'

/** Fixed duration for a resolved incident, "so far" for an open one. */
export function incidentDurationSec(incident: Incident, now: Date = new Date()): number {
  if (incident.duration_sec != null) return incident.duration_sec
  return (now.getTime() - new Date(incident.started_at).getTime()) / 1000
}
