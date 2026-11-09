import { z } from 'zod'

import { STATUS_ORDER } from './status'
import { type DashboardMonitor, type Monitor, MONITOR_STATUSES, type MonitorStatus, type MonitorSummary } from './types'

/** ?status=DOWN on the dashboard: shareable filtered view. */
export const dashboardSearchSchema = z.object({
  status: z.enum(MONITOR_STATUSES).optional().catch(undefined),
})

export type DashboardSearch = z.infer<typeof dashboardSearchSchema>

export function toDashboardMonitors(
  monitors: Monitor[],
  summaries: MonitorSummary[] | undefined,
): DashboardMonitor[] {
  const byId = new Map(summaries?.map((summary) => [summary.monitor_id, summary]))
  return monitors
    .map((monitor) => ({ ...monitor, summary: byId.get(monitor.id) }))
    .sort(
      (a, b) =>
        STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.name.localeCompare(b.name, 'ru'),
    )
}

export function countByStatus(monitors: Monitor[]): Record<MonitorStatus, number> {
  const counts: Record<MonitorStatus, number> = { UP: 0, DOWN: 0, PENDING: 0, PAUSED: 0 }
  for (const monitor of monitors) counts[monitor.status] += 1
  return counts
}
