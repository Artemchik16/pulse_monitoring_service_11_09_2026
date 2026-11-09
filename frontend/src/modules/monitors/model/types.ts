export const MONITOR_STATUSES = ['UP', 'DOWN', 'PENDING', 'PAUSED'] as const
export type MonitorStatus = (typeof MONITOR_STATUSES)[number]

export type HttpMethod = 'GET' | 'HEAD' | 'POST'

export interface Monitor {
  id: number
  name: string
  url: string
  method: HttpMethod
  expected_status_from: number
  expected_status_to: number
  interval_sec: number
  timeout_ms: number
  body_contains: string
  expect_json: boolean
  is_active: boolean
  is_public: boolean
  status: MonitorStatus
  consecutive_failures: number
  last_checked_at: string | null
  next_check_at: string | null
  created_at: string
  updated_at: string
}

export interface LastCheck {
  checked_at: string
  ok: boolean
  status_code: number | null
  response_time_ms: number | null
  error_code: string
}

export interface SeriesPoint {
  ts: string
  checks: number
  uptime_pct: number | null
  avg_response_ms: number | null
}

export interface MonitorSummary {
  monitor_id: number
  last_check: LastCheck | null
  uptime_24h: number | null
  checks_24h: number
  sparkline: SeriesPoint[]
}

/** A dashboard row: the monitor plus its (possibly not yet loaded) 24h summary. */
export interface DashboardMonitor extends Monitor {
  summary: MonitorSummary | undefined
}

export interface CheckResult {
  id: number
  checked_at: string
  ok: boolean
  status_code: number | null
  response_time_ms: number | null
  error_code: string
  /** Human-readable failure reason from the backend */
  error: string
}
