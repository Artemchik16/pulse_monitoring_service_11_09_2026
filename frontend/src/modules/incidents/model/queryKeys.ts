export const incidentKeys = {
  all: ['incidents'] as const,
  byMonitor: (monitorId: number) => [...incidentKeys.all, 'monitor', monitorId] as const,
}
