export const STATS_PERIODS = ['24h', '7d', '30d'] as const
export type StatsPeriod = (typeof STATS_PERIODS)[number]

export const PERIOD_OPTIONS: readonly { value: StatsPeriod; label: string }[] = [
  { value: '24h', label: '24 часа' },
  { value: '7d', label: '7 дней' },
  { value: '30d', label: '30 дней' },
]

export interface StatsPoint {
  ts: string
  checks: number
  uptime_pct: number | null
  avg_response_ms: number | null
}

export interface MonitorStats {
  period: StatsPeriod
  since: string
  until: string
  bucket_sec: number
  checks_total: number
  checks_failed: number
  uptime_pct: number | null
  avg_response_ms: number | null
  p95_response_ms: number | null
  incidents_count: number
  series: StatsPoint[]
}
