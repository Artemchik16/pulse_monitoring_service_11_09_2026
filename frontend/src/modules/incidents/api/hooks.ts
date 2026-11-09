import { useInfiniteQuery } from '@tanstack/react-query'

import { LIVE_REFRESH_MS } from '@/shared/config/live'

import { incidentKeys } from '../model/queryKeys'
import { incidentsApi } from './incidentsApi'

/** Newest incidents first; "Показать ещё" loads the next page. */
export function useMonitorIncidents(monitorId: number) {
  return useInfiniteQuery({
    queryKey: incidentKeys.byMonitor(monitorId),
    queryFn: ({ pageParam }) => incidentsApi.byMonitor(monitorId, pageParam),
    initialPageParam: 1,
    refetchInterval: LIVE_REFRESH_MS,
    getNextPageParam: (lastPage, _pages, lastPageParam) => (lastPage.next ? lastPageParam + 1 : undefined),
  })
}
