/** Tone of an uptime bucket: full, degraded, bad, or no data. */
export function uptimeToneClass(uptime: number | null): string {
  if (uptime == null) return 'bg-muted'
  if (uptime >= 100) return 'bg-success'
  if (uptime >= 95) return 'bg-warning'
  return 'bg-destructive'
}
