export interface Incident {
  id: number
  monitor: { id: number; name: string }
  started_at: string
  resolved_at: string | null
  duration_sec: number | null
  is_open: boolean
  cause_code: string
  cause: string
}
