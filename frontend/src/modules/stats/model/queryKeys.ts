import type { StatsPeriod } from './types'

export const statsKeys = {
  all: ['stats'] as const,
  monitor: (monitorId: number, period: StatsPeriod) => [...statsKeys.all, 'monitor', monitorId, period] as const,
}
