import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query'

import { statsKeys } from '../model/queryKeys'
import type { StatsPeriod } from '../model/types'
import { statsApi } from './statsApi'

export const monitorStatsQueryOptions = (monitorId: number, period: StatsPeriod) =>
  queryOptions({
    queryKey: statsKeys.monitor(monitorId, period),
    queryFn: () => statsApi.monitor(monitorId, period),
  })

/** Switching the period keeps the previous numbers on screen until the new ones arrive. */
export function useMonitorStats(monitorId: number, period: StatsPeriod) {
  return useQuery({ ...monitorStatsQueryOptions(monitorId, period), placeholderData: keepPreviousData })
}
