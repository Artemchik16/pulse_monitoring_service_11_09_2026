import type { MonitorStatus } from '@/modules/monitors'

export interface StatusPage {
  id: number
  title: string
  slug: string
  monitor_ids: number[]
  created_at: string
  updated_at: string
}

export type OverallStatus = 'operational' | 'partial_outage' | 'major_outage' | 'unknown'

/** Exactly what the public endpoint exposes: no URL, ids or error details. */
export interface PublicMonitor {
  name: string
  status: MonitorStatus
  uptime_24h: number | null
  uptime_30d: number | null
  last_checked_at: string | null
}

export interface PublicStatusPage {
  title: string
  slug: string
  status: OverallStatus
  generated_at: string
  monitors: PublicMonitor[]
}
